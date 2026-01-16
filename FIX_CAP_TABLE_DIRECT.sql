-- DIRECT FIX - Run this in Supabase SQL Editor
-- This directly fixes the cap table numbers

-- Step 1: Revoke Nathan's 500K shares (create cancellation entry)
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
      AND el.transaction_date = CURRENT_DATE
  )
LIMIT 1;

-- Step 2: Create Justin's 5M grant if missing
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

    -- Create ledger entry
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

-- Step 3: FIX THE CAP TABLE - Direct calculation
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger 
     WHERE transaction_type = 'grant')
  ),
  total_unissued = (
    total_authorized - 
    (COALESCE(trust_shares, 0) + 
     COALESCE(founder_shares, 0) + 
     (SELECT COALESCE(SUM(shares_amount), 0) 
      FROM equity_ledger 
      WHERE transaction_type = 'grant'))
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify the fix
SELECT 
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) FROM equity_ledger WHERE transaction_type = 'grant') as grants_from_ledger,
  total_issued,
  total_unissued
FROM cap_tables
LIMIT 1;



























