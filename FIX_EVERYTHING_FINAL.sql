-- COMPLETE FIX - Run this in Supabase SQL Editor
-- This will show what's wrong and fix it

-- STEP 1: Show current state
SELECT 'CURRENT STATE' as step;
SELECT 
  'Cap Table' as source,
  total_authorized,
  trust_shares,
  founder_shares,
  total_issued,
  total_unissued
FROM cap_tables LIMIT 1;

SELECT 
  'Equity Ledger Grants' as source,
  COUNT(*) as count,
  SUM(shares_amount) as total_shares
FROM equity_ledger
WHERE transaction_type = 'grant';

SELECT 
  'Equity Ledger Cancellations' as source,
  COUNT(*) as count,
  SUM(shares_amount) as total_shares
FROM equity_ledger
WHERE transaction_type = 'cancellation';

-- STEP 2: Revoke Nathan's 500K shares
DO $$
DECLARE
  nathan_user_id UUID;
BEGIN
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NOT NULL THEN
    -- Create revocation if it doesn't exist
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
      nathan_user_id,
      500000,
      'Common',
      0.0001,
      CURRENT_DATE,
      CURRENT_DATE,
      'Equity revocation: 500,000 shares revoked due to termination of employment. Nathan Curry has been exited and fired.'
    WHERE NOT EXISTS (
      SELECT 1 FROM equity_ledger
      WHERE recipient_user_id = nathan_user_id
        AND transaction_type = 'cancellation'
        AND shares_amount = 500000
        AND transaction_date = CURRENT_DATE
    );

    -- Log it
    INSERT INTO governance_logs (
      action,
      entity_type,
      entity_id,
      description,
      data
    )
    SELECT 
      'equity_revoked',
      'user',
      nathan_user_id,
      'Revoked 500,000 shares from Nathan Curry due to termination of employment',
      jsonb_build_object(
        'shares_revoked', 500000,
        'target_name', 'Nathan Curry',
        'reason', 'Termination of employment',
        'action_category', 'equity'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM governance_logs
      WHERE entity_id = nathan_user_id
        AND action = 'equity_revoked'
        AND description LIKE '%500,000%'
    );
  END IF;
END $$;

-- STEP 3: Create Justin's 5M grant
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

-- STEP 4: FIX CAP TABLE - Exclude Torrance's 18M from ledger (already in founder_shares)
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- Only count NEW grants, NOT Torrance's 18M (already in founder_shares)
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger 
     WHERE transaction_type = 'grant'
       AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
         SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
       ))
    )
  ),
  total_unissued = (
    total_authorized - 
    (COALESCE(trust_shares, 0) + 
     COALESCE(founder_shares, 0) + 
     (SELECT COALESCE(SUM(shares_amount), 0) 
      FROM equity_ledger 
      WHERE transaction_type = 'grant'
        AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
          SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
        ))
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- STEP 5: Show final state
SELECT 'FINAL STATE' as step;
SELECT 
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) 
   FROM equity_ledger 
   WHERE transaction_type = 'grant'
     AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
       SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
     ))
  ) as new_grants_only,
  total_issued,
  total_unissued,
  (total_authorized - total_issued) as calculated_unissued
FROM cap_tables
LIMIT 1;

