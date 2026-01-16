-- FIX: Remove duplicate Justin grants and fix cap table
-- Run this in Supabase SQL Editor

-- Step 1: Show all Justin's grants
SELECT 
  'ALL JUSTIN GRANTS' as info,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_date,
  el.created_at
FROM equity_ledger el
INNER JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND u.email = 'jsweet.cfo@cravenusa.com'
  AND el.shares_amount >= 4500000
  AND el.shares_amount <= 5500000
ORDER BY el.created_at DESC;

-- Step 2: Delete duplicate grants (keep the most recent one)
DELETE FROM equity_ledger
WHERE id IN (
  SELECT el.id
  FROM equity_ledger el
  INNER JOIN auth.users u ON u.id = el.recipient_user_id
  WHERE el.transaction_type = 'grant'
    AND u.email = 'jsweet.cfo@cravenusa.com'
    AND el.shares_amount >= 4500000
    AND el.shares_amount <= 5500000
  ORDER BY el.created_at ASC  -- Delete oldest first
  OFFSET 1  -- Skip the first (newest), delete the rest
);

-- Step 3: Verify only ONE grant remains
SELECT 
  'VERIFY: Should show only ONE 5M grant' as info,
  COUNT(*) as grant_count,
  COALESCE(SUM(shares_amount), 0) as total_shares
FROM equity_ledger el
INNER JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND u.email = 'jsweet.cfo@cravenusa.com'
  AND el.shares_amount >= 4500000
  AND el.shares_amount <= 5500000;

-- Step 4: FIX CAP TABLE - Only count Justin's single 5M grant
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- Only count Justin's 5M grant (should be just one now)
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger el
     INNER JOIN auth.users u ON u.id = el.recipient_user_id
     WHERE el.transaction_type = 'grant'
       AND u.email = 'jsweet.cfo@cravenusa.com'
       AND el.shares_amount >= 4500000
       AND el.shares_amount <= 5500000
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
        AND el.shares_amount >= 4500000
        AND el.shares_amount <= 5500000
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Step 5: Show final result
SELECT 
  'FINAL RESULT' as status,
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) 
   FROM equity_ledger el
   INNER JOIN auth.users u ON u.id = el.recipient_user_id
   WHERE el.transaction_type = 'grant'
     AND u.email = 'jsweet.cfo@cravenusa.com'
     AND el.shares_amount >= 4500000
     AND el.shares_amount <= 5500000
  ) as justin_grant_only,
  total_issued,
  total_unissued
FROM cap_tables
LIMIT 1;



























