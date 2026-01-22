-- Complete Tester Enrollment System - All RPC Functions
-- Consolidated SQL for all tester enrollment functions

-- ============================================================================
-- 1. log_tester_activity_day - Log app open (called on session init)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_tester_activity_day(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_inserted BOOLEAN := false;
BEGIN
  -- Insert with ON CONFLICT DO NOTHING (idempotent)
  INSERT INTO public.tester_activity_days (user_id, activity_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'logged', v_inserted,
    'date', v_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_tester_activity_day(UUID) TO authenticated, anon;

-- ============================================================================
-- 2. submit_tester_feedback - Submit micro-feedback
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_tester_feedback(
  p_user_id UUID,
  p_prompt_key TEXT,
  p_rating INTEGER DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_id UUID;
BEGIN
  INSERT INTO public.tester_feedback_events (user_id, prompt_key, rating, comment)
  VALUES (p_user_id, p_prompt_key, p_rating, p_comment)
  ON CONFLICT (user_id, prompt_key) 
  DO UPDATE SET 
    rating = COALESCE(EXCLUDED.rating, tester_feedback_events.rating),
    comment = COALESCE(EXCLUDED.comment, tester_feedback_events.comment),
    created_at = tester_feedback_events.created_at -- Keep original timestamp
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tester_feedback(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- ============================================================================
-- 3. get_tester_progress - Get current progress for Tester Hub UI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tester_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_activity_days_count INTEGER;
  v_feedback_count INTEGER;
  v_deadline_passed BOOLEAN;
  v_days_remaining INTEGER;
  v_tier_a_eligible BOOLEAN := false;
  v_tier_b_eligible BOOLEAN := false;
  v_tier_c_eligible BOOLEAN := false;
  v_tier_a_issued BOOLEAN := false;
  v_tier_b_issued BOOLEAN := false;
  v_tier_c_issued BOOLEAN := false;
  v_referral_stats JSONB;
BEGIN
  -- Get enrollment
  SELECT * INTO v_enrollment
  FROM public.android_tester_enrollments
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_enrolled');
  END IF;

  -- Count distinct activity days within deadline window
  SELECT COUNT(DISTINCT activity_date) INTO v_activity_days_count
  FROM public.tester_activity_days
  WHERE user_id = p_user_id
    AND activity_date >= COALESCE(v_enrollment.activated_at::DATE, CURRENT_DATE - 7)
    AND activity_date <= COALESCE(v_enrollment.deadline_at::DATE, CURRENT_DATE);

  -- Count unique feedback prompts
  SELECT COUNT(DISTINCT prompt_key) INTO v_feedback_count
  FROM public.tester_feedback_events
  WHERE user_id = p_user_id;

  -- Check deadline
  v_deadline_passed := COALESCE(v_enrollment.deadline_at < now(), false);
  v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_enrollment.deadline_at - now()))::INTEGER);

  -- Check issued tiers
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_a') INTO v_tier_a_issued;
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_b') INTO v_tier_b_issued;
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_c') INTO v_tier_c_issued;

  -- Tier A eligibility
  v_tier_a_eligible := v_enrollment.status = 'activated'
    AND v_activity_days_count >= 3
    AND v_feedback_count >= 2
    AND NOT v_deadline_passed
    AND NOT v_tier_a_issued;

  -- Tier B eligibility (requires Tier A issued + selected)
  v_tier_b_eligible := v_tier_a_issued
    AND v_enrollment.is_selected_tester = true
    AND NOT v_tier_b_issued;

  -- Tier C eligibility check
  SELECT jsonb_build_object(
    'driver_completed', EXISTS(
      SELECT 1 FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'driver' 
        AND status = 'completed'
    ),
    'merchant_completed', EXISTS(
      SELECT 1 FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'merchant' 
        AND status = 'completed'
    ),
    'customer_count', (
      SELECT COUNT(*) FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'customer' 
        AND status = 'completed'
    )
  ) INTO v_referral_stats;

  v_tier_c_eligible := v_tier_a_issued
    AND (
      (v_referral_stats->>'driver_completed')::boolean = true
      OR (v_referral_stats->>'merchant_completed')::boolean = true
      OR ((v_referral_stats->>'customer_count')::integer >= 2)
    )
    AND NOT v_tier_c_issued;

  RETURN jsonb_build_object(
    'enrollment', jsonb_build_object(
      'status', v_enrollment.status,
      'activated_at', v_enrollment.activated_at,
      'deadline_at', v_enrollment.deadline_at,
      'is_selected_tester', v_enrollment.is_selected_tester,
      'referral_code', v_enrollment.referral_code
    ),
    'progress', jsonb_build_object(
      'activity_days', v_activity_days_count,
      'activity_days_required', 3,
      'feedback_count', v_feedback_count,
      'feedback_required', 2,
      'days_remaining', v_days_remaining,
      'deadline_passed', v_deadline_passed
    ),
    'tiers', jsonb_build_object(
      'tier_a', jsonb_build_object(
        'eligible', v_tier_a_eligible,
        'issued', v_tier_a_issued
      ),
      'tier_b', jsonb_build_object(
        'eligible', v_tier_b_eligible,
        'issued', v_tier_b_issued
      ),
      'tier_c', jsonb_build_object(
        'eligible', v_tier_c_eligible,
        'issued', v_tier_c_issued,
        'referral_stats', v_referral_stats
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tester_progress(UUID) TO authenticated;

-- ============================================================================
-- 4. enroll_android_tester - Legacy function (kept for compatibility)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enroll_android_tester(
  p_email TEXT,
  p_full_name TEXT,
  p_platform TEXT DEFAULT 'android'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_id UUID;
  v_existing_enrollment RECORD;
BEGIN
  -- Validate platform
  IF p_platform NOT IN ('android', 'ios') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_platform',
      'message', 'Platform must be android or ios'
    );
  END IF;

  -- Check if already enrolled
  SELECT * INTO v_existing_enrollment
  FROM public.android_tester_enrollments
  WHERE email = LOWER(TRIM(p_email));

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_enrolled',
      'message', 'This email is already enrolled',
      'enrollment_id', v_existing_enrollment.id,
      'enrolled_at', v_existing_enrollment.enrolled_at,
      'is_selected_tester', v_existing_enrollment.is_selected_tester
    );
  END IF;

  -- Create enrollment
  INSERT INTO public.android_tester_enrollments (
    email,
    full_name,
    platform,
    status
  )
  VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_full_name),
    p_platform,
    'enrolled'
  )
  RETURNING id INTO v_enrollment_id;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'message', 'Successfully enrolled. Credits will be issued after account creation.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_android_tester(TEXT, TEXT, TEXT) TO authenticated, anon;

-- ============================================================================
-- 5. get_available_tester_credits - Get available credit balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_tester_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_credit_cents INTEGER;
  v_used_credit_cents INTEGER;
  v_available_credit_cents INTEGER;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_grants JSONB;
BEGIN
  -- Get all active grants
  SELECT 
    COALESCE(SUM(credit_cents), 0),
    COALESCE(SUM(used_cents), 0),
    MIN(expires_at) FILTER (WHERE expires_at > now())
  INTO v_total_credit_cents, v_used_credit_cents, v_expires_at
  FROM public.tester_credit_grants
  WHERE user_id = p_user_id
    AND is_expired = false
    AND is_revoked = false
    AND expires_at > now();

  v_available_credit_cents := GREATEST(0, v_total_credit_cents - v_used_credit_cents);

  -- Get grant details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'grant_type', grant_type,
      'credit_cents', credit_cents,
      'used_cents', used_cents,
      'available_cents', credit_cents - used_cents,
      'expires_at', expires_at
    )
  )
  INTO v_grants
  FROM public.tester_credit_grants
  WHERE user_id = p_user_id
    AND is_expired = false
    AND is_revoked = false
    AND expires_at > now();

  RETURN jsonb_build_object(
    'total_credit_cents', v_total_credit_cents,
    'used_credit_cents', v_used_credit_cents,
    'available_credit_cents', v_available_credit_cents,
    'earliest_expires_at', v_expires_at,
    'grants', COALESCE(v_grants, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_tester_credits(UUID) TO authenticated;

-- ============================================================================
-- 6. apply_tester_credits_to_checkout - Apply credits to checkout (preview)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_tester_credits_to_checkout(
  p_user_id UUID,
  p_service_fee_cents INTEGER DEFAULT 0,
  p_delivery_fee_cents INTEGER DEFAULT 0,
  p_platform_fee_cents INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_credit_cents INTEGER;
  v_service_credit_cents INTEGER;
  v_delivery_credit_cents INTEGER;
  v_platform_credit_cents INTEGER;
  v_total_applied INTEGER;
  v_remaining_credit INTEGER;
  v_credit_result JSONB;
BEGIN
  -- Get available credit balance
  v_credit_result := public.get_available_tester_credits(p_user_id);
  v_available_credit_cents := (v_credit_result->>'available_credit_cents')::INTEGER;

  IF v_available_credit_cents <= 0 THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'no_available_credits',
      'available_credit_cents', 0,
      'service_credit_cents', 0,
      'delivery_credit_cents', 0,
      'platform_credit_cents', 0,
      'total_credit_cents', 0
    );
  END IF;

  -- Calculate credit application (ONLY to Crave'n fees)
  -- Priority: service fee > delivery fee > platform fee
  v_remaining_credit := v_available_credit_cents;

  -- 1. Apply to service fee first
  v_service_credit_cents := LEAST(p_service_fee_cents, v_remaining_credit);
  v_remaining_credit := v_remaining_credit - v_service_credit_cents;

  -- 2. Apply remainder to delivery fee
  IF v_remaining_credit > 0 THEN
    v_delivery_credit_cents := LEAST(p_delivery_fee_cents, v_remaining_credit);
    v_remaining_credit := v_remaining_credit - v_delivery_credit_cents;
  ELSE
    v_delivery_credit_cents := 0;
  END IF;

  -- 3. Apply remainder to platform fee
  IF v_remaining_credit > 0 THEN
    v_platform_credit_cents := LEAST(p_platform_fee_cents, v_remaining_credit);
    v_remaining_credit := v_remaining_credit - v_platform_credit_cents;
  ELSE
    v_platform_credit_cents := 0;
  END IF;

  v_total_applied := v_service_credit_cents + v_delivery_credit_cents + v_platform_credit_cents;

  -- Return preview (actual application happens at order creation)
  RETURN jsonb_build_object(
    'applied', v_total_applied > 0,
    'available_credit_cents', v_available_credit_cents,
    'service_credit_cents', v_service_credit_cents,
    'delivery_credit_cents', v_delivery_credit_cents,
    'platform_credit_cents', v_platform_credit_cents,
    'total_credit_cents', v_total_applied
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_tester_credits_to_checkout(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- 7. redeem_tester_credits_for_order - Record credit usage after order
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_tester_credits_for_order(
  p_user_id UUID,
  p_order_id UUID,
  p_total_credit_applied_cents INTEGER,
  p_delivery_credit_applied_cents INTEGER,
  p_service_credit_applied_cents INTEGER,
  p_platform_credit_applied_cents INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant RECORD;
  v_credit_to_apply INTEGER;
  v_remaining_to_apply INTEGER;
  v_applied INTEGER;
BEGIN
  v_remaining_to_apply := p_total_credit_applied_cents;

  -- Apply credits from oldest grants first
  FOR v_grant IN
    SELECT * FROM public.tester_credit_grants
    WHERE user_id = p_user_id
      AND is_expired = false
      AND is_revoked = false
      AND expires_at > now()
      AND (credit_cents - used_cents) > 0
    ORDER BY expires_at ASC, created_at ASC
  LOOP
    IF v_remaining_to_apply <= 0 THEN
      EXIT;
    END IF;

    v_credit_to_apply := LEAST(
      v_remaining_to_apply,
      v_grant.credit_cents - v_grant.used_cents
    );

    -- Update grant usage
    UPDATE public.tester_credit_grants
    SET used_cents = used_cents + v_credit_to_apply,
        updated_at = now()
    WHERE id = v_grant.id;

    -- Record in ledger
    INSERT INTO public.tester_credit_ledger (
      credit_grant_id,
      user_id,
      order_id,
      credit_type,
      credit_cents,
      fee_type_before_credit,
      fee_amount_before_credit_cents,
      fee_amount_after_credit_cents
    )
    VALUES (
      v_grant.id,
      p_user_id,
      p_order_id,
      'service_fee', -- Simplified for now
      v_credit_to_apply,
      'service_fee',
      p_service_credit_applied_cents,
      GREATEST(0, p_service_credit_applied_cents - v_credit_to_apply)
    );

    v_remaining_to_apply := v_remaining_to_apply - v_credit_to_apply;
    v_applied := COALESCE(v_applied, 0) + v_credit_to_apply;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_applied_cents', v_applied,
    'remaining_credit_cents', v_remaining_to_apply
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_tester_credits_for_order(UUID, UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- 8. mark_expired_tester_credits - Mark expired credits (run via cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_expired_tester_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.tester_credit_grants
  SET is_expired = true,
      updated_at = now()
  WHERE expires_at <= now()
    AND is_expired = false;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_expired_tester_credits() TO authenticated;

