-- ==============================================================================
-- CHECK CURRENT CAP TABLE STATE (No Cache)
-- ==============================================================================
-- Run this to see the actual current state in the database
-- Add random comment to bypass cache: QUERY_ID_20260127_151523
-- ==============================================================================

-- Clear any cached plans
DISCARD PLANS;
DISCARD TEMP;

-- Force fresh read from disk
SELECT 
  'CAP TABLE CURRENT STATE' as info,
  NOW() as query_time;

-- Show cap table with all columns
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares,
  founder_shares,
  equity_pool,
  trust_percentage,
  founder_percentage,
  pool_percentage,
  updated_at
FROM public.cap_tables
ORDER BY updated_at DESC
LIMIT 1;

-- Show all shareholders from employee_equity
SELECT 
  'EMPLOYEE_EQUITY TABLE' as table_name,
  COALESCE(shareholder_name, 'Employee: ' || e.first_name || ' ' || e.last_name) as name,
  eq.shares_total,
  eq.shares_percentage,
  eq.shareholder_type,
  eq.is_majority_shareholder,
  eq.updated_at
FROM public.employee_equity eq
LEFT JOIN public.employees e ON eq.employee_id = e.id
WHERE eq.shares_total > 0
ORDER BY eq.shares_percentage DESC;

-- Show Justin's grants from equity_ledger
SELECT 
  'EQUITY_LEDGER (JUSTIN)' as table_name,
  recipient_user_id,
  shares_amount,
  transaction_type,
  notes,
  transaction_date,
  updated_at
FROM public.equity_ledger
WHERE recipient_user_id = (
  SELECT id FROM auth.users WHERE email = 'jsweet.cfo@cravenusa.com' LIMIT 1
)
AND transaction_type = 'grant'
ORDER BY transaction_date DESC;

-- Check if migrations have been applied
SELECT 
  'GOVERNANCE_LOGS' as table_name,
  action,
  description,
  created_at
FROM public.governance_logs
WHERE action IN ('equity_adjusted', 'cap_table_restructured')
ORDER BY created_at DESC
LIMIT 5;

