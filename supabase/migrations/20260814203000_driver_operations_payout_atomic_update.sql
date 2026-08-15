-- Driver Operations: make payout configuration one atomic source of truth.
CREATE OR REPLACE FUNCTION public.set_active_driver_payout_settings(
  p_base_pay_cents integer,
  p_delivery_fee_share_bps integer
)
RETURNS public.driver_payout_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.driver_payout_settings;
  v_tips_pass_through boolean;
  v_merchant_commission_bps integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_base_pay_cents < 0 OR p_delivery_fee_share_bps < 0 OR p_delivery_fee_share_bps > 10000 THEN
    RAISE EXCEPTION 'Invalid payout settings';
  END IF;

  -- Carry forward the settings this function does not manage. Without this,
  -- saving driver pay would reset them to their column defaults.
  SELECT s.tips_pass_through, s.merchant_commission_bps
    INTO v_tips_pass_through, v_merchant_commission_bps
    FROM public.driver_payout_settings s
   WHERE s.is_active = true
   ORDER BY s.updated_at DESC
   LIMIT 1;

  UPDATE public.driver_payout_settings
  SET is_active = false,
      updated_at = now()
  WHERE is_active = true;

  INSERT INTO public.driver_payout_settings (
    driver_base_pay_cents,
    driver_delivery_fee_share_bps,
    percentage,
    is_active,
    updated_by,
    tips_pass_through,
    merchant_commission_bps
  )
  VALUES (
    p_base_pay_cents,
    p_delivery_fee_share_bps,
    p_delivery_fee_share_bps::numeric / 100,
    true,
    auth.uid(),
    COALESCE(v_tips_pass_through, true),
    COALESCE(v_merchant_commission_bps, 1500)
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_driver_payout_settings(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_driver_payout_settings(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_active_driver_payout_settings(integer, integer) TO authenticated;
