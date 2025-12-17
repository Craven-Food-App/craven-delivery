-- Manual insert script for Investor Compliance SOP
-- Run this if the migration INSERT didn't work

-- First, check if it already exists
SELECT id, title, status 
FROM sop_documents 
WHERE markdown_file_path = 'INVESTOR_COMPLIANCE_SOP.md';

-- If no results, insert it
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
) 
SELECT 
  'Investor Compliance & Intake Process',
  'Standard Operating Procedure for investor interest submissions, compliance tracking, and portal access management',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_COMPLIANCE_SOP.md',
  'Finance',
  ARRAY['investor', 'compliance', 'reg-d', 'intake', 'portal'],
  ARRAY['investor', 'compliance', 'reg d', '506b', 'intake', 'portal', 'cfo', 'approval', 'acknowledgment']
WHERE NOT EXISTS (
  SELECT 1 FROM sop_documents 
  WHERE markdown_file_path = 'INVESTOR_COMPLIANCE_SOP.md'
)
RETURNING id, title, status, created_at;

-- Verify it was inserted
SELECT id, title, category, status, pdf_file_path
FROM sop_documents
ORDER BY created_at DESC;

