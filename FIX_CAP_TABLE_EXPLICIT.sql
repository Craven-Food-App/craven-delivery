-- EXPLICIT FIX - Only count Justin's 5M grant, exclude everything else
-- This is the most direct approach: trust + founder + ONLY Justin's grant

-- Step 1: Show ALL grants first
SELECT 
  'ALL GRANTS IN LEDGER' as info,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date
FROM equity_ledger el
LEFT JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
ORDER BY el.shares_amount DESC;

-- Step 2: Get Justin's user_id
DO $$
DECLARE
  justin_user_id UUID;
  justin_grant_amount BIGINT;
BEGIN
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NOT NULL THEN
    -- Get Justin's grant amount (should be 5M)
    SELECT COALESCE(SUM(shares_amount), 0) INTO justin_grant_amount
    FROM equity_ledger
    WHERE transaction_type = 'grant'
      AND recipient_user_id = justin_user_id
      AND shares_amount >= 4500000
      AND shares_amount <= 5500000;

    RAISE NOTICE 'Justin user_id: %, Grant amount: %', justin_user_id, justin_grant_amount;
  ELSE
    RAISE NOTICE 'Justin user not found';
  END IF;
END $$;

-- Step 3: Revoke Nathan's 500K (create cancellation entry)
INSERT INTO equity_ledger (
  transaction_type,
  recipient_user_id,
  shares_amount,
  share_class,
  price_per_share,
  transaction_date,
  effective_date,
  notes
)
SELECT 
  'cancellation',
  u.id,
  500000,
  'Common',
  0.0001,
  CURRENT_DATE,
  CURRENT_DATE,
  'Equity revocation: 500,000 shares revoked due to termination of employment. Nathan Curry has been exited and fired.'
FROM auth.users u
WHERE u.email = 'natecurry.cto@cravenusa.com'
  AND NOT EXISTS (
    SELECT 1 FROM equity_ledger el
    WHERE el.recipient_user_id = u.id
      AND el.transaction_type = 'cancellation'
      AND el.shares_amount = 500000
  )
LIMIT 1;

-- Step 4: Create Justin's 5M grant if missing
DO $$
DECLARE
  justin_user_id UUID;
  justin_vesting_id UUID;
BEGIN
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = justin_user_id
      AND transaction_type = 'grant'
      AND shares_amount >= 4500000
      AND shares_amount <= 5500000
  ) THEN
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
  END IF;
END $$;

-- Step 5: FIX CAP TABLE - EXPLICIT: Only count Justin's 5M grant
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- ONLY count Justin's 5M grant explicitly
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

-- Step 6: Verify final result
SELECT 
  'FINAL RESULT' as status,
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
  ) as justin_grant_only,
  total_issued,
  total_unissued,
  (total_authorized - total_issued) as calculated_unissued
FROM cap_tables
LIMIT 1;









