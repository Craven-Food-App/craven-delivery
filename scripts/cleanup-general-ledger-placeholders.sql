-- ================================================
-- Cleanup Placeholder Entries from General Ledger
-- CFO Portal - General Ledger Module
-- ================================================
-- This script deletes all placeholder, test, sample, and example entries
-- from the general ledger system, keeping only real/true entries
--
-- WARNING: Review carefully before executing in production
-- ================================================

BEGIN;

-- ================================================
-- 1. Delete placeholder Journal Entries
-- ================================================
-- Delete journal entries with placeholder/test descriptions
DELETE FROM public.journal_entries
WHERE 
  -- Description contains placeholder keywords
  LOWER(description) LIKE '%placeholder%'
  OR LOWER(description) LIKE '%test%'
  OR LOWER(description) LIKE '%sample%'
  OR LOWER(description) LIKE '%example%'
  OR LOWER(description) LIKE '%demo%'
  OR LOWER(description) LIKE '%mock%'
  OR LOWER(description) LIKE '%dummy%'
  -- Entry numbers that look like test entries
  OR LOWER(entry_number) LIKE '%test%'
  OR LOWER(entry_number) LIKE '%sample%'
  OR LOWER(entry_number) LIKE '%placeholder%'
  -- Reference numbers that look like test entries
  OR (reference_number IS NOT NULL AND (
    LOWER(reference_number) LIKE '%test%'
    OR LOWER(reference_number) LIKE '%sample%'
    OR LOWER(reference_number) LIKE '%placeholder%'
    OR LOWER(reference_number) LIKE '%example%'
  ));

-- ================================================
-- 2. Delete placeholder Journal Entry Lines
-- ================================================
-- Delete lines associated with deleted journal entries
-- (CASCADE should handle this, but being explicit)
DELETE FROM public.journal_entry_lines
WHERE journal_entry_id NOT IN (
  SELECT id FROM public.journal_entries
);

-- Also delete lines with placeholder descriptions
DELETE FROM public.journal_entry_lines
WHERE description IS NOT NULL AND (
  LOWER(description) LIKE '%placeholder%'
  OR LOWER(description) LIKE '%test%'
  OR LOWER(description) LIKE '%sample%'
  OR LOWER(description) LIKE '%example%'
  OR LOWER(description) LIKE '%demo%'
  OR LOWER(description) LIKE '%mock%'
);

-- ================================================
-- 3. Delete placeholder Invoices (AP entries)
-- ================================================
-- Delete invoices that are clearly placeholders
DELETE FROM public.invoices
WHERE 
  -- Vendor names that are placeholders
  LOWER(vendor_name) LIKE '%test%'
  OR LOWER(vendor_name) LIKE '%sample%'
  OR LOWER(vendor_name) LIKE '%placeholder%'
  OR LOWER(vendor_name) LIKE '%example%'
  OR LOWER(vendor_name) LIKE '%demo%'
  OR LOWER(vendor_name) LIKE '%mock%'
  OR LOWER(vendor_name) LIKE '%dummy%'
  -- Invoice numbers that look like test entries
  OR LOWER(invoice_number) LIKE '%test%'
  OR LOWER(invoice_number) LIKE '%sample%'
  OR LOWER(invoice_number) LIKE '%placeholder%'
  -- Notes/description contains placeholder keywords
  OR (notes IS NOT NULL AND (
    LOWER(notes) LIKE '%placeholder%'
    OR LOWER(notes) LIKE '%test%'
    OR LOWER(notes) LIKE '%sample%'
    OR LOWER(notes) LIKE '%example%'
    OR LOWER(notes) LIKE '%demo%'
  ))
  -- Vendor emails that are test emails
  OR (vendor_email IS NOT NULL AND (
    LOWER(vendor_email) LIKE '%@example.com%'
    OR LOWER(vendor_email) LIKE '%@test.com%'
    OR LOWER(vendor_email) LIKE '%@sample.com%'
    OR LOWER(vendor_email) LIKE '%test%@%'
    OR LOWER(vendor_email) LIKE '%placeholder%@%'
  ));

-- ================================================
-- 4. Delete placeholder Expense Requests
-- ================================================
-- Delete expense requests that are clearly placeholders
DELETE FROM public.expense_requests
WHERE 
  -- Request numbers that look like test entries
  LOWER(request_number) LIKE '%test%'
  OR LOWER(request_number) LIKE '%sample%'
  OR LOWER(request_number) LIKE '%placeholder%'
  OR LOWER(request_number) LIKE '%example%'
  -- Description contains placeholder keywords
  OR (description IS NOT NULL AND (
    LOWER(description) LIKE '%placeholder%'
    OR LOWER(description) LIKE '%test%'
    OR LOWER(description) LIKE '%sample%'
    OR LOWER(description) LIKE '%example%'
    OR LOWER(description) LIKE '%demo%'
    OR LOWER(description) LIKE '%mock%'
  ))
  -- Vendor/merchant names that are placeholders
  OR (vendor_name IS NOT NULL AND (
    LOWER(vendor_name) LIKE '%test%'
    OR LOWER(vendor_name) LIKE '%sample%'
    OR LOWER(vendor_name) LIKE '%placeholder%'
    OR LOWER(vendor_name) LIKE '%example%'
    OR LOWER(vendor_name) LIKE '%demo%'
  ));

-- ================================================
-- 5. Clean up Account Balances for deleted accounts
-- ================================================
-- Delete account balances for accounts that no longer exist
DELETE FROM public.account_balances
WHERE account_id NOT IN (
  SELECT id FROM public.chart_of_accounts
);

-- ================================================
-- 6. Optional: Delete test Chart of Accounts entries
-- ================================================
-- Only delete if they're clearly test accounts (be careful!)
-- Uncomment if you want to remove test accounts too
/*
DELETE FROM public.chart_of_accounts
WHERE 
  LOWER(account_name) LIKE '%test%'
  OR LOWER(account_name) LIKE '%sample%'
  OR LOWER(account_name) LIKE '%placeholder%'
  OR LOWER(account_code) LIKE 'TEST%'
  OR LOWER(account_code) LIKE 'SAMPLE%'
  AND is_system_account = false; -- Don't delete system accounts
*/

COMMIT;

-- ================================================
-- Verification Queries
-- ================================================
-- Run these after the cleanup to verify results

SELECT 'Remaining Journal Entries' as category, COUNT(*) as count 
FROM public.journal_entries;

SELECT 'Remaining Journal Entry Lines' as category, COUNT(*) as count 
FROM public.journal_entry_lines;

SELECT 'Remaining Invoices' as category, COUNT(*) as count 
FROM public.invoices;

SELECT 'Remaining Expense Requests' as category, COUNT(*) as count 
FROM public.expense_requests;

-- Show any remaining entries that might be placeholders
SELECT 'Potential Placeholder Journal Entries' as category, COUNT(*) as count
FROM public.journal_entries
WHERE LOWER(description) LIKE '%test%'
   OR LOWER(description) LIKE '%sample%'
   OR LOWER(description) LIKE '%placeholder%';

SELECT 'Potential Placeholder Invoices' as category, COUNT(*) as count
FROM public.invoices
WHERE LOWER(vendor_name) LIKE '%test%'
   OR LOWER(vendor_name) LIKE '%sample%'
   OR LOWER(vendor_name) LIKE '%placeholder%';

SELECT 'Potential Placeholder Expense Requests' as category, COUNT(*) as count
FROM public.expense_requests
WHERE LOWER(request_number) LIKE '%test%'
   OR LOWER(request_number) LIKE '%sample%'
   OR LOWER(request_number) LIKE '%placeholder%';


