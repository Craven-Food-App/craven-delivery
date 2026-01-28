-- CHECK EQUITY LEDGER ENTRIES FOR TEAM MANAGEMENT
-- This script helps diagnose why equity holdings are incorrect

-- Check all equity_ledger entries for executives
SELECT 
  el.id,
  el.transaction_type,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_date,
  el.notes,
  el.grant_id,
  el.certificate_id
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE u.email IN (
  'tstroman.ceo@cravenusa.com',
  'jsweet.cfo@cravenusa.com',
  'ncurry.cto@cravenusa.com',
  'natecurry.cto@cravenusa.com'
)
ORDER BY u.email, el.transaction_date DESC;

-- Summary by user and transaction type
SELECT 
  u.email,
  el.transaction_type,
  COUNT(*) as entry_count,
  SUM(el.shares_amount) as total_shares
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE u.email IN (
  'tstroman.ceo@cravenusa.com',
  'jsweet.cfo@cravenusa.com',
  'ncurry.cto@cravenusa.com',
  'natecurry.cto@cravenusa.com'
)
GROUP BY u.email, el.transaction_type
ORDER BY u.email, el.transaction_type;

-- Check for Torrance specifically - should have 10,500,000 shares
SELECT 
  'Torrance Stroman' as name,
  u.email,
  SUM(CASE WHEN el.transaction_type = 'grant' THEN el.shares_amount ELSE 0 END) as total_grants,
  SUM(CASE WHEN el.transaction_type = 'issuance' THEN el.shares_amount ELSE 0 END) as total_issuances,
  SUM(CASE WHEN el.transaction_type = 'cancellation' THEN el.shares_amount ELSE 0 END) as total_cancellations,
  COUNT(*) as total_entries
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE u.email = 'tstroman.ceo@cravenusa.com'
GROUP BY u.email;

-- Check for Justin specifically - should have 4,200,000 shares
SELECT 
  'Justin Sweet' as name,
  u.email,
  SUM(CASE WHEN el.transaction_type = 'grant' THEN el.shares_amount ELSE 0 END) as total_grants,
  SUM(CASE WHEN el.transaction_type = 'issuance' THEN el.shares_amount ELSE 0 END) as total_issuances,
  SUM(CASE WHEN el.transaction_type = 'cancellation' THEN el.shares_amount ELSE 0 END) as total_cancellations,
  COUNT(*) as total_entries
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE u.email = 'jsweet.cfo@cravenusa.com'
GROUP BY u.email;

-- Check for Nathan specifically
SELECT 
  'Nathan Curry' as name,
  u.email,
  SUM(CASE WHEN el.transaction_type = 'grant' THEN el.shares_amount ELSE 0 END) as total_grants,
  SUM(CASE WHEN el.transaction_type = 'issuance' THEN el.shares_amount ELSE 0 END) as total_issuances,
  SUM(CASE WHEN el.transaction_type = 'cancellation' THEN el.shares_amount ELSE 0 END) as total_cancellations,
  COUNT(*) as total_entries
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE u.email IN ('ncurry.cto@cravenusa.com', 'natecurry.cto@cravenusa.com')
GROUP BY u.email;

