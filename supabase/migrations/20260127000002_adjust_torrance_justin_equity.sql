-- Adjust equity for Torrance Stroman and Justin Sweet
-- Torrance: 18M → 10.5M shares (reduction of 7.5M)
-- Justin: 5M → 4.2M shares (reduction of 800K)
-- Total reduction: 8.3M shares returned to equity pool

DO $$
DECLARE
  torrance_user_id UUID;
  justin_user_id UUID;
  old_torrance_shares BIGINT;
  old_justin_shares BIGINT;
  shares_returned BIGINT := 0;
  current_pool BIGINT;
BEGIN
  -- Find user IDs
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    RAISE EXCEPTION 'Torrance Stroman user not found';
  END IF;

  IF justin_user_id IS NULL THEN
    RAISE EXCEPTION 'Justin Sweet user not found';
  END IF;

  RAISE NOTICE 'Found Torrance: %, Justin: %', torrance_user_id, justin_user_id;

  -- ========================================
  -- STEP 1: Update Torrance Stroman (employee_equity)
  -- ========================================
  
  -- Get old shares count
  SELECT shares_total INTO old_torrance_shares
  FROM public.employee_equity
  WHERE employee_id = (
    SELECT id FROM public.employees 
    WHERE user_id = torrance_user_id 
    LIMIT 1
  )
  LIMIT 1;

  IF old_torrance_shares IS NULL THEN
    RAISE NOTICE 'Torrance equity record not found in employee_equity, checking by shareholder_name';
    
    SELECT shares_total INTO old_torrance_shares
    FROM public.employee_equity
    WHERE shareholder_name ILIKE '%Torrance%Stroman%'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Torrance old shares: %', old_torrance_shares;

  -- Update Torrance's equity in employee_equity
  UPDATE public.employee_equity
  SET 
    shares_total = 10500000,
    shares_percentage = ROUND((10500000::NUMERIC / 70000000::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE employee_id = (
    SELECT id FROM public.employees 
    WHERE user_id = torrance_user_id 
    LIMIT 1
  );

  -- Also update if found by shareholder_name
  UPDATE public.employee_equity
  SET 
    shares_total = 10500000,
    shares_percentage = ROUND((10500000::NUMERIC / 70000000::NUMERIC * 100), 2),
    updated_at = NOW()
  WHERE shareholder_name ILIKE '%Torrance%Stroman%';

  IF old_torrance_shares IS NOT NULL AND old_torrance_shares > 10500000 THEN
    shares_returned := shares_returned + (old_torrance_shares - 10500000);
    RAISE NOTICE 'Torrance: % shares returned to pool', (old_torrance_shares - 10500000);
  END IF;

  -- ========================================
  -- STEP 2: Update Justin Sweet (equity_ledger and vesting_schedules)
  -- ========================================
  
  -- Get old shares count from equity_ledger
  SELECT shares_amount INTO old_justin_shares
  FROM public.equity_ledger
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4500000
  ORDER BY transaction_date DESC
  LIMIT 1;

  RAISE NOTICE 'Justin old shares: %', old_justin_shares;

  -- Update Justin's vesting schedule
  UPDATE public.vesting_schedules
  SET 
    total_shares = 4200000,
    vested_shares = 4200000,
    unvested_shares = 0,
    vesting_schedule = jsonb_build_array(
      jsonb_build_object(
        'date', CURRENT_DATE,
        'shares', 4200000,
        'vested', true
      )
    ),
    updated_at = NOW()
  WHERE recipient_user_id = justin_user_id;

  -- Update Justin's equity_ledger entry
  UPDATE public.equity_ledger
  SET 
    shares_amount = 4200000,
    notes = 'Equity adjusted: 4,200,000 shares to Justin Sweet (CFO), immediate vesting',
    updated_at = NOW()
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4500000;

  IF old_justin_shares IS NOT NULL AND old_justin_shares > 4200000 THEN
    shares_returned := shares_returned + (old_justin_shares - 4200000);
    RAISE NOTICE 'Justin: % shares returned to pool', (old_justin_shares - 4200000);
  END IF;

  -- ========================================
  -- STEP 3: Update cap_tables
  -- ========================================
  
  -- Get current equity pool
  SELECT equity_pool INTO current_pool
  FROM public.cap_tables
  LIMIT 1;

  RAISE NOTICE 'Current equity pool: %, shares returned: %', current_pool, shares_returned;

  -- Update cap_tables with new allocation
  UPDATE public.cap_tables
  SET 
    founder_shares = 10500000,  -- Torrance's new allocation
    founder_percentage = ROUND((10500000::NUMERIC / 70000000::NUMERIC * 100), 2),
    equity_pool = COALESCE(current_pool, 0) + shares_returned,  -- Return freed shares to pool
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
    'user',
    torrance_user_id,
    'Adjusted Torrance Stroman equity from 18M to 10.5M shares',
    jsonb_build_object(
      'old_shares', old_torrance_shares,
      'new_shares', 10500000,
      'shares_returned', old_torrance_shares - 10500000,
      'action_category', 'equity'
    )
  );

  INSERT INTO public.governance_logs (
    action,
    entity_type,
    entity_id,
    description,
    data
  ) VALUES (
    'equity_adjusted',
    'user',
    justin_user_id,
    'Adjusted Justin Sweet equity from 5M to 4.2M shares',
    jsonb_build_object(
      'old_shares', old_justin_shares,
      'new_shares', 4200000,
      'shares_returned', old_justin_shares - 4200000,
      'action_category', 'equity'
    )
  );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Equity adjustment completed successfully';
  RAISE NOTICE 'Torrance: 18M → 10.5M (returned % shares)', (old_torrance_shares - 10500000);
  RAISE NOTICE 'Justin: 5M → 4.2M (returned % shares)', (old_justin_shares - 4200000);
  RAISE NOTICE 'Total shares returned to pool: %', shares_returned;
  RAISE NOTICE '============================================';
END $$;

-- Verify the changes
SELECT 
  'Torrance Stroman' as name,
  shares_total as shares,
  shares_percentage as percentage,
  '(employee_equity)' as source
FROM public.employee_equity
WHERE shareholder_name ILIKE '%Torrance%Stroman%'
   OR employee_id = (
     SELECT id FROM public.employees 
     WHERE user_id = (
       SELECT id FROM auth.users 
       WHERE email = 'tstroman.ceo@cravenusa.com' 
       LIMIT 1
     ) 
     LIMIT 1
   )
UNION ALL
SELECT 
  'Justin Sweet' as name,
  shares_amount as shares,
  ROUND((shares_amount::NUMERIC / 70000000::NUMERIC * 100), 2) as percentage,
  '(equity_ledger)' as source
FROM public.equity_ledger
WHERE recipient_user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'jsweet.cfo@cravenusa.com' 
  LIMIT 1
)
AND transaction_type = 'grant'
ORDER BY shares DESC;

-- Verify cap_tables
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares,
  founder_shares,
  equity_pool,
  trust_percentage,
  founder_percentage,
  pool_percentage
FROM public.cap_tables
LIMIT 1;











