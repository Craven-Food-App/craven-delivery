-- VERIFY NATHAN CANCELLATION EXISTS
-- Run this to check if the cancellation was created and diagnose RLS issues

-- 1. Check ALL equity_ledger entries (bypassing RLS with service role)
SELECT 
  'ALL ENTRIES (Service Role)' as info,
  id,
  transaction_type,
  recipient_user_id,
  shares_amount,
  transaction_date,
  created_at
FROM equity_ledger
ORDER BY created_at DESC;

-- 2. Check specifically for Nathan's entries
SELECT 
  'NATHAN ENTRIES' as info,
  id,
  transaction_type,
  recipient_user_id,
  shares_amount,
  transaction_date,
  grant_id,
  LEFT(notes, 100) as notes_preview,
  created_at
FROM equity_ledger
WHERE recipient_user_id = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3'
ORDER BY created_at DESC;

-- 3. Check all cancellations
SELECT 
  'ALL CANCELLATIONS' as info,
  id,
  recipient_user_id,
  shares_amount,
  transaction_date,
  created_at
FROM equity_ledger
WHERE transaction_type = 'cancellation'
ORDER BY created_at DESC;

-- 4. Count by type
SELECT 
  'COUNT BY TYPE' as info,
  transaction_type,
  COUNT(*) as count
FROM equity_ledger
GROUP BY transaction_type;

-- 5. Check RLS policies on equity_ledger
SELECT 
  'RLS POLICIES' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'equity_ledger';

-- 6. If cancellation doesn't exist, create it now (using service role)
DO $$
DECLARE
  nathan_user_id UUID := '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
  cancellation_exists BOOLEAN;
  cancellation_id UUID;
BEGIN
  -- Check if cancellation exists
  SELECT EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
  ) INTO cancellation_exists;
  
  IF cancellation_exists THEN
    RAISE NOTICE '✅ Cancellation already exists';
  ELSE
    RAISE NOTICE '⚠️ Cancellation does NOT exist - creating now...';
    
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
  END IF;
END $$;

-- 7. Final verification
SELECT 
  'FINAL VERIFICATION' as info,
  COUNT(*) FILTER (WHERE transaction_type = 'grant') as grants,
  COUNT(*) FILTER (WHERE transaction_type = 'cancellation') as cancellations,
  COUNT(*) as total_entries
FROM equity_ledger;

