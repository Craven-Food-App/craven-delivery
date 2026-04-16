-- Merchant commission tiers: 15% cap, quarterly cycle option for founding merchants.
-- Adds restaurant flags, corrects tier bands, resolve_merchant_commission_bps + snapshot RPC.

-- ---------------------------------------------------------------------------
-- 1. Restaurant columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tier_reset_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (tier_reset_cycle IN ('monthly', 'quarterly')),
  ADD COLUMN IF NOT EXISTS is_founding_merchant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_merchant_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS founding_merchant_slot_number integer;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_founding_slot
  ON public.restaurants (founding_merchant_slot_number)
  WHERE founding_merchant_slot_number IS NOT NULL;

COMMENT ON COLUMN public.restaurants.tier_reset_cycle IS 'monthly: tier volume resets each calendar month; quarterly: volume accumulates per calendar quarter (calendar year quarters).';
COMMENT ON COLUMN public.restaurants.is_founding_merchant IS 'Early incentive program; often paired with quarterly tier_reset_cycle.';
COMMENT ON COLUMN public.restaurants.founding_merchant_slot_number IS 'Optional 1..N slot for first-N active merchants program.';

-- ---------------------------------------------------------------------------
-- 2. Normalize commission tiers (max rate 15%; four bands)
-- ---------------------------------------------------------------------------
-- Some environments may have an older commission_tiers shape without tier_level.
ALTER TABLE public.commission_tiers
  ADD COLUMN IF NOT EXISTS tier_level integer;

-- Older schemas may also miss presentation/audit columns used by this migration.
ALTER TABLE public.commission_tiers
  ADD COLUMN IF NOT EXISTS benefits jsonb,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill tier_level deterministically using min/max thresholds.
UPDATE public.commission_tiers
SET tier_level = CASE
  WHEN min_monthly_volume = 0 AND COALESCE(max_monthly_volume, -1) = 5000 THEN 1
  WHEN min_monthly_volume >= 5000 AND COALESCE(max_monthly_volume, -1) = 15000 THEN 2
  WHEN min_monthly_volume >= 15000 AND COALESCE(max_monthly_volume, -1) = 40000 THEN 3
  ELSE 4
END
WHERE tier_level IS NULL;

-- Optional table from enhanced_commission_system migration; skip if never applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_performance_metrics'
  ) THEN
    UPDATE public.restaurant_performance_metrics
    SET current_tier_id = NULL
    WHERE current_tier_id IN (
      SELECT id FROM public.commission_tiers WHERE tier_level > 4
    );
  END IF;
END $$;

DELETE FROM public.commission_tiers WHERE tier_level > 4;

-- Deterministic rebuild: remove legacy/partial rows and insert canonical 4 tiers.
-- This avoids duplicate tier_name collisions in environments with messy legacy data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_performance_metrics'
  ) THEN
    UPDATE public.restaurant_performance_metrics
    SET current_tier_id = NULL;
  END IF;
END $$;

DELETE FROM public.commission_tiers;

INSERT INTO public.commission_tiers (
  tier_name, tier_level, min_monthly_volume, max_monthly_volume, commission_percent, benefits, icon, color, is_active, updated_at
)
VALUES
  ('Entry', 1, 0, 5000, 15.0, '{"support":"Standard support"}'::jsonb, '🌱', '#10B981', true, now()),
  ('Growth', 2, 5000.01, 15000, 12.0, '{"support":"Priority support"}'::jsonb, '📈', '#3B82F6', true, now()),
  ('Scale', 3, 15000.01, 40000, 10.0, '{"support":"Dedicated support"}'::jsonb, '🚀', '#8B5CF6', true, now()),
  ('Partner', 4, 40000.01, NULL, 8.0, '{"support":"Executive support"}'::jsonb, '🤝', '#F59E0B', true, now());

COMMENT ON TABLE public.commission_tiers IS 'Volume tiers: min_monthly_volume/max_monthly_volume are in USD; same bands apply to monthly cycle (MTD) or quarterly cycle (QTD) depending on restaurants.tier_reset_cycle.';

-- ---------------------------------------------------------------------------
-- 3. Resolve merchant commission (basis points) for live pricing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_merchant_commission_bps(p_restaurant_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override_pct numeric;
  v_cycle text;
  v_start timestamptz;
  v_end timestamptz;
  v_volume_cents bigint;
  v_dollars numeric;
  v_pct numeric;
  v_fallback integer;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = p_restaurant_id
        AND (
          r.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.restaurant_users ru
            WHERE ru.restaurant_id = r.id AND ru.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'ceo', 'super_admin')
          )
        )
    ) INTO v_allowed;
    IF NOT COALESCE(v_allowed, false) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;

  SELECT o.commission_percent INTO v_override_pct
  FROM public.restaurant_commission_overrides o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.is_active = true
    AND o.start_date <= now()
    AND (o.end_date IS NULL OR o.end_date >= now())
  ORDER BY o.start_date DESC
  LIMIT 1;

  IF v_override_pct IS NOT NULL THEN
    RETURN ROUND(v_override_pct * 100)::integer;
  END IF;

  SELECT COALESCE(r.tier_reset_cycle, 'monthly') INTO v_cycle
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id;

  IF NOT FOUND THEN
    SELECT d.merchant_commission_bps INTO v_fallback
    FROM public.driver_payout_settings d
    WHERE d.is_active = true
    LIMIT 1;
    RETURN COALESCE(v_fallback, 1500);
  END IF;

  IF v_cycle IS NULL THEN
    v_cycle := 'monthly';
  END IF;

  IF v_cycle = 'quarterly' THEN
    v_start := date_trunc('quarter', now());
    v_end := v_start + interval '3 months';
  ELSE
    v_start := date_trunc('month', now());
    v_end := v_start + interval '1 month';
  END IF;

  SELECT COALESCE(SUM(COALESCE(o.food_subtotal_cents, o.subtotal_cents, 0)), 0)::bigint
  INTO v_volume_cents
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= v_start
    AND o.created_at < v_end
    AND o.order_status = 'delivered';

  v_dollars := (v_volume_cents::numeric / 100.0);

  SELECT t.commission_percent INTO v_pct
  FROM public.commission_tiers t
  WHERE t.is_active = true
    AND v_dollars >= t.min_monthly_volume
    AND (t.max_monthly_volume IS NULL OR v_dollars <= t.max_monthly_volume)
  ORDER BY t.tier_level DESC
  LIMIT 1;

  IF v_pct IS NOT NULL THEN
    RETURN ROUND(v_pct * 100)::integer;
  END IF;

  SELECT d.merchant_commission_bps INTO v_fallback
  FROM public.driver_payout_settings d
  WHERE d.is_active = true
  LIMIT 1;

  RETURN COALESCE(v_fallback, 1500);
END;
$$;

COMMENT ON FUNCTION public.resolve_merchant_commission_bps(uuid) IS
  'Returns merchant commission in basis points (1500 = 15%). Honors active commission override; else tier from MTD or QTD delivered order volume vs commission_tiers.';

REVOKE ALL ON FUNCTION public.resolve_merchant_commission_bps(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_merchant_commission_bps(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_merchant_commission_bps(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Merchant dashboard + admin: tier snapshot JSON
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_merchant_commission_tier_snapshot(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
  v_cycle text;
  v_start timestamptz;
  v_end timestamptz;
  v_volume_cents bigint;
  v_dollars numeric;
  v_tier_id uuid;
  v_tier_name text;
  v_tier_level int;
  v_tier_pct numeric;
  v_tier_min numeric;
  v_tier_max numeric;
  v_next_name text;
  v_next_pct numeric;
  v_next_min numeric;
  v_override_pct numeric;
  v_bps integer;
  v_is_founding boolean;
  v_founding_at timestamptz;
  v_founding_slot int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND (
        r.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.restaurant_users ru
          WHERE ru.restaurant_id = r.id AND ru.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'ceo', 'super_admin')
        )
      )
  ) INTO v_allowed;

  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'not authorized for restaurant %', p_restaurant_id;
  END IF;

  SELECT
    r.tier_reset_cycle,
    r.is_founding_merchant,
    r.founding_merchant_approved_at,
    r.founding_merchant_slot_number
  INTO v_cycle, v_is_founding, v_founding_at, v_founding_slot
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'restaurant not found';
  END IF;

  SELECT o.commission_percent INTO v_override_pct
  FROM public.restaurant_commission_overrides o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.is_active = true
    AND o.start_date <= now()
    AND (o.end_date IS NULL OR o.end_date >= now())
  ORDER BY o.start_date DESC
  LIMIT 1;

  v_cycle := COALESCE(v_cycle, 'monthly');

  IF v_cycle = 'quarterly' THEN
    v_start := date_trunc('quarter', now());
    v_end := v_start + interval '3 months';
  ELSE
    v_start := date_trunc('month', now());
    v_end := v_start + interval '1 month';
  END IF;

  SELECT COALESCE(SUM(COALESCE(o.food_subtotal_cents, o.subtotal_cents, 0)), 0)::bigint
  INTO v_volume_cents
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= v_start
    AND o.created_at < v_end
    AND o.order_status = 'delivered';

  v_dollars := (v_volume_cents::numeric / 100.0);

  IF v_override_pct IS NOT NULL THEN
    v_bps := ROUND(v_override_pct * 100)::integer;
    RETURN jsonb_build_object(
      'tier_reset_cycle', v_cycle,
      'is_founding_merchant', COALESCE(v_is_founding, false),
      'founding_merchant_approved_at', v_founding_at,
      'founding_merchant_slot_number', v_founding_slot,
      'period_start', v_start,
      'period_end', v_end,
      'volume_cents', v_volume_cents,
      'volume_dollars', round(v_dollars, 2),
      'commission_bps', v_bps,
      'commission_percent', v_override_pct,
      'tier_name', 'Override',
      'tier_level', null,
      'is_override', true,
      'next_tier', null
    );
  END IF;

  SELECT t.id, t.tier_name, t.tier_level, t.commission_percent,
         t.min_monthly_volume, t.max_monthly_volume
  INTO v_tier_id, v_tier_name, v_tier_level, v_tier_pct, v_tier_min, v_tier_max
  FROM public.commission_tiers t
  WHERE t.is_active = true
    AND v_dollars >= t.min_monthly_volume
    AND (t.max_monthly_volume IS NULL OR v_dollars <= t.max_monthly_volume)
  ORDER BY t.tier_level DESC
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    SELECT t.id, t.tier_name, t.tier_level, t.commission_percent,
           t.min_monthly_volume, t.max_monthly_volume
    INTO v_tier_id, v_tier_name, v_tier_level, v_tier_pct, v_tier_min, v_tier_max
    FROM public.commission_tiers t
    WHERE t.is_active = true
    ORDER BY t.tier_level ASC
    LIMIT 1;
  END IF;

  v_bps := ROUND(v_tier_pct * 100)::integer;

  SELECT t.tier_name, t.commission_percent, t.min_monthly_volume
  INTO v_next_name, v_next_pct, v_next_min
  FROM public.commission_tiers t
  WHERE t.is_active = true
    AND t.tier_level = v_tier_level + 1
  LIMIT 1;

  RETURN jsonb_build_object(
    'tier_reset_cycle', v_cycle,
    'is_founding_merchant', COALESCE(v_is_founding, false),
    'founding_merchant_approved_at', v_founding_at,
    'founding_merchant_slot_number', v_founding_slot,
    'period_start', v_start,
    'period_end', v_end,
    'volume_cents', v_volume_cents,
    'volume_dollars', round(v_dollars, 2),
    'commission_bps', v_bps,
    'commission_percent', v_tier_pct,
    'tier_name', v_tier_name,
    'tier_level', v_tier_level,
    'is_override', false,
    'next_tier', CASE WHEN v_next_name IS NULL THEN NULL ELSE jsonb_build_object(
      'tier_name', v_next_name,
      'commission_percent', v_next_pct,
      'threshold_dollars', v_next_min
    ) END
  );
END;
$$;

COMMENT ON FUNCTION public.get_merchant_commission_tier_snapshot(uuid) IS
  'Merchant-facing tier progress: cycle, period bounds, QTD/MTD volume, active tier, next tier threshold.';

REVOKE ALL ON FUNCTION public.get_merchant_commission_tier_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_merchant_commission_tier_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_merchant_commission_tier_snapshot(uuid) TO service_role;
