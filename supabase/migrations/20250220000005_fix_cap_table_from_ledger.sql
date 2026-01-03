-- Fix cap table by recalculating from actual equity_ledger grants
-- This ensures total_issued and total_unissued match the actual grants
-- IMPORTANT: Trust shares (55M) and Founder shares (18M) are ALREADY ISSUED and NOT in equity_ledger
-- So we need to add those to the ledger grants to get the correct total_issued

DO $$
DECLARE
  cap_table_id UUID;
  cap_table_authorized BIGINT;
  trust_shares_val BIGINT;
  founder_shares_val BIGINT;
  grants_from_ledger BIGINT;
  total_issued_calculated BIGINT;
  total_unissued_calculated BIGINT;
BEGIN
  -- Get the cap table data
  SELECT 
    id, 
    total_authorized, 
    trust_shares, 
    founder_shares
  INTO 
    cap_table_id,
    cap_table_authorized,
    trust_shares_val,
    founder_shares_val
  FROM public.cap_tables
  LIMIT 1;

  IF cap_table_id IS NULL THEN
    RAISE EXCEPTION 'No cap table found';
  END IF;

  -- Calculate total grants from equity_ledger (these are NEW grants, not trust/founder)
  SELECT COALESCE(SUM(shares_amount), 0) INTO grants_from_ledger
  FROM public.equity_ledger
  WHERE transaction_type = 'grant';

  -- Total issued = Trust shares (already issued) + Founder shares (already issued) + Grants from ledger
  total_issued_calculated := COALESCE(trust_shares_val, 0) + COALESCE(founder_shares_val, 0) + grants_from_ledger;

  -- Total unissued = Authorized - Total Issued
  total_unissued_calculated := cap_table_authorized - total_issued_calculated;

  RAISE NOTICE 'Cap table recalculation:';
  RAISE NOTICE '  Total authorized: %', cap_table_authorized;
  RAISE NOTICE '  Trust shares (already issued): %', trust_shares_val;
  RAISE NOTICE '  Founder shares (already issued): %', founder_shares_val;
  RAISE NOTICE '  Grants from ledger: %', grants_from_ledger;
  RAISE NOTICE '  Total issued (calculated): %', total_issued_calculated;
  RAISE NOTICE '  Total unissued (calculated): %', total_unissued_calculated;

  -- Update cap table with correct values
  UPDATE public.cap_tables
  SET 
    total_issued = total_issued_calculated,
    total_unissued = total_unissued_calculated,
    updated_at = NOW()
  WHERE id = cap_table_id;

  RAISE NOTICE 'Cap table updated successfully';
END $$;

