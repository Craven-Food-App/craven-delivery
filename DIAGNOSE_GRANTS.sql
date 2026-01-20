-- DIAGNOSE: See exactly what grants exist and which are being counted
-- Run this FIRST to see what's wrong

-- 1. Show ALL grants in ledger
SELECT 
  'ALL GRANTS IN LEDGER' as info,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date,
  el.notes
FROM equity_ledger el
LEFT JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
ORDER BY el.shares_amount DESC;

-- 2. Show which grants are being COUNTED (after exclusions)
SELECT 
  'GRANTS BEING COUNTED (after exclusions)' as info,
  el.id,
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

-- 3. Check for Torrance's user_id
SELECT 
  'TORRANCE USER ID' as info,
  id,
  email
FROM auth.users
WHERE email = 'tstroman.ceo@cravenusa.com';

-- 4. Check for Nathan's user_id
SELECT 
  'NATHAN USER ID' as info,
  id,
  email
FROM auth.users
WHERE email = 'natecurry.cto@cravenusa.com';

-- 5. Check for Justin's user_id and grants
SELECT 
  'JUSTIN USER ID AND GRANTS' as info,
  u.id as user_id,
  u.email,
  el.shares_amount,
  el.transaction_date
FROM auth.users u
LEFT JOIN equity_ledger el ON el.recipient_user_id = u.id AND el.transaction_type = 'grant'
WHERE u.email = 'jsweet.cfo@cravenusa.com';

-- 6. Sum of grants being counted
SELECT 
  'SUM OF GRANTS BEING COUNTED' as info,
  COALESCE(SUM(el.shares_amount), 0) as total_active_grants
FROM equity_ledger el
WHERE el.transaction_type = 'grant'
  AND NOT (el.shares_amount = 18000000 AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
  ))
  AND NOT (el.shares_amount = 500000 AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com'
  ));















































