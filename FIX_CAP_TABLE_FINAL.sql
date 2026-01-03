-- FINAL FIX - Exclude both Torrance's 18M AND Nathan's revoked 500K
-- Run this in Supabase SQL Editor

-- Step 1: Show what grants exist
SELECT 
  'All grants in ledger' as info,
  recipient_user_id,
  shares_amount,
  transaction_type,
  transaction_date
FROM equity_ledger
WHERE transaction_type IN ('grant', 'cancellation')
ORDER BY shares_amount DESC;

-- Step 2: Revoke Nathan's 500K if not already revoked
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

-- Step 3: Create Justin's 5M grant if missing
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

-- Step 4: FIX CAP TABLE - Exclude Torrance's 18M (in founder_shares) and Nathan's 500K (revoked)
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- Only count grants that are:
    -- 1. NOT Torrance's 18M (already in founder_shares)
    -- 2. NOT Nathan's 500K (revoked - exclude entirely)
    (SELECT COALESCE(SUM(el.shares_amount), 0) 
     FROM equity_ledger el
     WHERE el.transaction_type = 'grant'
       -- Exclude Torrance's 18M
       AND NOT (el.shares_amount = 18000000 AND el.recipient_user_id IN (
         SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
       ))
       -- Exclude Nathan's 500K (revoked - don't count at all)
       AND NOT (el.shares_amount = 500000 AND el.recipient_user_id IN (
         SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com'
       ))
    )
  ),
  total_unissued = (
    total_authorized - 
    (COALESCE(trust_shares, 0) + 
     COALESCE(founder_shares, 0) + 
     (SELECT COALESCE(SUM(el.shares_amount), 0) 
      FROM equity_ledger el
      WHERE el.transaction_type = 'grant'
        AND NOT (el.shares_amount = 18000000 AND el.recipient_user_id IN (
          SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
        ))
        AND NOT (el.shares_amount = 500000 AND el.recipient_user_id IN (
          SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com'
        ))
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Step 5: Show which grants are being counted
SELECT 
  'Grants being counted (excluding Torrance 18M and Nathan 500K)' as info,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_date
FROM equity_ledger el
LEFT JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND NOT (el.shares_amount = 18000000 AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
  ))
  AND NOT (el.shares_amount = 500000 AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com'
  ))
ORDER BY el.shares_amount DESC;

-- Step 6: Verify final result
SELECT 
  'FINAL RESULT' as status,
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(el.shares_amount), 0) 
   FROM equity_ledger el
   WHERE el.transaction_type = 'grant'
     AND NOT (el.shares_amount = 18000000 AND el.recipient_user_id IN (
       SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
     ))
     AND NOT (el.shares_amount = 500000 AND el.recipient_user_id IN (
       SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com'
     ))
  ) as active_grants_only,
  total_issued,
  total_unissued,
  (total_authorized - total_issued) as calculated_unissued
FROM cap_tables
LIMIT 1;

