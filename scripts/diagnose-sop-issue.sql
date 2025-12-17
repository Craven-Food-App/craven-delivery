-- Diagnostic queries to troubleshoot empty SOP Documents page

-- 1. Check if table exists and has data
SELECT 
  COUNT(*) as total_sops,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sops,
  COUNT(CASE WHEN pdf_file_path IS NOT NULL THEN 1 END) as sops_with_pdf
FROM sop_documents;

-- 2. List all SOP records
SELECT 
  id,
  title,
  category,
  status,
  pdf_file_path,
  markdown_file_path,
  created_at
FROM sop_documents
ORDER BY created_at DESC;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sop_documents'
ORDER BY policyname;

-- 4. Test RLS as current user
-- This will show what the current user can see
SELECT 
  id,
  title,
  category,
  status
FROM sop_documents;

-- 5. Check if storage bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'sop-documents';

-- 6. Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%SOP%'
ORDER BY policyname;

-- 7. Manually insert SOP if missing (uncomment to use)
/*
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
)
ON CONFLICT DO NOTHING
RETURNING id, title, status;
*/

