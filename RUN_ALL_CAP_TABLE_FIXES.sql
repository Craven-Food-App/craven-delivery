-- ==============================================================================
-- COMPLETE CAP TABLE FIX - Run this entire file in Supabase SQL Editor
-- ==============================================================================
-- This will:
-- 1. Update cap table to 70M authorized shares
-- 2. Adjust Torrance Stroman: 18M → 10.5M shares
-- 3. Adjust Justin Sweet: 5M → 4.2M shares  
-- 4. Rename Trust to Invero, Inc.: 55M → 40.6M shares
-- 5. Return 22.7M shares to equity pool
-- ==============================================================================

DO $$
DECLARE
  torrance_user_id UUID;
  justin_user_id UUID;
  old_torrance_shares BIGINT;
  old_justin_shares BIGINT;
  old_trust_shares BIGINT;
  total_shares_returned BIGINT := 0;
  new_holding_percentage NUMERIC;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Starting Complete Cap Table Restructuring';
  RAISE NOTICE '============================================';

  -- Get user IDs
  SELECT id INTO torrance_user_id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com' LIMIT 1;
  SELECT id INTO justin_user_id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1;

  IF torrance_user_id IS NULL THEN RAISE EXCEPTION 'Torrance user not found'; END IF;
  IF justin_user_id IS NULL THEN RAISE EXCEPTION 'Justin user not found'; END IF;

  -- ==========================================
  -- STEP 1: Update Invero, Inc. (formerly Trust)
  -- ==========================================
  
  SELECT shares_total INTO old_trust_shares
  FROM public.employee_equity
  WHERE shareholder_name ILIKE '%Invero%Business%Trust%'
     OR shareholder_name ILIKE '%Trust%'
     OR (shareholder_type = 'trust' AND is_majority_shareholder = true)
  LIMIT 1;

  RAISE NOTICE 'Old Trust/Invero Inc shares: %', old_trust_shares;

  new_holding_percentage := ROUND((40600000::NUMERIC / 70000000::NUMERIC * 100), 2);

  UPDATE public.employee_equity
  SET 
    shareholder_name = 'Invero, Inc.',
    shareholder_type = 'entity',
    shares_total = 40600000,
    shares_percentage = new_holding_percentage,
    is_majority_shareholder = true,
    updated_at = NOW()
  WHERE shareholder_name ILIKE '%Invero%Business%Trust%'
     OR shareholder_name ILIKE '%Trust%'
     OR (shareholder_type = 'trust' AND is_majority_shareholder = true);

  IF old_trust_shares IS NOT NULL AND old_trust_shares > 40600000 THEN
    total_shares_returned := total_shares_returned + (old_trust_shares - 40600000);
    RAISE NOTICE 'Invero Inc: % shares returned (55M → 40.6M)', (old_trust_shares - 40600000);
  END IF;

  -- ==========================================
  -- STEP 2: Update Torrance Stroman
  -- ==========================================
  
  SELECT shares_total INTO old_torrance_shares
  FROM public.employee_equity
  WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = torrance_user_id LIMIT 1)
  LIMIT 1;

  IF old_torrance_shares IS NULL THEN
    SELECT shares_total INTO old_torrance_shares
    FROM public.employee_equity
    WHERE shareholder_name ILIKE '%Torrance%Stroman%'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Old Torrance shares: %', old_torrance_shares;

  UPDATE public.employee_equity
  SET 
    shares_total = 10500000,
    shares_percentage = ROUND((10500000::NUMERIC / 70000000::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = torrance_user_id LIMIT 1)
     OR shareholder_name ILIKE '%Torrance%Stroman%';

  IF old_torrance_shares IS NOT NULL AND old_torrance_shares > 10500000 THEN
    total_shares_returned := total_shares_returned + (old_torrance_shares - 10500000);
    RAISE NOTICE 'Torrance: % shares returned (18M → 10.5M)', (old_torrance_shares - 10500000);
  END IF;

  -- ==========================================
  -- STEP 3: Update Justin Sweet
  -- ==========================================
  
  SELECT shares_amount INTO old_justin_shares
  FROM public.equity_ledger
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4500000
  ORDER BY transaction_date DESC
  LIMIT 1;

  RAISE NOTICE 'Old Justin shares: %', old_justin_shares;

  UPDATE public.vesting_schedules
  SET 
    total_shares = 4200000,
    vested_shares = 4200000,
    unvested_shares = 0,
    vesting_schedule = jsonb_build_array(
      jsonb_build_object('date', CURRENT_DATE, 'shares', 4200000, 'vested', true)
    ),
    updated_at = NOW()
  WHERE recipient_user_id = justin_user_id;

  UPDATE public.equity_ledger
  SET 
    shares_amount = 4200000,
    notes = 'Equity adjusted: 4,200,000 shares to Justin Sweet (CFO), immediate vesting',
    updated_at = NOW()
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4500000;

  IF old_justin_shares IS NOT NULL AND old_justin_shares > 4200000 THEN
    total_shares_returned := total_shares_returned + (old_justin_shares - 4200000);
    RAISE NOTICE 'Justin: % shares returned (5M → 4.2M)', (old_justin_shares - 4200000);
  END IF;

  -- ==========================================
  -- STEP 4: Update cap_tables
  -- ==========================================
  
  RAISE NOTICE 'Total shares returned to pool: %', total_shares_returned;

  UPDATE public.cap_tables
  SET 
    total_authorized = 70000000,
    trust_shares = 40600000,
    founder_shares = 10500000,
    trust_percentage = new_holding_percentage,
    founder_percentage = ROUND((10500000::NUMERIC / 70000000::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

  -- Recalculate total_issued from actual grants
  UPDATE public.cap_tables
  SET 
    total_issued = COALESCE(trust_shares, 0) + COALESCE(founder_shares, 0) + 
                   (SELECT COALESCE(SUM(shares_amount), 0) 
                    FROM public.equity_ledger 
                    WHERE transaction_type = 'grant'),
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

  -- Recalculate equity pool and unissued
  UPDATE public.cap_tables
  SET 
    equity_pool = total_authorized - total_issued,
    total_unissued = total_authorized - total_issued,
    pool_percentage = ROUND(((total_authorized - total_issued)::NUMERIC / total_authorized::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.cap_tables LIMIT 1);

  -- Update trusts table if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trusts') THEN
    UPDATE public.trusts
    SET name = 'Invero, Inc.', type = 'Corporate Entity', updated_at = NOW()
    WHERE name ILIKE '%Invero%Business%Trust%' OR name ILIKE '%Trust%';
  END IF;

  -- ==========================================
  -- STEP 5: Log changes
  -- ==========================================
  
  INSERT INTO public.governance_logs (action, entity_type, entity_id, description, data)
  VALUES 
    ('cap_table_restructured', 'cap_table', 
     (SELECT id FROM public.cap_tables LIMIT 1), 
     'Complete cap table restructure to 70M shares',
     jsonb_build_object(
       'total_authorized', 70000000,
       'trust_to_holding', 'Invero Business Trust → Invero, Inc.',
       'holding_shares', 40600000,
       'torrance_shares', 10500000,
       'justin_shares', 4200000,
       'shares_returned', total_shares_returned,
       'action_category', 'equity'
     ));

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cap Table Restructure COMPLETE';
  RAISE NOTICE 'Invero, Inc. (Holding): 40.6M shares (58%%)';
  RAISE NOTICE 'Torrance Stroman: 10.5M shares (15%%)';
  RAISE NOTICE 'Justin Sweet: 4.2M shares (6%%)';
  RAISE NOTICE 'Total shares returned: % (~23M)', total_shares_returned;
  RAISE NOTICE '============================================';
END $$;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Show final cap table
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares as invero_inc_shares,
  founder_shares as torrance_shares,
  equity_pool,
  trust_percentage as invero_inc_percentage,
  founder_percentage as torrance_percentage,
  pool_percentage
FROM public.cap_tables
LIMIT 1;

-- Show all shareholders
SELECT 
  COALESCE(shareholder_name, e.first_name || ' ' || e.last_name) as name,
  eq.shares_total as shares,
  eq.shares_percentage as percentage,
  eq.shareholder_type as type
FROM public.employee_equity eq
LEFT JOIN public.employees e ON eq.employee_id = e.id
WHERE eq.shares_total > 0
ORDER BY eq.shares_percentage DESC;

-- Show Justin from ledger
SELECT 
  'Justin Sweet' as name,
  shares_amount as shares,
  ROUND((shares_amount::NUMERIC / 70000000::NUMERIC * 100), 2) as percentage,
  '(equity_ledger)' as source
FROM public.equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1)
  AND transaction_type = 'grant';

