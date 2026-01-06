-- FIX: Remove duplicate Justin grant - there are TWO 5M grants, we only need ONE
-- Run this in Supabase SQL Editor

-- Step 1: Show ALL of Justin's grants
SELECT 
  'ALL JUSTIN GRANTS (showing duplicates)' as info,
  el.id,
  el.recipient_user_id,
  u.email,
  el.shares_amount,
  el.transaction_type,
  el.transaction_date,
  el.created_at,
  el.notes
FROM equity_ledger el
INNER JOIN auth.users u ON u.id = el.recipient_user_id
WHERE el.transaction_type = 'grant'
  AND u.email = 'jsweet.cfo@cravenusa.com'
  AND el.shares_amount >= 4500000
  AND el.shares_amount <= 5500000
ORDER BY el.created_at DESC;

-- Step 2: Delete the OLDER duplicate grant (keep the most recent one)
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

-- Step 4: Revoke Nathan's 500K (if not already revoked)
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
  )
LIMIT 1;

-- Step 5: FIX CAP TABLE - Only count Justin's single 5M grant
UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- ONLY count Justin's 5M grant (should be just one now)
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

-- Step 6: Show final result
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
  total_unissued,
  (total_authorized - total_issued) as calculated_unissued
FROM cap_tables
LIMIT 1;












