-- Crave'n Clean Pay Standard: locked offer snapshot, single RPC summary for feeder UI + finalize bookkeeping.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS feeder_clean_pay_offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feeder_offer_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS feeder_offer_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS feeder_total_guaranteed_offer_cents integer,
  ADD COLUMN IF NOT EXISTS feeder_adjustment_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeder_adjustment_reason text,
  ADD COLUMN IF NOT EXISTS feeder_final_payout_cents integer,
  ADD COLUMN IF NOT EXISTS feeder_payout_status text,
  ADD COLUMN IF NOT EXISTS feeder_tip_status text,
  ADD COLUMN IF NOT EXISTS feeder_delivery_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS feeder_cancellation_pay_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeder_clean_pay_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.feeder_clean_pay_offer_snapshot IS 'Immutable JSON snapshot of Clean Pay line items at offer acceptance.';
COMMENT ON COLUMN public.orders.feeder_total_guaranteed_offer_cents IS 'Locked guaranteed offer (pre-tip floor + promos) at acceptance; not overwritten.';
COMMENT ON COLUMN public.orders.feeder_adjustment_cents IS 'Signed adjustment vs locked offer when order economics change before/through pickup.';
COMMENT ON COLUMN public.orders.feeder_final_payout_cents IS 'Final driver payout cents after delivery completion (matches driver_earnings totals).';

-- ---------------------------------------------------------------------------
-- Build snapshot from current order row (same logic as payout calculation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._build_clean_pay_snapshot_from_order(o public.orders)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_del_fees integer;
  v_tip integer;
  v_base integer;
  v_bps integer;
  v_promo integer;
  v_fee_share integer;
  v_before_tip integer;
BEGIN
  v_del_fees := COALESCE(o.delivery_fees_total_cents, o.delivery_fee_cents, 0);
  v_tip := COALESCE(o.tip_cents, 0);
  v_base := COALESCE(o.driver_base_pay_cents, 250);
  v_bps := COALESCE(o.driver_delivery_fee_share_bps, 7000);
  v_promo :=
    COALESCE(o.promo_delivery_credit_applied_cents, 0) +
    COALESCE(o.promo_service_credit_applied_cents, 0);
  v_fee_share := FLOOR(v_del_fees * v_bps / 10000.0)::integer;

  SELECT p.driver_before_tip_cents
  INTO v_before_tip
  FROM public.calculate_driver_payout_cents(v_del_fees, v_tip, v_base, v_bps) AS p
  LIMIT 1;

  RETURN jsonb_build_object(
    'basePayCents', v_base,
    'deliveryFeeShareCents', v_fee_share,
    'customerTipCents', v_tip,
    'promoBonusCents', v_promo,
    'totalGuaranteedOfferCents', COALESCE(v_before_tip, 0) + v_promo
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Persist offer acceptance snapshot once (never overwrite)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_feeder_clean_pay_offer_acceptance(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  v_snapshot jsonb;
  v_driver uuid := auth.uid();
BEGIN
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF o.driver_id IS DISTINCT FROM v_driver AND NOT EXISTS (
    SELECT 1
    FROM public.order_assignments oa
    WHERE oa.order_id = p_order_id
      AND oa.driver_id = v_driver
      AND oa.status = 'accepted'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF o.feeder_offer_accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_saved', true);
  END IF;

  v_snapshot := public._build_clean_pay_snapshot_from_order(o);

  UPDATE public.orders
  SET
    feeder_clean_pay_offer_snapshot = v_snapshot,
    feeder_offer_accepted_at = now(),
    feeder_offer_locked_at = now(),
    feeder_total_guaranteed_offer_cents = (v_snapshot->>'totalGuaranteedOfferCents')::integer,
    feeder_tip_status = 'locked',
    feeder_payout_status = 'pending',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'snapshot', v_snapshot);
END;
$$;

-- ---------------------------------------------------------------------------
-- At pickup: persist pickup_confirmed_at (if missing) + adjustment vs locked offer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_feeder_clean_pay_adjustment_at_pickup(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  v_snap jsonb;
  v_locked integer;
  v_live_before integer;
  v_promo_live integer;
  v_adj integer;
  v_driver uuid := auth.uid();
BEGIN
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF o.driver_id IS DISTINCT FROM v_driver
     AND o.assigned_craver_id IS DISTINCT FROM v_driver
     AND NOT EXISTS (
       SELECT 1 FROM public.order_assignments oa
       WHERE oa.order_id = p_order_id AND oa.driver_id = v_driver AND oa.status = 'accepted'
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_snap := o.feeder_clean_pay_offer_snapshot;
  IF v_snap IS NULL OR v_snap = '{}'::jsonb OR o.feeder_offer_accepted_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_offer_snapshot');
  END IF;

  v_locked := COALESCE(
    (v_snap->>'totalGuaranteedOfferCents')::integer,
    o.feeder_total_guaranteed_offer_cents,
    0
  );

  SELECT p.driver_before_tip_cents
  INTO v_live_before
  FROM public.calculate_driver_payout_cents(
    COALESCE(o.delivery_fees_total_cents, o.delivery_fee_cents, 0),
    COALESCE(o.tip_cents, 0),
    COALESCE(o.driver_base_pay_cents, 250),
    COALESCE(o.driver_delivery_fee_share_bps, 7000)
  ) AS p
  LIMIT 1;

  v_promo_live :=
    COALESCE(o.promo_delivery_credit_applied_cents, 0) +
    COALESCE(o.promo_service_credit_applied_cents, 0);

  v_adj := (COALESCE(v_live_before, 0) + v_promo_live) - v_locked;

  UPDATE public.orders
  SET
    feeder_adjustment_cents = v_adj,
    feeder_adjustment_reason = CASE
      WHEN v_adj <> 0 THEN 'Delivery fee or base pay inputs changed after offer acceptance'
      ELSE NULL
    END,
    pickup_confirmed_at = COALESCE(pickup_confirmed_at, now()),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'adjustment_cents', v_adj);
END;
$$;

-- ---------------------------------------------------------------------------
-- Single summary for offer screen, active flow, completion (reads snapshot + order)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feeder_clean_pay_summary(p_order_id uuid, p_flow_stage text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  v_snap jsonb;
  v_live_snap jsonb;
  v_base integer;
  v_delivery_share integer;
  v_tip integer;
  v_promo integer;
  v_total_guaranteed integer;
  v_adj integer;
  v_adj_reason text;
  v_live_before integer;
  v_promo_live integer;
  v_locked_total integer;
  v_stage text;
  v_pay_label text;
  v_tip_label text;
  v_payout_label text;
  v_expected_final integer;
  v_final integer;
  v_earn_total integer;
  v_uid uuid := auth.uid();
  v_feeder uuid;
  v_next_hint text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('orderId', p_order_id, 'error', 'order_not_found');
  END IF;

  IF v_uid IS NOT NULL THEN
    IF o.driver_id IS DISTINCT FROM v_uid
       AND o.customer_id IS DISTINCT FROM v_uid
       AND NOT EXISTS (
         SELECT 1 FROM public.order_assignments oa
         WHERE oa.order_id = p_order_id AND oa.driver_id = v_uid
       ) THEN
      RETURN jsonb_build_object('orderId', p_order_id, 'error', 'forbidden');
    END IF;
  END IF;

  v_feeder := COALESCE(o.driver_id, o.assigned_craver_id);

  v_live_snap := public._build_clean_pay_snapshot_from_order(o);

  IF o.feeder_offer_accepted_at IS NOT NULL AND o.feeder_clean_pay_offer_snapshot IS NOT NULL
     AND o.feeder_clean_pay_offer_snapshot <> '{}'::jsonb THEN
    v_snap := o.feeder_clean_pay_offer_snapshot;
  ELSE
    v_snap := v_live_snap;
  END IF;

  v_base := COALESCE((v_snap->>'basePayCents')::integer, 0);
  v_delivery_share := COALESCE((v_snap->>'deliveryFeeShareCents')::integer, 0);
  v_tip := COALESCE((v_snap->>'customerTipCents')::integer, COALESCE(o.tip_cents, 0));
  v_promo := COALESCE((v_snap->>'promoBonusCents')::integer, 0);
  v_total_guaranteed := COALESCE(
    (v_snap->>'totalGuaranteedOfferCents')::integer,
    o.feeder_total_guaranteed_offer_cents,
    0
  );

  v_locked_total := COALESCE(o.feeder_total_guaranteed_offer_cents, v_total_guaranteed);

  SELECT p.driver_before_tip_cents
  INTO v_live_before
  FROM public.calculate_driver_payout_cents(
    COALESCE(o.delivery_fees_total_cents, o.delivery_fee_cents, 0),
    COALESCE(o.tip_cents, 0),
    COALESCE(o.driver_base_pay_cents, 250),
    COALESCE(o.driver_delivery_fee_share_bps, 7000)
  ) AS p
  LIMIT 1;

  v_promo_live :=
    COALESCE(o.promo_delivery_credit_applied_cents, 0) +
    COALESCE(o.promo_service_credit_applied_cents, 0);

  IF o.feeder_offer_accepted_at IS NULL THEN
    v_adj := 0;
  ELSIF o.pickup_confirmed_at IS NOT NULL
        OR o.order_status = ANY (ARRAY['picked_up','out_for_delivery','delivered']::text[]) THEN
    v_adj := COALESCE(o.feeder_adjustment_cents, 0);
  ELSE
    v_adj := (COALESCE(v_live_before, 0) + v_promo_live) - v_locked_total;
  END IF;

  IF o.feeder_adjustment_reason IS NOT NULL AND o.feeder_adjustment_reason <> '' THEN
    v_adj_reason := o.feeder_adjustment_reason;
  ELSIF v_adj IS NOT NULL AND v_adj <> 0 AND o.feeder_offer_accepted_at IS NOT NULL THEN
    v_adj_reason := 'Delivery fee or base pay inputs changed after offer acceptance';
  ELSE
    v_adj_reason := NULL;
  END IF;

  v_stage := NULLIF(trim(p_flow_stage), '');
  IF v_stage IS NULL THEN
    IF o.order_status = 'cancelled' THEN
      v_stage := 'cancelled';
    ELSIF o.order_status = 'delivered' THEN
      v_stage := 'completed';
    ELSIF o.order_status = 'picked_up' THEN
      v_stage := 'pickedUp';
    ELSE
      v_stage := 'accepted';
    END IF;
  END IF;

  v_pay_label := CASE v_stage
    WHEN 'offered' THEN 'Offer Available'
    WHEN 'accepted' THEN 'Pending Pickup'
    WHEN 'enRouteToMerchant' THEN 'Pending Pickup'
    WHEN 'arrivedAtMerchant' THEN 'Pending Pickup'
    WHEN 'pickedUp' THEN 'In Progress'
    WHEN 'enRouteToCustomer' THEN 'In Progress'
    WHEN 'arrivedAtCustomer' THEN 'Awaiting Completion'
    WHEN 'completed' THEN 'Finalized'
    WHEN 'cancelled' THEN 'Cancelled'
    WHEN 'disputed' THEN 'Under Review'
    ELSE 'Pending Pickup'
  END;

  IF o.feeder_offer_accepted_at IS NULL THEN
    v_tip_label := 'Locked';
  ELSIF o.order_status = 'delivered' OR o.feeder_tip_status = 'paid_to_feeder' THEN
    v_tip_label := 'Paid to Feeder';
  ELSE
    v_tip_label := 'Reserved';
  END IF;

  v_payout_label := COALESCE(o.feeder_payout_status, 'pending');
  IF o.order_status = 'delivered' AND o.feeder_payout_status IS NULL THEN
    v_payout_label := 'ready';
  END IF;

  v_expected_final := v_locked_total + COALESCE(o.tip_cents, v_tip, 0) + COALESCE(v_adj, 0);

  v_final := o.feeder_final_payout_cents;
  IF v_final IS NULL THEN
    SELECT de.total_cents
    INTO v_earn_total
    FROM public.driver_earnings de
    WHERE de.order_id = p_order_id
      AND (v_feeder IS NULL OR de.driver_id = v_feeder)
    ORDER BY de.earned_at DESC NULLS LAST
    LIMIT 1;
    v_final := v_earn_total;
  END IF;

  v_next_hint := CASE v_stage
    WHEN 'pickedUp' THEN 'Deliver to Customer'
    WHEN 'enRouteToCustomer' THEN 'Deliver to Customer'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'orderId', o.id,
    'feederId', v_feeder,
    'orderStatus', o.order_status,
    'basePayCents', v_base,
    'deliveryFeeShareCents', v_delivery_share,
    'customerTipCents', COALESCE(o.tip_cents, v_tip, 0),
    'promoBonusCents', v_promo,
    'adjustmentCents', COALESCE(v_adj, 0),
    'totalGuaranteedCents', v_locked_total,
    'expectedFinalPayoutCents', v_expected_final,
    'finalPayoutCents', v_final,
    'tipStatus', v_tip_label,
    'payoutStatus', v_payout_label,
    'cleanPayStatusLabel', v_pay_label,
    'adjustmentReason', v_adj_reason,
    'offerLockedAt', o.feeder_offer_locked_at,
    'offerAcceptedAt', o.feeder_offer_accepted_at,
    'pickupConfirmedAt', o.pickup_confirmed_at,
    'deliveryCompletedAt', COALESCE(o.feeder_delivery_completed_at, CASE WHEN o.order_status = 'delivered' THEN o.updated_at ELSE NULL END),
    'cleanPayVerified', o.order_status = 'delivered' AND (o.feeder_clean_pay_verified OR o.feeder_final_payout_cents IS NOT NULL),
    'flowStage', v_stage,
    'nextStepHint', v_next_hint,
    'cancellationPayCents', o.feeder_cancellation_pay_cents,
    'snapshot', v_snap
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_feeder_clean_pay_offer_acceptance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_feeder_clean_pay_adjustment_at_pickup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feeder_clean_pay_summary(uuid, text) TO authenticated;
