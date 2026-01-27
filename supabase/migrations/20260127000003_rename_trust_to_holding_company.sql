-- Rename "Invero Business Trust" to "Holding Company" and adjust shares
-- Trust/Holding Company: 55,000,000 → 40,600,000 shares (-14,400,000)
-- Total cap table: 70,000,000 shares
-- 14.4M shares returned to equity pool

DO $$
DECLARE
  old_trust_shares BIGINT;
  shares_returned BIGINT := 0;
  current_pool BIGINT;
  new_percentage NUMERIC;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Starting Trust → Holding Company migration';
  RAISE NOTICE '============================================';

  -- ========================================
  -- STEP 1: Update employee_equity
  -- ========================================
  
  -- Get old shares count
  SELECT shares_total INTO old_trust_shares
  FROM public.employee_equity
  WHERE shareholder_name ILIKE '%Invero%Business%Trust%'
     OR shareholder_name ILIKE '%Trust%'
  LIMIT 1;

  RAISE NOTICE 'Old trust shares: %', old_trust_shares;

  -- Calculate new percentage (40.6M / 70M)
  new_percentage := ROUND((40600000::NUMERIC / 70000000::NUMERIC * 100), 2);

  -- Update the trust record to Holding Company
  UPDATE public.employee_equity
  SET 
    shareholder_name = 'Holding Company',
    shareholder_type = 'entity',  -- Changed from 'trust' to 'entity'
    shares_total = 40600000,
    shares_percentage = new_percentage,
    is_majority_shareholder = true,  -- Still majority at 58%
    updated_at = NOW()
  WHERE shareholder_name ILIKE '%Invero%Business%Trust%'
     OR shareholder_name ILIKE '%Trust%'
     OR (shareholder_type = 'trust' AND is_majority_shareholder = true);

  -- Calculate shares returned
  IF old_trust_shares IS NOT NULL AND old_trust_shares > 40600000 THEN
    shares_returned := old_trust_shares - 40600000;
    RAISE NOTICE 'Trust/Holding Company: % shares returned to pool', shares_returned;
  END IF;

  -- ========================================
  -- STEP 2: Update cap_tables
  -- ========================================
  
  -- Get current equity pool
  SELECT equity_pool INTO current_pool
  FROM public.cap_tables
  LIMIT 1;

  RAISE NOTICE 'Current equity pool: %, shares returned: %', current_pool, shares_returned;

  -- Update cap_tables with new allocation
  -- Note: trust_shares column still exists but now represents Holding Company shares
  UPDATE public.cap_tables
  SET 
    trust_shares = 40600000,  -- Holding Company shares (was 55M)
    trust_percentage = new_percentage,
    equity_pool = COALESCE(current_pool, 0) + shares_returned,  -- Add 14.4M to pool
    pool_percentage = ROUND(((COALESCE(current_pool, 0) + shares_returned)::NUMERIC / 70000000::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

  -- Recalculate total_issued and total_unissued
  UPDATE public.cap_tables
  SET 
    total_issued = COALESCE(trust_shares, 0) + COALESCE(founder_shares, 0) + 
                   (SELECT COALESCE(SUM(shares_amount), 0) 
                    FROM public.equity_ledger 
                    WHERE transaction_type = 'grant'),
    total_unissued = total_authorized - total_issued,
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

  -- ========================================
  -- STEP 3: Update trusts table (if exists)
  -- ========================================
  
  UPDATE public.trusts
  SET 
    name = 'Holding Company',
    type = 'Corporate Entity',
    updated_at = NOW()
  WHERE name ILIKE '%Invero%Business%Trust%'
     OR name ILIKE '%Trust%';

  -- ========================================
  -- STEP 4: Log the changes
  -- ========================================
  
  INSERT INTO public.governance_logs (
    action,
    entity_type,
    entity_id,
    description,
    data
  ) VALUES (
    'equity_adjusted',
    'entity',
    (SELECT id FROM public.employee_equity WHERE shareholder_name = 'Holding Company' LIMIT 1),
    'Renamed Trust to Holding Company and adjusted equity from 55M to 40.6M shares',
    jsonb_build_object(
      'old_name', 'Invero Business Trust',
      'new_name', 'Holding Company',
      'old_shares', old_trust_shares,
      'new_shares', 40600000,
      'shares_returned', shares_returned,
      'old_percentage', ROUND((old_trust_shares::NUMERIC / 70000000::NUMERIC * 100), 2),
      'new_percentage', new_percentage,
      'action_category', 'equity'
    )
  );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Trust → Holding Company';
  RAISE NOTICE '55M → 40.6M shares (returned % to pool)', shares_returned;
  RAISE NOTICE 'New percentage: %%', new_percentage;
  RAISE NOTICE '============================================';
END $$;

-- ========================================
-- STEP 5: Add column comments for clarity
-- ========================================

COMMENT ON COLUMN public.cap_tables.trust_shares IS 
  'Shares held by the Holding Company (formerly Invero Business Trust). Historical column name retained for compatibility.';

COMMENT ON COLUMN public.cap_tables.trust_percentage IS 
  'Percentage held by the Holding Company (formerly Invero Business Trust). Historical column name retained for compatibility.';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify Holding Company equity
SELECT 
  'Holding Company' as entity,
  shareholder_name,
  shares_total as shares,
  shares_percentage as percentage,
  shareholder_type,
  is_majority_shareholder,
  '(employee_equity)' as source
FROM public.employee_equity
WHERE shareholder_name = 'Holding Company'
   OR shareholder_name ILIKE '%Holding%Company%';

-- Verify cap table
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares as holding_company_shares,
  founder_shares,
  equity_pool,
  trust_percentage as holding_company_percentage,
  founder_percentage,
  pool_percentage
FROM public.cap_tables
LIMIT 1;

-- Show all shareholders
SELECT 
  COALESCE(shareholder_name, e.first_name || ' ' || e.last_name) as name,
  eq.shares_total as shares,
  eq.shares_percentage as percentage,
  eq.shareholder_type as type,
  CASE 
    WHEN eq.shareholder_name IS NOT NULL THEN '(Non-employee)'
    ELSE '(Employee)'
  END as category
FROM public.employee_equity eq
LEFT JOIN public.employees e ON eq.employee_id = e.id
ORDER BY eq.shares_percentage DESC;

