-- SIMPLE DIRECT FIX - Just sets the cap table to correct values
-- Run this in Supabase SQL Editor

-- First, let's see what's actually in the ledger
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(shares_amount) as total_shares
FROM equity_ledger
GROUP BY transaction_type;

-- Now fix the cap table directly
UPDATE cap_tables
SET 
  total_issued = 78000000,  -- 55M Trust + 18M Founder + 5M Justin
  total_unissued = 22000000,  -- 100M - 78M
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify
SELECT 
  total_authorized,
  trust_shares,
  founder_shares,
  total_issued,
  total_unissued,
  (SELECT COALESCE(SUM(shares_amount), 0) FROM equity_ledger WHERE transaction_type = 'grant') as grants_in_ledger
FROM cap_tables
LIMIT 1;










































