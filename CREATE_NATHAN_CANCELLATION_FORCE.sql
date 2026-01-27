-- FORCE CREATE NATHAN CURRY CANCELLATION - BYPASSES RLS
-- Run this in Supabase SQL Editor (runs with service role privileges)

-- First, check current state
SELECT 
  'BEFORE: Total equity_ledger entries' as info,
  COUNT(*) as count
FROM equity_ledger;

SELECT 
  'BEFORE: Nathan Curry entries' as info,
  transaction_type,
  shares_amount,
  created_at
FROM equity_ledger
WHERE recipient_user_id = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3'
ORDER BY created_at DESC;

-- Now create the cancellation entry using SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_nathan_cancellation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nathan_user_id UUID := '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
  cancellation_id UUID;
  cancellation_exists BOOLEAN;
BEGIN
  -- Check if cancellation already exists
  SELECT EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
  ) INTO cancellation_exists;
  
  IF cancellation_exists THEN
    RAISE NOTICE '✅ Cancellation already exists';
    SELECT id INTO cancellation_id
    FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
    LIMIT 1;
    RETURN cancellation_id;
  END IF;
  
  -- Create cancellation entry
  INSERT INTO equity_ledger (
    transaction_type,
    recipient_user_id,
    shares_amount,
    share_class,
    price_per_share,
    transaction_date,
    effective_date,
    grant_id,
    notes,
    created_at
  ) VALUES (
    'cancellation',
    nathan_user_id,
    500000,
    'Common',
    0.0001,
    CURRENT_DATE,
    CURRENT_DATE,
    NULL,
    'PERMANENT REVOCATION: 500,000 shares revoked. Nathan Curry has been exited and terminated. This revocation is permanent and logged in governance_logs.',
    NOW()
  )
  RETURNING id INTO cancellation_id;
  
  RAISE NOTICE '✅ Created cancellation entry: %', cancellation_id;
  RETURN cancellation_id;
END;
$$;

-- Execute the function
SELECT create_nathan_cancellation() as cancellation_id;

-- Clean up the function
DROP FUNCTION IF EXISTS create_nathan_cancellation();

-- Verify the result
SELECT 
  'AFTER: Total equity_ledger entries' as info,
  COUNT(*) as count
FROM equity_ledger;

SELECT 
  'AFTER: Nathan Curry entries' as info,
  transaction_type,
  shares_amount,
  transaction_date,
  grant_id,
  LEFT(notes, 80) as notes_preview,
  created_at
FROM equity_ledger
WHERE recipient_user_id = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3'
ORDER BY created_at DESC;

-- Show all cancellations
SELECT 
  'ALL CANCELLATIONS' as info,
  recipient_user_id,
  shares_amount,
  transaction_date,
  created_at
FROM equity_ledger
WHERE transaction_type = 'cancellation'
ORDER BY created_at DESC;

