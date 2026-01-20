-- Admin helper function for promo usage statistics

CREATE OR REPLACE FUNCTION public.get_promo_usage_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_today_count INTEGER;
  v_today_credit_cents INTEGER;
  v_total_count INTEGER;
  v_total_credit_cents INTEGER;
BEGIN
  -- Today's redemptions
  SELECT 
    COUNT(*),
    COALESCE(SUM(credit_cents), 0)
  INTO v_today_count, v_today_credit_cents
  FROM public.promo_ledger
  WHERE event_type = 'REDEEMED'
    AND DATE(created_at) = v_today;

  -- Total redemptions
  SELECT 
    COUNT(*),
    COALESCE(SUM(credit_cents), 0)
  INTO v_total_count, v_total_credit_cents
  FROM public.promo_ledger
  WHERE event_type = 'REDEEMED';

  RETURN jsonb_build_object(
    'today_count', v_today_count,
    'today_credit_cents', v_today_credit_cents,
    'total_count', v_total_count,
    'total_credit_cents', v_total_credit_cents
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_promo_usage_stats() TO authenticated;












