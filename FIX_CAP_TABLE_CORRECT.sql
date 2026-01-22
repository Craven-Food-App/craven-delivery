-- CORRECT FIX - The problem is Torrance's 18M is in BOTH founder_shares AND equity_ledger
-- We need to exclude grants that are already counted in trust/founder shares

-- First, let's see what grants are in the ledger
SELECT 
  recipient_user_id,
  shares_amount,
  transaction_type,
  transaction_date
FROM equity_ledger
ORDER BY shares_amount DESC;

-- The issue: Torrance's 18M grant is in equity_ledger BUT it's also counted in founder_shares
-- So we're double-counting it: 18M (founder) + 18M (ledger) = 36M for Torrance

-- FIX: Only count NEW grants that aren't already in trust/founder shares
-- Since Torrance's 18M is in founder_shares, we should NOT count it again from ledger

UPDATE cap_tables
SET 
  total_issued = (
    COALESCE(trust_shares, 0) + 
    COALESCE(founder_shares, 0) + 
    -- Only count grants that are NOT Torrance's 18M (which is already in founder_shares)
    (SELECT COALESCE(SUM(shares_amount), 0) 
     FROM equity_ledger 
     WHERE transaction_type = 'grant'
       AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
         SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
       ))
    )
  ),
  total_unissued = (
    total_authorized - 
    (COALESCE(trust_shares, 0) + 
     COALESCE(founder_shares, 0) + 
     (SELECT COALESCE(SUM(shares_amount), 0) 
      FROM equity_ledger 
      WHERE transaction_type = 'grant'
        AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
          SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
        ))
     )
    )
  ),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify the fix
SELECT 
  total_authorized,
  trust_shares,
  founder_shares,
  (SELECT COALESCE(SUM(shares_amount), 0) 
   FROM equity_ledger 
   WHERE transaction_type = 'grant'
     AND NOT (shares_amount = 18000000 AND recipient_user_id IN (
       SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
     ))
  ) as new_grants_only,
  total_issued,
  total_unissued,
  (total_authorized - total_issued) as should_be_unissued
FROM cap_tables
LIMIT 1;




















































