-- ADD JUSTIN SWEET'S 5M GRANT TO EQUITY_LEDGER
-- Run this in Supabase SQL Editor NOW

DO $$
DECLARE
  justin_user_id UUID;
  justin_vesting_id UUID;
BEGIN
  -- Get Justin's user_id
  SELECT id INTO justin_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com'
  LIMIT 1;

  IF justin_user_id IS NULL THEN
    RAISE EXCEPTION 'Justin Sweet user not found';
  END IF;

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

  RAISE NOTICE 'Justin Sweet 5M grant created successfully';
END $$;

-- Fix cap table - exclude Torrance's 18M, only count Justin's 5M
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger el
     INNER JOIN auth.users u ON u.id = el.recipient_user_id
     WHERE el.transaction_type = 'grant'
       AND u.email = 'jsweet.cfo@cravenusa.com'
       AND el.shares_amount = 5000000
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
        AND el.shares_amount = 5000000
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify
SELECT 
  'DONE' as status,
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) 
   FROM equity_ledger el
   INNER JOIN auth.users u ON u.id = el.recipient_user_id
   WHERE el.transaction_type = 'grant'
     AND u.email = 'jsweet.cfo@cravenusa.com'
     AND el.shares_amount = 5000000
  ) as justin_grant,
  total_issued,
  total_unissued
FROM cap_tables
LIMIT 1;




































