-- ==============================================================================
-- CREATE TIER CALCULATION FUNCTION
-- ==============================================================================
-- Calculates equity percentage and shares based on contribution amount
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_foundational_tier(
  p_amount_cents INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_amount_dollars NUMERIC;
  v_equity_percentage NUMERIC(5,2);
  v_tier_name TEXT;
  v_total_authorized BIGINT := 70000000; -- 70M shares
  v_shares BIGINT;
BEGIN
  v_amount_dollars := p_amount_cents / 100.0;

  -- Determine tier based on amount
  IF v_amount_dollars >= 500 THEN
    v_equity_percentage := 1.0;
    v_tier_name := 'Founder''s Circle';
  ELSIF v_amount_dollars >= 250 THEN
    v_equity_percentage := 0.8;
    v_tier_name := 'Executive Tier';
  ELSIF v_amount_dollars >= 100 THEN
    v_equity_percentage := 0.6;
    v_tier_name := 'Partner Tier';
  ELSE
    v_equity_percentage := 0.2;
    v_tier_name := 'Supporter Tier';
  END IF;

  -- Calculate shares
  v_shares := FLOOR((v_equity_percentage / 100.0) * v_total_authorized);

  RETURN jsonb_build_object(
    'equity_percentage', v_equity_percentage,
    'tier_name', v_tier_name,
    'shares', v_shares,
    'amount_dollars', v_amount_dollars
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_foundational_tier(INTEGER) TO authenticated, anon;

-- Comment
COMMENT ON FUNCTION public.calculate_foundational_tier IS 
  'Calculates equity tier, percentage, and shares for foundational invite contribution amount. 
   Returns JSONB with tier_name, equity_percentage, shares, and amount_dollars.';

