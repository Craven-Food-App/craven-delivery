-- Unified final feeder earnings: delivery pay + mileage + tip + promo + adjustment (single total).

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
  v_earn_amount integer;
  v_earn_tip integer;
  v_uid uuid := auth.uid();
  v_feeder uuid;
  v_next_hint text;
  v_mileage integer;
  v_delivery_pay integer;
  v_unified_final integer;
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
  v_mileage := COALESCE(o.mileage_pay_cents, 0);

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

  SELECT de.amount_cents, de.tip_cents, de.total_cents
  INTO v_earn_amount, v_earn_tip, v_earn_total
  FROM public.driver_earnings de
  WHERE de.order_id = p_order_id
    AND (v_feeder IS NULL OR de.driver_id = v_feeder)
  ORDER BY de.earned_at DESC NULLS LAST
  LIMIT 1;

  v_delivery_pay := COALESCE(
    v_earn_amount,
    v_live_before,
    GREATEST(v_base, v_delivery_share),
    0
  );

  v_unified_final :=
    v_delivery_pay
    + v_mileage
    + COALESCE(o.tip_cents, v_tip, 0)
    + v_promo
    + COALESCE(v_adj, 0);

  v_expected_final := v_unified_final;

  IF o.order_status = 'delivered' OR v_stage = 'completed' THEN
    v_final := COALESCE(v_earn_total, o.feeder_final_payout_cents, v_unified_final);
    IF v_earn_total IS NOT NULL AND v_mileage > 0 AND v_earn_total < v_unified_final THEN
      v_final := v_unified_final;
    END IF;
  ELSE
    v_final := o.feeder_final_payout_cents;
    IF v_final IS NULL THEN
      v_final := v_earn_total;
    END IF;
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
    'deliveryPayCents', v_delivery_pay,
    'mileagePayCents', v_mileage,
    'customerTipCents', COALESCE(o.tip_cents, v_tip, 0),
    'promoBonusCents', v_promo,
    'adjustmentCents', COALESCE(v_adj, 0),
    'totalGuaranteedCents', v_locked_total,
    'originalAcceptedOfferCents', CASE WHEN o.feeder_offer_accepted_at IS NOT NULL THEN v_locked_total ELSE NULL END,
    'expectedFinalPayoutCents', v_expected_final,
    'finalPayoutCents', v_final,
    'unifiedFinalPayoutCents', v_unified_final,
    'tipStatus', v_tip_label,
    'payoutStatus', v_payout_label,
    'cleanPayStatusLabel', v_pay_label,
    'adjustmentReason', v_adj_reason,
    'offerLockedAt', o.feeder_offer_locked_at,
    'offerAcceptedAt', o.feeder_offer_accepted_at,
    'pickupConfirmedAt', o.pickup_confirmed_at,
    'deliveryCompletedAt', COALESCE(o.feeder_delivery_completed_at, CASE WHEN o.order_status = 'delivered' THEN o.updated_at ELSE NULL END),
    'cleanPayVerified',
      o.order_status = 'delivered'
      AND (
        o.feeder_clean_pay_verified
        OR o.feeder_final_payout_cents IS NOT NULL
        OR v_earn_total IS NOT NULL
      )
      AND ABS(COALESCE(v_final, 0) - v_unified_final) <= 2,
    'flowStage', v_stage,
    'nextStepHint', v_next_hint,
    'cancellationPayCents', o.feeder_cancellation_pay_cents,
    'snapshot', v_snap
  );
END;
$$;
