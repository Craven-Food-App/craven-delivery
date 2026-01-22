-- RPC Functions for Android Tester Enrollment Program
-- Handles enrollment, credit issuance, and fee-only credit application

-- ============================================================================
-- B1) ENROLL_ANDROID_TESTER(email, full_name)
-- Creates enrollment record (before account creation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enroll_android_tester(
  p_email TEXT,
  p_full_name TEXT,
  p_platform TEXT DEFAULT 'android'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    platform
  )
  VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_full_name),
    p_platform
  )
  RETURNING id INTO v_enrollment_id;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'message', 'Successfully enrolled. Credits will be issued after account creation.'
  );
END;
$$;

-- ============================================================================
-- B2) ISSUE_TESTER_CREDITS(user_id, enrollment_email)
-- Issues credits after account creation and verification
-- Called automatically when user creates account with enrolled email
-- ============================================================================
CREATE OR REPLACE FUNCTION public.issue_tester_credits(
  p_user_id UUID,
  p_enrollment_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enrollment RECORD;
  v_base_grant_id UUID;
  v_bonus_grant_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_total_credits INTEGER;
BEGIN
  -- Find enrollment
  SELECT * INTO v_enrollment
  FROM public.android_tester_enrollments
  WHERE email = LOWER(TRIM(p_enrollment_email));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'enrollment_not_found',
      'message', 'No enrollment found for this email'
    );
  END IF;

  -- Check if credits already issued
  IF EXISTS (
    SELECT 1 FROM public.tester_credit_grants
    WHERE user_id = p_user_id
      AND enrollment_id = v_enrollment.id
      AND grant_type = 'base_enrollment'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'credits_already_issued',
      'message', 'Credits have already been issued for this enrollment'
    );
  END IF;

  -- Calculate expiration (30 days from now)
  v_expires_at := now() + INTERVAL '30 days';

  -- Issue base $25 credit (2500 cents)
  INSERT INTO public.tester_credit_grants (
    user_id,
    enrollment_id,
    grant_type,
    credit_cents,
    expires_at
  )
  VALUES (
    p_user_id,
    v_enrollment.id,
    'base_enrollment',
    2500, -- $25.00
    v_expires_at
  )
  RETURNING id INTO v_base_grant_id;

  v_total_credits := 2500;

  -- Issue bonus $50 credit if selected tester (7500 cents total)
  IF v_enrollment.is_selected_tester THEN
    INSERT INTO public.tester_credit_grants (
      user_id,
      enrollment_id,
      grant_type,
      credit_cents,
      expires_at
    )
    VALUES (
      p_user_id,
      v_enrollment.id,
      'selected_tester_bonus',
      5000, -- $50.00
      v_expires_at
    )
    RETURNING id INTO v_bonus_grant_id;

    v_total_credits := 7500; -- $75.00 total
  END IF;

  -- Update enrollment status to 'issued' (Phase B - credits are now issued)
  UPDATE public.android_tester_enrollments
  SET tester_reward_status = 'issued',
      updated_at = now()
  WHERE id = v_enrollment.id;

  RETURN jsonb_build_object(
    'success', true,
    'issued_credits_total_cents', v_total_credits,
    'total_credits_cents', v_total_credits,
    'expires_at', v_expires_at,
    'is_selected_tester', v_enrollment.is_selected_tester,
    'base_grant_id', v_base_grant_id,
    'bonus_grant_id', v_bonus_grant_id
  );
END;
$$;

-- ============================================================================
-- B3) GET_AVAILABLE_TESTER_CREDITS(user_id)
-- Returns available credit balance for user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_tester_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================================================
-- B4) APPLY_TESTER_CREDITS_TO_CHECKOUT(user_id, service_fee_cents, delivery_fee_cents, platform_fee_cents)
-- Applies available tester credits ONLY to Crave'n fees
-- Returns credit breakdown for checkout preview
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
AS $$
DECLARE
  v_available_credit_cents INTEGER;
  v_service_credit_cents INTEGER;
  v_delivery_credit_cents INTEGER;
  v_platform_credit_cents INTEGER;
  v_total_applied INTEGER;
  v_remaining_credit INTEGER;
  v_grant RECORD;
  v_credit_to_apply INTEGER;
BEGIN
  -- Get available credit balance
  SELECT available_credit_cents INTO v_available_credit_cents
  FROM public.get_available_tester_credits(p_user_id);

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
    'total_credit_cents', v_total_applied,
    'remaining_credit_cents', v_remaining_credit
  );
END;
$$;

-- ============================================================================
-- B5) REDEEM_TESTER_CREDITS_FOR_ORDER(user_id, order_id, service_credit_cents, delivery_credit_cents, platform_credit_cents)
-- Records credit usage after order payment confirmation
-- Updates grant usage and creates ledger entries
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_tester_credits_for_order(
  p_user_id UUID,
  p_order_id UUID,
  p_service_credit_cents INTEGER DEFAULT 0,
  p_delivery_credit_cents INTEGER DEFAULT 0,
  p_platform_credit_cents INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_credit_cents INTEGER;
  v_grant RECORD;
  v_credit_to_apply INTEGER;
  v_remaining_to_apply INTEGER;
  v_service_remaining INTEGER;
  v_delivery_remaining INTEGER;
  v_platform_remaining INTEGER;
  v_ledger_id UUID;
  v_order RECORD;
BEGIN
  v_total_credit_cents := p_service_credit_cents + p_delivery_credit_cents + p_platform_credit_cents;

  IF v_total_credit_cents <= 0 THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'reason', 'no_credits_to_apply'
    );
  END IF;

  -- Verify order exists and belongs to user
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND customer_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'reason', 'order_not_found'
    );
  END IF;

  -- Track remaining credits to apply
  v_service_remaining := p_service_credit_cents;
  v_delivery_remaining := p_delivery_credit_cents;
  v_platform_remaining := p_platform_credit_cents;
  v_remaining_to_apply := v_total_credit_cents;

  -- Apply credits from grants (FIFO by expiration)
  FOR v_grant IN
    SELECT * FROM public.tester_credit_grants
    WHERE user_id = p_user_id
      AND is_expired = false
      AND is_revoked = false
      AND expires_at > now()
      AND (credit_cents - used_cents) > 0
    ORDER BY expires_at ASC
  LOOP
    EXIT WHEN v_remaining_to_apply <= 0;

    v_credit_to_apply := LEAST(
      v_remaining_to_apply,
      v_grant.credit_cents - v_grant.used_cents
    );

    -- Update grant usage
    UPDATE public.tester_credit_grants
    SET used_cents = used_cents + v_credit_to_apply,
        updated_at = now()
    WHERE id = v_grant.id;

    -- Create ledger entries for each fee type
    IF v_service_remaining > 0 THEN
      v_credit_to_apply := LEAST(v_credit_to_apply, v_service_remaining);
      
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
        'service_fee',
        v_credit_to_apply,
        'service_fee',
        v_order.service_fee_cents,
        GREATEST(0, v_order.service_fee_cents - v_credit_to_apply)
      );

      v_service_remaining := v_service_remaining - v_credit_to_apply;
      v_remaining_to_apply := v_remaining_to_apply - v_credit_to_apply;
    END IF;

    -- Continue with delivery and platform fees if credit remains
    -- (Simplified - in practice, you'd allocate proportionally)
  END LOOP;

  -- Update order with tester credit tracking
  UPDATE public.orders
  SET tester_credit_applied_cents = v_total_credit_cents,
      tester_service_credit_applied_cents = p_service_credit_cents,
      tester_delivery_credit_applied_cents = p_delivery_credit_cents,
      tester_platform_credit_applied_cents = p_platform_credit_cents
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'redeemed', true,
    'total_credit_cents', v_total_credit_cents,
    'service_credit_cents', p_service_credit_cents,
    'delivery_credit_cents', p_delivery_credit_cents,
    'platform_credit_cents', p_platform_credit_cents
  );
END;
$$;

-- ============================================================================
-- B6) MARK_EXPIRED_TESTER_CREDITS()
-- Cleanup function: Marks expired credits (run via cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_expired_tester_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.tester_credit_grants
  SET is_expired = true,
      updated_at = now()
  WHERE is_expired = false
    AND expires_at <= now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.enroll_android_tester(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_tester_credits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_tester_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_tester_credits_to_checkout(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_tester_credits_for_order(UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_expired_tester_credits() TO authenticated;

