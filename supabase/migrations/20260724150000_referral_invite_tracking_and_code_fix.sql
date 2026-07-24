-- =============================================================================
-- Referral invite hardening:
-- 1) Restore permanent generate_referral_code (return existing first)
-- 2) Track invite share/open events for gamified Refer & Earn
-- 3) Reject known placeholder codes (CRAVEN10 / CRAVE10)
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_user_type_unique
  ON public.referral_codes (user_id, user_type);

-- 1) Permanent personal codes
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid, p_user_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing_code TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- Any existing row for this user+type wins (reactivate; never regenerate)
  SELECT code INTO v_existing_code
  FROM public.referral_codes
  WHERE user_id = p_user_id
    AND user_type = p_user_type
  ORDER BY is_active DESC, created_at ASC
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    UPDATE public.referral_codes
    SET is_active = true
    WHERE user_id = p_user_id
      AND user_type = p_user_type
      AND code = v_existing_code;
    RETURN v_existing_code;
  END IF;

  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.referral_codes (user_id, code, user_type, is_active)
      VALUES (p_user_id, v_code, p_user_type, true)
      ON CONFLICT (user_id, user_type) DO NOTHING;

      SELECT code INTO v_existing_code
      FROM public.referral_codes
      WHERE user_id = p_user_id
        AND user_type = p_user_type
      LIMIT 1;

      IF v_existing_code IS NOT NULL THEN
        UPDATE public.referral_codes
        SET is_active = true
        WHERE user_id = p_user_id
          AND user_type = p_user_type
          AND code = v_existing_code;
        RETURN v_existing_code;
      END IF;
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
    END IF;
  END LOOP;
END;
$function$;

-- 2) Invite event ledger
CREATE TABLE IF NOT EXISTS public.referral_invite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'copy_link', 'copy_code', 'share', 'landing_open')),
  invitee_hint text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_invite_events_referrer_created
  ON public.referral_invite_events (referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_invite_events_code
  ON public.referral_invite_events (referral_code);

ALTER TABLE public.referral_invite_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_invite_events_select_own ON public.referral_invite_events;
CREATE POLICY referral_invite_events_select_own
  ON public.referral_invite_events FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

DROP POLICY IF EXISTS referral_invite_events_insert_own ON public.referral_invite_events;
CREATE POLICY referral_invite_events_insert_own
  ON public.referral_invite_events FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid());

-- 3) Log invite share / landing open
-- landing_open: allowed for anon (invitee); credits the code owner
-- share channels: authenticated referrer only
CREATE OR REPLACE FUNCTION public.log_referral_invite_event(
  p_channel text,
  p_referral_code text DEFAULT NULL,
  p_invitee_hint text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_channel text := lower(trim(COALESCE(p_channel, '')));
  v_referrer uuid;
BEGIN
  IF v_channel NOT IN ('email', 'sms', 'copy_link', 'copy_code', 'share', 'landing_open') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_channel');
  END IF;

  v_code := upper(trim(COALESCE(p_referral_code, '')));

  IF v_channel = 'landing_open' THEN
    IF v_code = '' OR v_code IN ('CRAVEN10', 'CRAVE10') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
    END IF;

    SELECT user_id INTO v_referrer
    FROM public.referral_codes
    WHERE upper(code) = v_code
      AND user_type = 'customer'
      AND is_active = true
    LIMIT 1;

    IF v_referrer IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
    END IF;

    INSERT INTO public.referral_invite_events (referrer_id, referral_code, channel, invitee_hint, metadata)
    VALUES (
      v_referrer,
      v_code,
      v_channel,
      NULLIF(trim(COALESCE(p_invitee_hint, '')), ''),
      COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('logged_by', COALESCE(v_uid::text, 'anon'))
    );

    RETURN jsonb_build_object('ok', true, 'code', v_code);
  END IF;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_code = '' OR v_code IN ('CRAVEN10', 'CRAVE10') THEN
    SELECT code INTO v_code
    FROM public.referral_codes
    WHERE user_id = v_uid AND user_type = 'customer' AND is_active = true
    LIMIT 1;
  END IF;

  IF v_code IS NULL OR v_code = '' OR v_code IN ('CRAVEN10', 'CRAVE10') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_referral_code');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.referral_codes
    WHERE user_id = v_uid AND user_type = 'customer' AND is_active = true
      AND upper(code) = v_code
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_owned');
  END IF;

  INSERT INTO public.referral_invite_events (referrer_id, referral_code, channel, invitee_hint, metadata)
  VALUES (
    v_uid,
    v_code,
    v_channel,
    NULLIF(trim(COALESCE(p_invitee_hint, '')), ''),
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object('ok', true, 'code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_referral_invite_event(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_referral_invite_event(text, text, text, jsonb) TO anon;

-- 4) Stats for gamified Refer & Earn dashboard
CREATE OR REPLACE FUNCTION public.get_my_referral_invite_stats(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_shares int := 0;
  v_opens int := 0;
  v_signups int := 0;
  v_qualified int := 0;
BEGIN
  IF v_uid IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() <> v_uid) THEN
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
    END IF;
    v_uid := auth.uid();
  END IF;

  SELECT COUNT(*)::int INTO v_shares
  FROM public.referral_invite_events
  WHERE referrer_id = v_uid
    AND channel IN ('email', 'sms', 'copy_link', 'copy_code', 'share');

  SELECT COUNT(*)::int INTO v_opens
  FROM public.referral_invite_events
  WHERE referrer_id = v_uid AND channel = 'landing_open';

  SELECT COUNT(*)::int INTO v_signups
  FROM public.referrals
  WHERE referrer_id = v_uid AND referral_type = 'customer';

  SELECT COUNT(*)::int INTO v_qualified
  FROM public.referrals
  WHERE referrer_id = v_uid
    AND referral_type = 'customer'
    AND (requirements_met = true OR status IN ('completed', 'paid'));

  RETURN jsonb_build_object(
    'ok', true,
    'shares', v_shares,
    'landing_opens', v_opens,
    'signups', v_signups,
    'qualified', v_qualified
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_invite_stats(uuid) TO authenticated;

-- 5) Harden attribution: reject placeholder codes
CREATE OR REPLACE FUNCTION public.attribute_customer_referral(
  p_referral_code text,
  p_referred_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_referred_id, auth.uid());
  v_code text := upper(trim(COALESCE(p_referral_code, '')));
  v_referrer uuid;
  v_existing uuid;
  v_referral_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_code = '' OR v_code IN ('CRAVEN10', 'CRAVE10') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT user_id INTO v_referrer
  FROM public.referral_codes
  WHERE upper(code) = v_code
    AND user_type = 'customer'
    AND is_active = true
  LIMIT 1;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
  END IF;

  IF v_referrer = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  SELECT id INTO v_existing
  FROM public.referrals
  WHERE referred_id = v_uid AND referral_type = 'customer'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'referral_id', v_existing, 'already_attributed', true);
  END IF;

  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    referral_type,
    status,
    requirements_met
  ) VALUES (
    v_referrer,
    v_uid,
    v_code,
    'customer',
    'pending',
    false
  )
  RETURNING id INTO v_referral_id;

  RETURN jsonb_build_object('ok', true, 'referral_id', v_referral_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing
    FROM public.referrals
    WHERE referred_id = v_uid AND referral_type = 'customer'
    LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'referral_id', v_existing, 'already_attributed', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.attribute_customer_referral(text, uuid) TO authenticated;
