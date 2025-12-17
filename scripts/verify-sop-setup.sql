-- Quick verification and setup script for SOP Documents
-- Run this in Supabase SQL Editor to check and fix the setup

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sop_documents'
) AS table_exists;

-- 2. Check if storage bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'sop-documents';

-- 3. Check current SOP records
SELECT id, title, category, status, pdf_file_path, created_at
FROM sop_documents
ORDER BY created_at DESC;

-- 4. If table exists but no records, insert the Investor Compliance SOP
INSERT INTO sop_documents (
  title,
  description,
  category,
  version,
  status,
  markdown_file_path,
  owner_department,
  tags,
  keywords
) VALUES (
  'Investor Compliance & Intake Process',
  'Standard Operating Procedure for investor interest submissions, compliance tracking, and portal access management',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_COMPLIANCE_SOP.md',
  'Finance',
  ARRAY['investor', 'compliance', 'reg-d', 'intake', 'portal'],
  ARRAY['investor', 'compliance', 'reg d', '506b', 'intake', 'portal', 'cfo', 'approval', 'acknowledgment']
) ON CONFLICT DO NOTHING
RETURNING id, title;

-- 5. Verify RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'sop_documents'
ORDER BY policyname;

