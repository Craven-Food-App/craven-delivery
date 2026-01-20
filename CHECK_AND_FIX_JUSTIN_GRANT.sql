-- CHECK AND FIX JUSTIN SWEET'S 5M GRANT
-- Run this in Supabase SQL Editor

-- Step 1: Check if Justin's grant exists in equity_ledger
SELECT 
  'JUSTIN GRANT IN EQUITY_LEDGER' as check_type,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date
FROM equity_ledger el
LEFT JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND el.shares_amount >= 4500000
  AND el.shares_amount <= 5500000
  AND (u.email = 'jsweet.cfo@cravenusa.com' OR el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com'
  ));

-- Step 2: Check if Justin's grant exists in equity_grants
SELECT 
  'JUSTIN GRANT IN EQUITY_GRANTS' as check_type,
  eg.id,
  eg.shares_total,
  eg.executive_id,
  eg.employee_id,
  eg.status
FROM equity_grants eg
WHERE eg.shares_total >= 4500000
  AND eg.shares_total <= 5500000;

-- Step 3: Get Justin's user_id
SELECT 
  'JUSTIN USER ID' as info,
  u.id as user_id,
  u.email
FROM auth.users u
WHERE u.email = 'jsweet.cfo@cravenusa.com';

-- Step 4: Create Justin's 5M grant if it doesn't exist
DO $$
DECLARE
  justin_user_id UUID;
  justin_exec_id UUID;
  justin_vesting_id UUID;
  existing_ledger_id UUID;
BEGIN
  -- Get Justin's user_id
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NULL THEN
    RAISE NOTICE 'Justin Sweet user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Justin user_id: %', justin_user_id;

  -- Check if grant already exists in ledger
  SELECT id INTO existing_ledger_id
  FROM equity_ledger
  WHERE recipient_user_id = justin_user_id
    AND transaction_type = 'grant'
    AND shares_amount >= 4500000
    AND shares_amount <= 5500000
  LIMIT 1;

  IF existing_ledger_id IS NOT NULL THEN
    RAISE NOTICE 'Justin''s grant already exists in equity_ledger: %', existing_ledger_id;
    RETURN;
  END IF;

  -- Get Justin's exec_user id
  SELECT id INTO justin_exec_id
  FROM exec_users
  WHERE user_id = justin_user_id
  LIMIT 1;

  -- Create vesting schedule
  INSERT INTO vesting_schedules (
    recipient_user_id,
    total_shares,
    vesting_type,
    cliff_months,
    vesting_period_months,
    vesting_schedule,
    start_date,
    end_date,
    vested_shares,
    unvested_shares
  ) VALUES (
    justin_user_id,
    5000000,
    'immediate',
    0,
    0,
    jsonb_build_array(
      jsonb_build_object('date', CURRENT_DATE, 'shares', 5000000, 'vested', true)
    ),
    CURRENT_DATE,
    CURRENT_DATE,
    5000000,
    0
  ) RETURNING id INTO justin_vesting_id;

  RAISE NOTICE 'Created vesting schedule: %', justin_vesting_id;

  -- Create equity ledger entry
  INSERT INTO equity_ledger (
    transaction_type,
    recipient_user_id,
    shares_amount,
    share_class,
    price_per_share,
    transaction_date,
    effective_date,
    grant_id,
    notes
  ) VALUES (
    'grant',
    justin_user_id,
    5000000,
    'Common',
    0.0001,
    CURRENT_DATE,
    CURRENT_DATE,
    justin_vesting_id,
    'Equity grant: 5,000,000 shares to Justin Sweet (CFO), immediate vesting'
  );

  RAISE NOTICE 'Created equity ledger entry for Justin''s 5M grant';
END $$;

-- Step 5: Verify the grant was created
SELECT 
  'VERIFICATION' as info,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date
FROM equity_ledger el
LEFT JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND el.shares_amount >= 4500000
  AND el.shares_amount <= 5500000
  AND u.email = 'jsweet.cfo@cravenusa.com';

-- Step 6: Fix cap table (exclude Torrance's 18M from ledger calculation)
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- Only count Justin's 5M grant, exclude Torrance's 18M (already in founder_shares)
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger el
     INNER JOIN auth.users u ON u.id = el.recipient_user_id
     WHERE el.transaction_type = 'grant'
       AND u.email = 'jsweet.cfo@cravenusa.com'
       AND el.shares_amount >= 4500000
       AND el.shares_amount <= 5500000
    )
  ),
  total_unissued = (
    total_authorized - 
    (COALESCE(trust_shares, 0) + 
     COALESCE(founder_shares, 0) + 
     (SELECT COALESCE(SUM(shares_amount), 0) 
      FROM equity_ledger el
      INNER JOIN auth.users u ON u.id = el.recipient_user_id
      WHERE el.transaction_type = 'grant'
        AND u.email = 'jsweet.cfo@cravenusa.com'
        AND el.shares_amount >= 4500000
        AND el.shares_amount <= 5500000
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Step 7: Show final cap table
SELECT 
  'FINAL CAP TABLE' as info,
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) 
   FROM equity_ledger el
   INNER JOIN auth.users u ON u.id = el.recipient_user_id
   WHERE el.transaction_type = 'grant'
     AND u.email = 'jsweet.cfo@cravenusa.com'
     AND el.shares_amount >= 4500000
     AND el.shares_amount <= 5500000
  ) as justin_grant,
  total_issued,
  total_unissued
FROM cap_tables
LIMIT 1;















































