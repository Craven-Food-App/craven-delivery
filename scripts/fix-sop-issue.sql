-- Comprehensive fix script for SOP Documents issue
-- Run this in Supabase SQL Editor

-- Step 1: Check if table exists and has data
SELECT 
  'Table Check' as step,
  COUNT(*) as record_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM sop_documents;

-- Step 2: List all SOPs (bypassing RLS to see what's actually there)
SET LOCAL ROLE postgres;
SELECT id, title, category, status, markdown_file_path, created_at
FROM sop_documents
ORDER BY created_at DESC;
RESET ROLE;

-- Step 3: Delete any existing Investor Compliance SOP (to ensure clean insert)
DELETE FROM sop_documents 
WHERE markdown_file_path = 'INVESTOR_COMPLIANCE_SOP.md';

-- Step 4: Insert the SOP with explicit values
INSERT INTO sop_documents (
  title,
  description,
  category,
  version,
  status,
  markdown_file_path,
  owner_department,
  tags,
  keywords,
  created_at,
  updated_at
) VALUES (
  'Investor Compliance & Intake Process',
  'Standard Operating Procedure for investor interest submissions, compliance tracking, and portal access management',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_COMPLIANCE_SOP.md',
  'Finance',
  ARRAY['investor', 'compliance', 'reg-d', 'intake', 'portal'],
  ARRAY['investor', 'compliance', 'reg d', '506b', 'intake', 'portal', 'cfo', 'approval', 'acknowledgment'],
  now(),
  now()
)
RETURNING id, title, status, created_at;

-- Step 5: Verify the insert worked
SELECT 
  'Verification' as step,
  id,
  title,
  category,
  status,
  markdown_file_path
FROM sop_documents
WHERE markdown_file_path = 'INVESTOR_COMPLIANCE_SOP.md';

-- Step 6: Test RLS policies - check what the current user can see
-- (This will show if RLS is blocking)
SELECT 
  'RLS Test' as step,
  COUNT(*) as visible_count
FROM sop_documents;

-- Step 7: Check RLS policies exist
SELECT 
  'Policy Check' as step,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as policy_status
FROM pg_policies
WHERE tablename = 'sop_documents'
ORDER BY policyname;

