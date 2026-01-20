-- Postgres RPC Functions for Promo System
-- Core server-side logic for eligibility, reservation, and redemption

-- ============================================================================
-- C1) GET_PROMO_OFFER(user_id)
-- Returns eligibility and next step details
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_promo_offer(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo RECORD;
  v_wallet RECORD;
  v_completed_orders_count INTEGER;
  v_next_step INTEGER;
  v_next_credit_cents INTEGER;
  v_steps JSONB;
  v_step_record JSONB;
BEGIN
  -- Get active promo
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE code = 'CREDIT_20_FIRST3'
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'promo_not_active'
    );
  END IF;

  -- Get or create wallet (auto-enroll)
  SELECT * INTO v_wallet
  FROM public.promo_wallets
  WHERE user_id = p_user_id
    AND promotion_id = v_promo.id;

  IF NOT FOUND THEN
    -- Auto-enroll user
    INSERT INTO public.promo_wallets (user_id, promotion_id, expires_at)
    VALUES (
      p_user_id,
      v_promo.id,
      now() + (v_promo.rules->>'expiry_days')::INTEGER * INTERVAL '1 day'
    )
    RETURNING * INTO v_wallet;
  END IF;

  -- Check if locked
  IF v_wallet.is_locked THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'locked'
    );
  END IF;

  -- Check if expired
  IF v_wallet.expires_at < now() THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'expired',
      'expires_at', v_wallet.expires_at
    );
  END IF;

  -- Count completed orders (delivered only)
  SELECT COUNT(*) INTO v_completed_orders_count
  FROM public.orders
  WHERE customer_id = p_user_id
    AND order_status = 'delivered';

  -- Calculate next step
  v_next_step := v_completed_orders_count + 1;

  -- Check if all steps completed
  IF v_next_step > 3 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'completed_all_steps',
      'completed_orders', v_completed_orders_count
    );
  END IF;

  -- Check if this step already redeemed
  IF EXISTS (
    SELECT 1 FROM public.promo_ledger
    WHERE user_id = p_user_id
      AND promotion_id = v_promo.id
      AND step = v_next_step
      AND event_type = 'REDEEMED'
  ) THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'step_already_redeemed',
      'step', v_next_step
    );
  END IF;

  -- Get credit amount for next step
  v_steps := v_promo.rules->'steps';
  SELECT (step_data->>'credit_cents')::INTEGER INTO v_next_credit_cents
  FROM jsonb_array_elements(v_steps) AS step_data
  WHERE (step_data->>'step')::INTEGER = v_next_step;

  IF v_next_credit_cents IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'invalid_step'
    );
  END IF;

  -- Return offer
  RETURN jsonb_build_object(
    'eligible', true,
    'next_step', v_next_step,
    'next_credit_cents', v_next_credit_cents,
    'expires_at', v_wallet.expires_at,
    'min_subtotal_cents', (v_promo.rules->>'min_subtotal_cents')::INTEGER,
    'delivery_cap_cents', (v_promo.rules->>'delivery_cap_cents')::INTEGER,
    'steps', v_steps,
    'completed_orders', v_completed_orders_count
  );
END;
$$;

-- ============================================================================
-- C2) RESERVE_PROMO_FOR_CHECKOUT(user_id, totals...)
-- Atomically reserves a promo step for checkout
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_promo_for_checkout(
  p_user_id UUID,
  p_food_subtotal_cents INTEGER,
  p_delivery_fee_cents INTEGER,
  p_service_fee_cents INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer JSONB;
  v_promo RECORD;
  v_next_step INTEGER;
  v_credit_cents INTEGER;
  v_delivery_cap_cents INTEGER;
  v_min_subtotal_cents INTEGER;
  v_delivery_credit_cents INTEGER;
  v_service_credit_cents INTEGER;
  v_total_applied INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Get offer
  v_offer := public.get_promo_offer(p_user_id);

  IF NOT (v_offer->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'reserved', false,
      'reason', v_offer->>'reason'
    );
  END IF;

  -- Extract offer details
  v_next_step := (v_offer->>'next_step')::INTEGER;
  v_credit_cents := (v_offer->>'next_credit_cents')::INTEGER;
  v_delivery_cap_cents := (v_offer->>'delivery_cap_cents')::INTEGER;
  v_min_subtotal_cents := (v_offer->>'min_subtotal_cents')::INTEGER;

  -- Get promo record
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE code = 'CREDIT_20_FIRST3'
    AND is_active = true
  LIMIT 1;

  -- Validate minimum subtotal
  IF p_food_subtotal_cents < v_min_subtotal_cents THEN
    RETURN jsonb_build_object(
      'reserved', false,
      'reason', 'minimum_order_not_met',
      'minimum', v_min_subtotal_cents,
      'provided', p_food_subtotal_cents
    );
  END IF;

  -- Calculate credit application
  -- 1. Apply to delivery fee (up to cap)
  v_delivery_credit_cents := LEAST(
    p_delivery_fee_cents,
    v_delivery_cap_cents,
    v_credit_cents
  );

  -- 2. Apply remainder to service fee
  v_service_credit_cents := LEAST(
    p_service_fee_cents,
    v_credit_cents - v_delivery_credit_cents
  );

  -- 3. Total applied
  v_total_applied := v_delivery_credit_cents + v_service_credit_cents;

  -- Check if any credit can be applied
  IF v_total_applied <= 0 THEN
    RETURN jsonb_build_object(
      'reserved', false,
      'reason', 'no_applicable_fees',
      'delivery_fee', p_delivery_fee_cents,
      'service_fee', p_service_fee_cents
    );
  END IF;

  -- Create RESERVED ledger entry (unique constraint prevents double reserve)
  BEGIN
    INSERT INTO public.promo_ledger (
      user_id,
      promotion_id,
      step,
      event_type,
      credit_cents,
      metadata
    )
    VALUES (
      p_user_id,
      v_promo.id,
      v_next_step,
      'RESERVED',
      v_total_applied,
      jsonb_build_object(
        'delivery_credit_cents', v_delivery_credit_cents,
        'service_credit_cents', v_service_credit_cents,
        'food_subtotal_cents', p_food_subtotal_cents,
        'delivery_fee_cents', p_delivery_fee_cents,
        'service_fee_cents', p_service_fee_cents
      )
    )
    RETURNING id INTO v_reservation_id;

    -- Return success
    RETURN jsonb_build_object(
      'reserved', true,
      'step', v_next_step,
      'credit_cents', v_total_applied,
      'delivery_credit_cents', v_delivery_credit_cents,
      'service_credit_cents', v_service_credit_cents,
      'reservation_id', v_reservation_id
    );

  EXCEPTION WHEN unique_violation THEN
    -- Another reservation already exists
    RETURN jsonb_build_object(
      'reserved', false,
      'reason', 'already_reserved',
      'step', v_next_step
    );
  END;
END;
$$;

-- ============================================================================
-- C3) REDEEM_RESERVED_PROMO(user_id, order_id)
-- Converts RESERVED -> REDEEMED after payment confirmation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_reserved_promo(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
  v_promo RECORD;
  v_order RECORD;
BEGIN
  -- Get promo
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE code = 'CREDIT_20_FIRST3'
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'reason', 'promo_not_active'
    );
  END IF;

  -- Find latest RESERVED entry for this user/promo
  SELECT * INTO v_reservation
  FROM public.promo_ledger
  WHERE user_id = p_user_id
    AND promotion_id = v_promo.id
    AND event_type = 'RESERVED'
    AND (order_id IS NULL OR order_id = p_order_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'reason', 'no_reservation'
    );
  END IF;

  -- Get order
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

  -- Update RESERVED to REDEEMED
  UPDATE public.promo_ledger
  SET event_type = 'REDEEMED',
      order_id = p_order_id,
      updated_at = now()
  WHERE id = v_reservation.id
    AND event_type = 'RESERVED';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'redeemed', false,
      'reason', 'reservation_already_processed'
    );
  END IF;

  -- Update order with promo details
  UPDATE public.orders
  SET promo_id = v_promo.id,
      promo_step = v_reservation.step,
      promo_credit_applied_cents = v_reservation.credit_cents,
      promo_delivery_credit_applied_cents = (v_reservation.metadata->>'delivery_credit_cents')::INTEGER,
      promo_service_credit_applied_cents = (v_reservation.metadata->>'service_credit_cents')::INTEGER,
      promo_applied = true,
      promo_applied_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'redeemed', true,
    'step', v_reservation.step,
    'credit_applied_cents', v_reservation.credit_cents,
    'delivery_credit_cents', (v_reservation.metadata->>'delivery_credit_cents')::INTEGER,
    'service_credit_cents', (v_reservation.metadata->>'service_credit_cents')::INTEGER
  );
END;
$$;

-- ============================================================================
-- C4) REVOKE_EXPIRED_RESERVATIONS()
-- Cleanup: Convert RESERVED > 30 minutes old to REVOKED
-- ============================================================================
CREATE OR REPLACE FUNCTION public.revoke_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revoked_count INTEGER;
BEGIN
  UPDATE public.promo_ledger
  SET event_type = 'REVOKED',
      metadata = metadata || jsonb_build_object('revoked_at', now())
  WHERE event_type = 'RESERVED'
    AND created_at < now() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

  RETURN v_revoked_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_promo_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_promo_for_checkout(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reserved_promo(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_expired_reservations() TO authenticated;













