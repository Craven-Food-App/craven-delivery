-- ==============================================================================
-- UPDATE FOUNDATIONAL TIER STRUCTURE
-- ==============================================================================
-- New tier structure with fixed share amounts:
-- Tier 1: $50-$99   → 1,000 shares at 0.0014%
-- Tier 2: $100-$249 → 2,500 shares at 0.0036%
-- Tier 3: $250-$499  → 7,500 shares at 0.0107%
-- Tier 4: $500+      → 15,000 shares at 0.0214%
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
  v_equity_percentage NUMERIC(10,6);
  v_tier_name TEXT;
  v_total_authorized BIGINT := 70000000; -- 70M shares
  v_shares BIGINT;
BEGIN
  v_amount_dollars := p_amount_cents / 100.0;

  -- Determine tier based on amount with fixed share amounts
  IF v_amount_dollars >= 500 THEN
    -- Tier 4: $500+ → 15,000 shares at 0.0214%
    v_shares := 15000;
    v_equity_percentage := 0.021428;
    v_tier_name := 'Founder''s Circle';
  ELSIF v_amount_dollars >= 250 THEN
    -- Tier 3: $250-$499 → 7,500 shares at 0.0107%
    v_shares := 7500;
    v_equity_percentage := 0.010714;
    v_tier_name := 'Executive Tier';
  ELSIF v_amount_dollars >= 100 THEN
    -- Tier 2: $100-$249 → 2,500 shares at 0.0036%
    v_shares := 2500;
    v_equity_percentage := 0.003571;
    v_tier_name := 'Partner Tier';
  ELSE
    -- Tier 1: $50-$99 → 1,000 shares at 0.0014%
    v_shares := 1000;
    v_equity_percentage := 0.001429;
    v_tier_name := 'Supporter Tier';
  END IF;

  RETURN jsonb_build_object(
    'equity_percentage', v_equity_percentage,
    'tier_name', v_tier_name,
    'shares', v_shares,
    'amount_dollars', v_amount_dollars
  );
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.calculate_foundational_tier IS 
  'Calculates equity tier, percentage, and shares for foundational invite contribution amount.
   New structure: Tier 1 ($50-$99) = 1,000 shares, Tier 2 ($100-$249) = 2,500 shares,
   Tier 3 ($250-$499) = 7,500 shares, Tier 4 ($500+) = 15,000 shares.
   Returns JSONB with tier_name, equity_percentage, shares, and amount_dollars.';

