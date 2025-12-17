-- Cleanup duplicate SOP documents
-- This script keeps only the most recent record for each unique markdown_file_path

-- First, see what we have
SELECT id, title, markdown_file_path, created_at 
FROM sop_documents 
ORDER BY markdown_file_path, created_at DESC;

-- Delete duplicates, keeping only the newest one for each markdown_file_path
DELETE FROM sop_documents 
WHERE id NOT IN (
  SELECT DISTINCT ON (markdown_file_path) id 
  FROM sop_documents 
  ORDER BY markdown_file_path, created_at DESC
);

-- Verify cleanup
SELECT id, title, markdown_file_path, created_at 
FROM sop_documents 
ORDER BY created_at DESC;

