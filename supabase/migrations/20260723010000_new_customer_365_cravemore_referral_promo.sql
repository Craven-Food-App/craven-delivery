-- New-customer 365-day CraveMore referral promotion
-- Layers onto existing referral_codes / referrals / referral_bonuses.
-- Does NOT replace referral codes, links, attribution, or standard rewards.

-- ---------------------------------------------------------------------------
-- 1) Campaign configuration (admin-editable; no hardcoding in app clients)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_campaign_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  customer_facing_title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  new_customer_only BOOLEAN NOT NULL DEFAULT true,
  account_created_after TIMESTAMPTZ NOT NULL,
  account_created_before TIMESTAMPTZ NOT NULL,
  campaign_starts_at TIMESTAMPTZ NOT NULL,
  campaign_ends_at TIMESTAMPTZ NOT NULL,
  referral_completion_deadline TIMESTAMPTZ NOT NULL,
  required_qualifying_referrals INTEGER NOT NULL DEFAULT 5
    CHECK (required_qualifying_referrals > 0),
  reward_duration_days INTEGER NOT NULL DEFAULT 365
    CHECK (reward_duration_days > 0),
  max_rewards_per_customer INTEGER NOT NULL DEFAULT 1
    CHECK (max_rewards_per_customer > 0),
  eligible_service_areas JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  qualification_rules JSONB NOT NULL DEFAULT '{"referral_status":["completed","paid"],"referral_type":"customer"}'::jsonb,
  stacking_policy TEXT NOT NULL DEFAULT 'queue_after_active'
    CHECK (stacking_policy IN ('queue_after_active', 'extend_active', 'reject_if_active')),
  terms_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_campaign_promotions_active
  ON public.referral_campaign_promotions (is_active, promotion_key);

-- ---------------------------------------------------------------------------
-- 2) Participation (one row per customer per promotion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_promotion_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.referral_campaign_promotions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  eligibility_status TEXT NOT NULL DEFAULT 'eligible'
    CHECK (eligibility_status IN (
      'eligible', 'in_progress', 'completed', 'reward_pending',
      'reward_active', 'expired', 'disqualified', 'ineligible'
    )),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualification_deadline TIMESTAMPTZ NOT NULL,
  qualifying_referral_count INTEGER NOT NULL DEFAULT 0 CHECK (qualifying_referral_count >= 0),
  reward_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reward_status IN ('none', 'pending', 'queued', 'issued', 'active', 'expired', 'failed')),
  reward_issued_at TIMESTAMPTZ,
  reward_starts_at TIMESTAMPTZ,
  reward_ends_at TIMESTAMPTZ,
  cravemore_entitlement_id UUID,
  disqualification_reason TEXT,
  last_notified_progress_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promotion_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_promo_part_customer
  ON public.referral_promotion_participations (customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_promo_part_status
  ON public.referral_promotion_participations (eligibility_status, reward_status);

-- ---------------------------------------------------------------------------
-- 3) CraveMore promotional entitlements (does not overwrite Stripe memberships)
-- Checkout / fee calc must honor these alongside user_memberships.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cravemore_promo_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES public.referral_campaign_promotions(id) ON DELETE SET NULL,
  participation_id UUID REFERENCES public.referral_promotion_participations(id) ON DELETE SET NULL,
  membership_source TEXT NOT NULL DEFAULT 'new_customer_referral_365_promo',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('queued', 'active', 'expired', 'revoked')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cravemore_promo_ent_participation
  ON public.cravemore_promo_entitlements (participation_id)
  WHERE participation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cravemore_promo_ent_user_active
  ON public.cravemore_promo_entitlements (user_id, status, starts_at, ends_at);

-- Optional source metadata on memberships (does not change UNIQUE user_id)
ALTER TABLE public.user_memberships
  ADD COLUMN IF NOT EXISTS membership_source TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- ---------------------------------------------------------------------------
-- 4) Seed the new-customer 365 promotion (config-driven; edit via admin/SQL)
-- ---------------------------------------------------------------------------
INSERT INTO public.referral_campaign_promotions (
  promotion_key,
  display_name,
  customer_facing_title,
  is_active,
  new_customer_only,
  account_created_after,
  account_created_before,
  campaign_starts_at,
  campaign_ends_at,
  referral_completion_deadline,
  required_qualifying_referrals,
  reward_duration_days,
  max_rewards_per_customer,
  eligible_service_areas,
  qualification_rules,
  stacking_policy,
  terms_version
) VALUES (
  'new_customer_365_cravemore_referral_promotion',
  'New Customer 365 CraveMore Referral Promotion',
  'Refer Friends. Earn 365 Days of Free Delivery.',
  true,
  true,
  TIMESTAMPTZ '2026-07-01 00:00:00+00',
  TIMESTAMPTZ '2027-07-01 00:00:00+00',
  TIMESTAMPTZ '2026-07-01 00:00:00+00',
  TIMESTAMPTZ '2027-07-01 00:00:00+00',
  TIMESTAMPTZ '2027-12-31 23:59:59+00',
  5,
  365,
  1,
  '["*"]'::jsonb,
  '{"referral_status":["completed","paid"],"referral_type":"customer","require_requirements_met":true}'::jsonb,
  'queue_after_active',
  'v1'
)
ON CONFLICT (promotion_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  customer_facing_title = EXCLUDED.customer_facing_title,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 5) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_active_cravemore_benefit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_memberships um
      WHERE um.user_id = p_user_id
        AND um.status = 'active'
        AND (um.renews_at IS NULL OR um.renews_at > NOW())
    )
    OR EXISTS (
      SELECT 1
      FROM public.cravemore_promo_entitlements e
      WHERE e.user_id = p_user_id
        AND e.status = 'active'
        AND e.starts_at <= NOW()
        AND e.ends_at > NOW()
    );
$$;

CREATE OR REPLACE FUNCTION public.count_promo_qualifying_referrals(
  p_customer_id UUID,
  p_promotion_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.referral_campaign_promotions%ROWTYPE;
  v_count INTEGER := 0;
  v_statuses TEXT[];
  v_type TEXT;
  v_require_met BOOLEAN;
BEGIN
  SELECT * INTO v_promo
  FROM public.referral_campaign_promotions
  WHERE id = p_promotion_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_statuses := ARRAY(
    SELECT jsonb_array_elements_text(COALESCE(v_promo.qualification_rules->'referral_status', '["completed","paid"]'::jsonb))
  );
  v_type := COALESCE(v_promo.qualification_rules->>'referral_type', 'customer');
  v_require_met := COALESCE((v_promo.qualification_rules->>'require_requirements_met')::boolean, true);

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.referrals r
  WHERE r.referrer_id = p_customer_id
    AND r.referral_type = v_type
    AND r.status = ANY (v_statuses)
    AND (NOT v_require_met OR COALESCE(r.requirements_met, false) = true OR r.status IN ('completed', 'paid'))
    AND r.created_at <= v_promo.referral_completion_deadline
    AND r.created_at >= v_promo.campaign_starts_at
    AND r.referrer_id <> r.referred_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Issue reward exactly once (idempotent) — defined before evaluate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_new_customer_365_promo_reward(
  p_customer_id UUID,
  p_promotion_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.referral_campaign_promotions%ROWTYPE;
  v_part public.referral_promotion_participations%ROWTYPE;
  v_count INTEGER;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_ent_id UUID;
  v_active_renews TIMESTAMPTZ;
  v_has_active BOOLEAN;
BEGIN
  SELECT * INTO v_promo FROM public.referral_campaign_promotions WHERE id = p_promotion_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'promotion_not_found');
  END IF;

  SELECT * INTO v_part
  FROM public.referral_promotion_participations
  WHERE promotion_id = p_promotion_id AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_enrolled');
  END IF;

  -- Already issued?
  IF EXISTS (
    SELECT 1 FROM public.cravemore_promo_entitlements e WHERE e.participation_id = v_part.id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_issued', true, 'participation_id', v_part.id);
  END IF;

  IF v_part.eligibility_status = 'disqualified' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'disqualified');
  END IF;

  v_count := public.count_promo_qualifying_referrals(p_customer_id, p_promotion_id);
  IF v_count < v_promo.required_qualifying_referrals THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_referrals', 'count', v_count);
  END IF;

  IF NOW() > v_part.qualification_deadline THEN
    UPDATE public.referral_promotion_participations
    SET eligibility_status = 'expired', qualifying_referral_count = v_count, updated_at = NOW()
    WHERE id = v_part.id;
    RETURN jsonb_build_object('ok', false, 'error', 'deadline_passed');
  END IF;

  -- Stacking: queue after active paid/trial membership if present (never overwrite Stripe row)
  SELECT
    um.status = 'active' AND (um.renews_at IS NULL OR um.renews_at > NOW()),
    um.renews_at
  INTO v_has_active, v_active_renews
  FROM public.user_memberships um
  WHERE um.user_id = p_customer_id;

  v_has_active := COALESCE(v_has_active, false);

  IF v_has_active AND v_promo.stacking_policy = 'queue_after_active' THEN
    v_start := COALESCE(v_active_renews, NOW());
    IF v_start < NOW() THEN
      v_start := NOW();
    END IF;
  ELSE
    v_start := NOW();
  END IF;

  v_end := v_start + make_interval(days => v_promo.reward_duration_days);

  INSERT INTO public.cravemore_promo_entitlements (
    user_id,
    promotion_id,
    participation_id,
    membership_source,
    status,
    starts_at,
    ends_at,
    auto_renew,
    issued_at
  ) VALUES (
    p_customer_id,
    p_promotion_id,
    v_part.id,
    'new_customer_referral_365_promo',
    CASE WHEN v_start > NOW() THEN 'queued' ELSE 'active' END,
    v_start,
    v_end,
    false,
    NOW()
  )
  RETURNING id INTO v_ent_id;

  UPDATE public.referral_promotion_participations
  SET
    qualifying_referral_count = v_count,
    reward_status = CASE WHEN v_start > NOW() THEN 'queued' ELSE 'issued' END,
    reward_issued_at = NOW(),
    reward_starts_at = v_start,
    reward_ends_at = v_end,
    cravemore_entitlement_id = v_ent_id,
    eligibility_status = CASE WHEN v_start > NOW() THEN 'reward_pending' ELSE 'reward_active' END,
    updated_at = NOW()
  WHERE id = v_part.id;

  RETURN jsonb_build_object(
    'ok', true,
    'entitlement_id', v_ent_id,
    'starts_at', v_start,
    'ends_at', v_end,
    'queued', v_start > NOW()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Evaluate / enroll eligible customer (idempotent)
-- Internal variant (triggers / service) — no auth.uid() gate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_new_customer_365_promo_internal(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.referral_campaign_promotions%ROWTYPE;
  v_part public.referral_promotion_participations%ROWTYPE;
  v_created_at TIMESTAMPTZ;
  v_count INTEGER;
  v_required INTEGER;
  v_remaining INTEGER;
  v_status TEXT;
  v_display_state TEXT;
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_promo
  FROM public.referral_campaign_promotions
  WHERE promotion_key = 'new_customer_365_cravemore_referral_promotion'
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'eligible', false,
      'display_state', 'ineligible',
      'reason', 'promotion_inactive'
    );
  END IF;

  -- Account creation time from auth.users
  SELECT u.created_at INTO v_created_at
  FROM auth.users u
  WHERE u.id = p_customer_id;

  IF v_created_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- Existing participation?
  SELECT * INTO v_part
  FROM public.referral_promotion_participations
  WHERE promotion_id = v_promo.id AND customer_id = p_customer_id;

  IF FOUND AND v_part.eligibility_status = 'disqualified' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'eligible', false,
      'display_state', 'disqualified',
      'promotion_key', v_promo.promotion_key,
      'title', v_promo.customer_facing_title,
      'reason', COALESCE(v_part.disqualification_reason, 'disqualified')
    );
  END IF;

  -- New-customer eligibility window
  IF v_promo.new_customer_only
     AND (v_created_at < v_promo.account_created_after OR v_created_at > v_promo.account_created_before)
  THEN
    RETURN jsonb_build_object(
      'ok', true,
      'eligible', false,
      'display_state', 'ineligible',
      'reason', 'outside_new_customer_window',
      'promotion_key', v_promo.promotion_key
    );
  END IF;

  IF NOW() < v_promo.campaign_starts_at OR NOW() > v_promo.campaign_ends_at THEN
    -- Still show if already enrolled / rewarded
    IF NOT FOUND OR v_part.reward_status NOT IN ('issued', 'active', 'queued') THEN
      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'eligible', false,
          'display_state', 'ineligible',
          'reason', 'campaign_not_active'
        );
      END IF;
    END IF;
  END IF;

  -- Enroll once
  IF NOT FOUND THEN
    INSERT INTO public.referral_promotion_participations (
      promotion_id,
      customer_id,
      eligibility_status,
      enrolled_at,
      qualification_deadline,
      qualifying_referral_count,
      reward_status
    ) VALUES (
      v_promo.id,
      p_customer_id,
      'eligible',
      NOW(),
      v_promo.referral_completion_deadline,
      0,
      'none'
    )
    ON CONFLICT (promotion_id, customer_id) DO NOTHING
    RETURNING * INTO v_part;

    IF v_part.id IS NULL THEN
      SELECT * INTO v_part
      FROM public.referral_promotion_participations
      WHERE promotion_id = v_promo.id AND customer_id = p_customer_id;
    END IF;
  END IF;

  -- Count from EXISTING referrals table (never invent a parallel ledger)
  v_count := public.count_promo_qualifying_referrals(p_customer_id, v_promo.id);
  v_required := v_promo.required_qualifying_referrals;
  v_remaining := GREATEST(v_required - v_count, 0);

  -- Already rewarded?
  IF v_part.reward_status IN ('issued', 'active', 'queued')
     OR EXISTS (
       SELECT 1 FROM public.cravemore_promo_entitlements e
       WHERE e.participation_id = v_part.id
     )
  THEN
    UPDATE public.referral_promotion_participations
    SET qualifying_referral_count = v_count,
        updated_at = NOW(),
        eligibility_status = CASE
          WHEN EXISTS (
            SELECT 1 FROM public.cravemore_promo_entitlements e
            WHERE e.participation_id = v_part.id
              AND e.status = 'active'
              AND e.starts_at <= NOW()
              AND e.ends_at > NOW()
          ) THEN 'reward_active'
          WHEN EXISTS (
            SELECT 1 FROM public.cravemore_promo_entitlements e
            WHERE e.participation_id = v_part.id AND e.status = 'queued'
          ) THEN 'reward_pending'
          WHEN EXISTS (
            SELECT 1 FROM public.cravemore_promo_entitlements e
            WHERE e.participation_id = v_part.id
              AND e.status = 'active'
              AND e.ends_at <= NOW()
          ) THEN 'expired'
          ELSE eligibility_status
        END
    WHERE id = v_part.id
    RETURNING * INTO v_part;

    v_display_state := v_part.eligibility_status;
  ELSIF v_count >= v_required AND NOW() <= v_part.qualification_deadline THEN
    -- Attempt issue (idempotent)
    PERFORM public.issue_new_customer_365_promo_reward(p_customer_id, v_promo.id);
    SELECT * INTO v_part
    FROM public.referral_promotion_participations
    WHERE id = v_part.id;
    v_display_state := v_part.eligibility_status;
  ELSIF NOW() > v_part.qualification_deadline AND v_count < v_required THEN
    UPDATE public.referral_promotion_participations
    SET qualifying_referral_count = v_count,
        eligibility_status = 'expired',
        updated_at = NOW()
    WHERE id = v_part.id
      AND eligibility_status NOT IN ('reward_active', 'completed', 'reward_pending')
    RETURNING * INTO v_part;
    v_display_state := 'expired';
  ELSE
    v_status := CASE WHEN v_count > 0 THEN 'in_progress' ELSE 'eligible' END;
    UPDATE public.referral_promotion_participations
    SET qualifying_referral_count = v_count,
        eligibility_status = v_status,
        updated_at = NOW()
    WHERE id = v_part.id
    RETURNING * INTO v_part;
    v_display_state := v_status;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'eligible', true,
    'display_state', v_display_state,
    'promotion_key', v_promo.promotion_key,
    'promotion_id', v_promo.id,
    'title', v_promo.customer_facing_title,
    'required_count', v_required,
    'qualifying_count', v_count,
    'remaining_count', v_remaining,
    'qualification_deadline', v_part.qualification_deadline,
    'reward_status', v_part.reward_status,
    'reward_starts_at', v_part.reward_starts_at,
    'reward_ends_at', v_part.reward_ends_at,
    'terms_version', v_promo.terms_version,
    'participation_id', v_part.id
  );
END;
$$;

-- Public evaluate: auth gate then internal
CREATE OR REPLACE FUNCTION public.evaluate_new_customer_365_promo(p_customer_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_customer_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles up
       WHERE up.user_id = auth.uid() AND up.role = 'admin'
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  RETURN public.evaluate_new_customer_365_promo_internal(p_customer_id);
END;
$$;

-- Activate queued entitlements when their start time arrives
CREATE OR REPLACE FUNCTION public.activate_due_cravemore_promo_entitlements()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.cravemore_promo_entitlements
    SET status = 'active', updated_at = NOW()
    WHERE status = 'queued' AND starts_at <= NOW() AND ends_at > NOW()
    RETURNING id, participation_id
  ),
  parts AS (
    UPDATE public.referral_promotion_participations p
    SET eligibility_status = 'reward_active',
        reward_status = 'active',
        updated_at = NOW()
    WHERE p.id IN (SELECT participation_id FROM updated WHERE participation_id IS NOT NULL)
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_n FROM updated;

  UPDATE public.cravemore_promo_entitlements
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('active', 'queued') AND ends_at <= NOW();

  UPDATE public.referral_promotion_participations p
  SET eligibility_status = 'expired',
      reward_status = 'expired',
      updated_at = NOW()
  WHERE p.cravemore_entitlement_id IN (
    SELECT id FROM public.cravemore_promo_entitlements WHERE status = 'expired'
  )
  AND p.eligibility_status = 'reward_active';

  RETURN COALESCE(v_n, 0);
END;
$$;

-- Recalculate on referral qualification changes (uses internal — no auth.uid gate)
CREATE OR REPLACE FUNCTION public.trg_referral_promo_on_referral_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.requirements_met IS DISTINCT FROM OLD.requirements_met
     )
  THEN
    PERFORM public.evaluate_new_customer_365_promo_internal(NEW.referrer_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.evaluate_new_customer_365_promo_internal(NEW.referrer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_promo_progress ON public.referrals;
CREATE TRIGGER trg_referral_promo_progress
  AFTER INSERT OR UPDATE OF status, requirements_met ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_referral_promo_on_referral_change();

-- ---------------------------------------------------------------------------
-- 8) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.referral_campaign_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_promotion_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cravemore_promo_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active referral campaign promotions" ON public.referral_campaign_promotions;
CREATE POLICY "Anyone can read active referral campaign promotions"
  ON public.referral_campaign_promotions FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins manage referral campaign promotions" ON public.referral_campaign_promotions;
CREATE POLICY "Admins manage referral campaign promotions"
  ON public.referral_campaign_promotions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users read own promo participations" ON public.referral_promotion_participations;
CREATE POLICY "Users read own promo participations"
  ON public.referral_promotion_participations FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users read own promo entitlements" ON public.cravemore_promo_entitlements;
CREATE POLICY "Users read own promo entitlements"
  ON public.cravemore_promo_entitlements FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

GRANT EXECUTE ON FUNCTION public.evaluate_new_customer_365_promo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_cravemore_benefit(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.count_promo_qualifying_referrals(UUID, UUID) TO authenticated;
-- Internal / issue: not callable from clients
REVOKE ALL ON FUNCTION public.evaluate_new_customer_365_promo_internal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_new_customer_365_promo_reward(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_new_customer_365_promo_reward(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_due_cravemore_promo_entitlements() TO service_role;

COMMENT ON TABLE public.referral_campaign_promotions IS
  'Config for layered referral promotions (e.g. new-customer 365 CraveMore). Uses existing referrals rows for progress.';
COMMENT ON TABLE public.referral_promotion_participations IS
  'Per-customer participation in a referral campaign promotion. Counts derive from public.referrals.';
COMMENT ON TABLE public.cravemore_promo_entitlements IS
  'Promotional CraveMore free-delivery windows that stack after paid memberships without replacing Stripe rows.';

-- Optional: activate queued promo entitlements hourly (skipped if pg_cron unavailable)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'activate-cravemore-promo-entitlements') THEN
      PERFORM cron.unschedule('activate-cravemore-promo-entitlements');
    END IF;
    PERFORM cron.schedule(
      'activate-cravemore-promo-entitlements',
      '15 * * * *',
      $cron$SELECT public.activate_due_cravemore_promo_entitlements();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule for activate_due_cravemore_promo_entitlements skipped: %', SQLERRM;
END $$;
