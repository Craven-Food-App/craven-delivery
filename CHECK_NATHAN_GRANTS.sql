-- DIAGNOSTIC: Check what grants/cancellations exist for Nathan Curry
-- Run this FIRST to see what's in the database

-- 1. Find Nathan's user_id
SELECT 
  'Nathan User ID' as info,
  id as user_id,
  email
FROM auth.users
WHERE email = 'natecurry.cto@cravenusa.com';

-- 2. Check ALL equity_ledger entries for Nathan
SELECT 
  'Nathan Equity Ledger Entries' as info,
  id,
  transaction_type,
  shares_amount,
  share_class,
  grant_id,
  transaction_date,
  created_at,
  LEFT(notes, 100) as notes_preview
FROM equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com' LIMIT 1)
ORDER BY created_at DESC;

-- 3. Check equity_grants table (if it exists)
SELECT 
  'Nathan Equity Grants Table' as info,
  id,
  recipient_user_id,
  shares_amount,
  share_class,
  grant_date,
  created_at
FROM equity_grants
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com' LIMIT 1)
ORDER BY created_at DESC;

-- 4. Summary
SELECT 
  'SUMMARY' as info,
  COUNT(*) FILTER (WHERE transaction_type = 'grant') as total_grants,
  COUNT(*) FILTER (WHERE transaction_type = 'cancellation') as total_cancellations,
  COALESCE(SUM(shares_amount) FILTER (WHERE transaction_type = 'grant'), 0) as total_granted_shares,
  COALESCE(SUM(shares_amount) FILTER (WHERE transaction_type = 'cancellation'), 0) as total_revoked_shares,
  COALESCE(SUM(shares_amount) FILTER (WHERE transaction_type = 'grant'), 0) - 
  COALESCE(SUM(shares_amount) FILTER (WHERE transaction_type = 'cancellation'), 0) as net_shares
FROM equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com' LIMIT 1);

