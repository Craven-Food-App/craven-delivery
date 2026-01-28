-- ==============================================================================
-- ADD VALIDATION TRIGGERS AND CONSTRAINTS
-- ==============================================================================
-- Enforces micro-equity pool rules at database level
-- ==============================================================================

-- 1. Trigger to validate equity_issuances on insert/update
CREATE OR REPLACE FUNCTION public.validate_micro_equity_issuance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is a micro-equity issuance, enforce strict rules
  IF NEW.issuance_context = 'family_micro_equity' THEN
    -- Must reference the micro-equity pool
    IF NEW.equity_pool_code != 'family_micro_equity_pool' THEN
      RAISE EXCEPTION 'Micro-equity issuances must use equity_pool_code="family_micro_equity_pool"';
    END IF;

    -- Must have pool ID
    IF NEW.equity_pool_id IS NULL THEN
      RAISE EXCEPTION 'Micro-equity issuances must have equity_pool_id';
    END IF;

    -- Must have NULL strike price
    IF NEW.strike_price_per_share IS NOT NULL THEN
      RAISE EXCEPTION 'Micro-equity issuances must have NULL strike_price_per_share';
    END IF;

    -- Verify pool code matches pool ID
    IF NOT EXISTS (
      SELECT 1 FROM public.equity_pools
      WHERE id = NEW.equity_pool_id
      AND pool_code = 'family_micro_equity_pool'
    ) THEN
      RAISE EXCEPTION 'equity_pool_id does not match family_micro_equity_pool';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_micro_equity_issuance ON public.equity_issuances;
CREATE TRIGGER trg_validate_micro_equity_issuance
  BEFORE INSERT OR UPDATE ON public.equity_issuances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_micro_equity_issuance();

-- 2. Trigger to prevent double processing of contribution orders
CREATE OR REPLACE FUNCTION public.prevent_double_contribution_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If order is already paid, prevent changing to paid again
  IF NEW.payment_status = 'paid' AND OLD.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Contribution order already processed (payment_status=paid)';
  END IF;

  -- If order is paid, ensure it has required fields
  IF NEW.payment_status = 'paid' THEN
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.shares_promised IS NULL OR NEW.shares_promised <= 0 THEN
      RAISE EXCEPTION 'Paid contribution orders must have shares_promised > 0';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_double_contribution_processing ON public.contribution_orders;
CREATE TRIGGER trg_prevent_double_contribution_processing
  BEFORE UPDATE ON public.contribution_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_double_contribution_processing();

-- 3. Trigger to sync equity_pool_code when equity_pool_id changes
CREATE OR REPLACE FUNCTION public.sync_equity_pool_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If pool_id is set but code is not, fetch code from pool
  IF NEW.equity_pool_id IS NOT NULL AND NEW.equity_pool_code IS NULL THEN
    SELECT pool_code INTO NEW.equity_pool_code
    FROM public.equity_pools
    WHERE id = NEW.equity_pool_id;
  END IF;

  -- If code is set but ID is not, fetch ID from pool
  IF NEW.equity_pool_code IS NOT NULL AND NEW.equity_pool_id IS NULL THEN
    SELECT id INTO NEW.equity_pool_id
    FROM public.equity_pools
    WHERE pool_code = NEW.equity_pool_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_equity_pool_code ON public.equity_issuances;
CREATE TRIGGER trg_sync_equity_pool_code
  BEFORE INSERT OR UPDATE ON public.equity_issuances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equity_pool_code();

-- 4. Function to verify pool integrity (can be called manually)
CREATE OR REPLACE FUNCTION public.verify_micro_equity_pool_integrity()
RETURNS TABLE(
  pool_code TEXT,
  total_reserved BIGINT,
  remaining_reserved BIGINT,
  total_issued BIGINT,
  expected_remaining BIGINT,
  integrity_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_pool RECORD;
  v_total_issued BIGINT;
  v_expected_remaining BIGINT;
BEGIN
  SELECT * INTO v_pool
  FROM public.equity_pools
  WHERE pool_code = 'family_micro_equity_pool';

  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'Micro-equity pool not found';
  END IF;

  -- Calculate total issued from this pool
  SELECT COALESCE(SUM(shares_issued), 0) INTO v_total_issued
  FROM public.equity_issuances
  WHERE equity_pool_code = 'family_micro_equity_pool'
    AND issuance_status = 'issued';

  -- Expected remaining = total - issued
  v_expected_remaining := v_pool.total_reserved_shares - v_total_issued;

  -- Check integrity
  RETURN QUERY
  SELECT 
    v_pool.pool_code,
    v_pool.total_reserved_shares,
    v_pool.remaining_reserved_shares,
    v_total_issued,
    v_expected_remaining,
    CASE 
      WHEN v_pool.remaining_reserved_shares = v_expected_remaining THEN 'OK'
      ELSE 'MISMATCH'
    END as integrity_status;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_micro_equity_pool_integrity() TO authenticated;

-- Comments
COMMENT ON FUNCTION public.validate_micro_equity_issuance IS 
  'Validates that micro-equity issuances comply with pool rules: must use family_micro_equity_pool, must have NULL strike_price.';

COMMENT ON FUNCTION public.prevent_double_contribution_processing IS 
  'Prevents double processing of contribution orders and ensures paid orders have required fields.';

COMMENT ON FUNCTION public.sync_equity_pool_code IS 
  'Automatically syncs equity_pool_code and equity_pool_id fields for consistency.';

COMMENT ON FUNCTION public.verify_micro_equity_pool_integrity IS 
  'Verifies that pool remaining_reserved_shares matches expected value based on total issuances. Returns integrity status.';

