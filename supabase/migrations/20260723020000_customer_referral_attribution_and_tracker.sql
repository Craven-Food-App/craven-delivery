-- Customer referral attribution + delivery qualification wiring
-- Supports Invite Friends tracker: signup → order → completed → credit

-- Idempotent attribute: create pending referral when new customer signs up with a code
CREATE OR REPLACE FUNCTION public.attribute_customer_referral(
  p_referral_code TEXT,
  p_referred_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_referrer UUID;
  v_settings public.referral_settings%ROWTYPE;
  v_referral_id UUID;
  v_existing UUID;
BEGIN
  IF p_referred_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_referred_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles up
       WHERE up.user_id = auth.uid() AND up.role = 'admin'
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_code := upper(trim(COALESCE(p_referral_code, '')));
  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  SELECT rc.user_id INTO v_referrer
  FROM public.referral_codes rc
  WHERE upper(rc.code) = v_code
    AND rc.user_type = 'customer'
    AND rc.is_active = true
  LIMIT 1;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF v_referrer = p_referred_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  SELECT id INTO v_existing
  FROM public.referrals
  WHERE referrer_id = v_referrer
    AND referred_id = p_referred_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_attributed', true, 'referral_id', v_existing);
  END IF;

  -- Also block if this user was already referred by anyone (one referrer per new customer)
  IF EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referred_id = p_referred_id AND r.referral_type = 'customer'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  SELECT * INTO v_settings
  FROM public.referral_settings
  WHERE referral_type = 'customer' AND is_active = true
  LIMIT 1;

  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    referral_type,
    status,
    referrer_bonus_amount,
    referred_bonus_amount,
    requirements_met
  ) VALUES (
    v_referrer,
    p_referred_id,
    v_code,
    'customer',
    'pending',
    COALESCE(v_settings.referrer_bonus_amount, 1000),
    COALESCE(v_settings.referred_bonus_amount, 1000),
    false
  )
  RETURNING id INTO v_referral_id;

  RETURN jsonb_build_object(
    'ok', true,
    'referral_id', v_referral_id,
    'referrer_id', v_referrer
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attribute_customer_referral(TEXT, UUID) TO authenticated;

-- When a customer order is delivered, advance referral requirements
CREATE OR REPLACE FUNCTION public.trg_customer_referral_on_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_status = 'delivered'
     AND (TG_OP = 'INSERT' OR OLD.order_status IS DISTINCT FROM NEW.order_status)
     AND NEW.customer_id IS NOT NULL
  THEN
    PERFORM public.check_referral_requirements(NEW.customer_id, 'customer');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_referral_on_order_delivered ON public.orders;
CREATE TRIGGER trg_customer_referral_on_order_delivered
  AFTER INSERT OR UPDATE OF order_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_customer_referral_on_order_delivered();

-- Approve referrer bonuses when referral completes (so credits can show as earned)
CREATE OR REPLACE FUNCTION public.trg_approve_referral_bonuses_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_type = 'customer'
     AND NEW.status IN ('completed', 'paid')
     AND (OLD.status IS DISTINCT FROM NEW.status OR NEW.requirements_met IS DISTINCT FROM OLD.requirements_met)
  THEN
    UPDATE public.referral_bonuses
    SET status = CASE
          WHEN status = 'pending' THEN 'approved'
          ELSE status
        END,
        paid_at = COALESCE(paid_at, NOW())
    WHERE referral_id = NEW.id
      AND status IN ('pending', 'approved');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approve_referral_bonuses_on_complete ON public.referrals;
CREATE TRIGGER trg_approve_referral_bonuses_on_complete
  AFTER UPDATE OF status, requirements_met ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_approve_referral_bonuses_on_complete();

COMMENT ON FUNCTION public.attribute_customer_referral(TEXT, UUID) IS
  'Attributes a new customer to an existing referral code; creates pending referrals row for tracker.';

-- Tracker payload for the referrer (SECURITY DEFINER — does not expose full order rows)
CREATE OR REPLACE FUNCTION public.get_my_customer_referral_tracker(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'referrals', '[]'::jsonb);
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      r.created_at,
      jsonb_build_object(
        'id', r.id,
        'referral_code', r.referral_code,
        'status', r.status,
        'requirements_met', COALESCE(r.requirements_met, false),
        'created_at', r.created_at,
        'completed_at', r.completed_at,
        'referrer_bonus_amount', COALESCE(r.referrer_bonus_amount, 1000),
        'referred_id', r.referred_id,
        'referred_label', COALESCE(
          NULLIF(trim(up.full_name), ''),
          'Friend · ' || left(r.referred_id::text, 8)
        ),
        'has_any_order', EXISTS (
          SELECT 1 FROM public.orders o WHERE o.customer_id = r.referred_id
        ),
        'has_delivered_order', EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.customer_id = r.referred_id AND o.order_status = 'delivered'
        ),
        'credit_status', COALESCE(b.status, 'none'),
        'credit_cents', COALESCE(b.amount, r.referrer_bonus_amount, 1000),
        'counts_toward_365', (
          COALESCE(r.requirements_met, false)
          OR r.status IN ('completed', 'paid')
        )
      ) AS row_data
    FROM public.referrals r
    LEFT JOIN public.user_profiles up ON up.user_id = r.referred_id
    LEFT JOIN LATERAL (
      SELECT rb.amount, rb.status
      FROM public.referral_bonuses rb
      WHERE rb.referral_id = r.id
        AND rb.user_id = r.referrer_id
        AND rb.bonus_type = 'referrer'
      ORDER BY rb.created_at DESC
      LIMIT 1
    ) b ON true
    WHERE r.referrer_id = p_user_id
      AND r.referral_type = 'customer'
  ) q;

  RETURN jsonb_build_object('ok', true, 'referrals', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_customer_referral_tracker(UUID) TO authenticated;
