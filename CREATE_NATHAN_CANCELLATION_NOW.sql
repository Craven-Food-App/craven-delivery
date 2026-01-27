-- CREATE NATHAN CURRY CANCELLATION ENTRY - RUN THIS NOW
-- This will create the cancellation entry in equity_ledger that the frontend needs

DO $$
DECLARE
  nathan_user_id UUID := '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
  nathan_grant RECORD;
  cancellation_exists BOOLEAN;
  cancellation_id UUID;
BEGIN
  RAISE NOTICE '🔍 Looking for Nathan Curry grant...';
  
  -- First, try to find Nathan's grant in equity_ledger
  SELECT id, shares_amount, share_class, grant_id, transaction_date, created_at
  INTO nathan_grant
  FROM equity_ledger
  WHERE recipient_user_id = nathan_user_id
    AND transaction_type = 'grant'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If not found in equity_ledger, check if we should create cancellation anyway
  IF nathan_grant IS NULL THEN
    RAISE NOTICE '⚠️ Nathan grant not found in equity_ledger - will create cancellation with 500K shares';
    -- Set default values
    nathan_grant.shares_amount := 500000;
    nathan_grant.share_class := 'Common';
    nathan_grant.grant_id := NULL;
    nathan_grant.transaction_date := CURRENT_DATE;
  ELSE
    RAISE NOTICE '✅ Found Nathan grant: id=%, shares=%, grant_id=%', 
      nathan_grant.id, nathan_grant.shares_amount, nathan_grant.grant_id;
  END IF;
  
  -- Check if cancellation already exists
  SELECT EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
  ) INTO cancellation_exists;
  
  IF cancellation_exists THEN
    RAISE NOTICE '✅ Cancellation already exists for Nathan Curry 500K shares';
  ELSE
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
      COALESCE(nathan_grant.share_class, 'Common'),
      0.0001,
      CURRENT_DATE,
      CURRENT_DATE,
      nathan_grant.grant_id,
      'PERMANENT REVOCATION: 500,000 shares revoked. Nathan Curry has been exited and terminated. This revocation is permanent and logged in governance_logs.',
      NOW()
    )
    RETURNING id INTO cancellation_id;
    
    RAISE NOTICE '✅ Created cancellation entry: id=%', cancellation_id;
  END IF;
  
  -- Verify the result
  RAISE NOTICE '📊 VERIFICATION:';
  RAISE NOTICE '   Total equity_ledger entries: %', (SELECT COUNT(*) FROM equity_ledger);
  RAISE NOTICE '   Cancellation entries: %', (SELECT COUNT(*) FROM equity_ledger WHERE transaction_type = 'cancellation');
  
END $$;

-- Show the result
SELECT 
  'VERIFICATION: Nathan Curry Equity Ledger' as info,
  transaction_type,
  shares_amount,
  transaction_date,
  grant_id,
  LEFT(notes, 80) as notes_preview,
  created_at
FROM equity_ledger
WHERE recipient_user_id = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3'
ORDER BY created_at DESC;

