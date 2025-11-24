-- ============================================================================
-- CHECK IF PRE-INCORPORATION CONSENT TEMPLATE EXISTS
-- ============================================================================

SELECT 
  template_key,
  name,
  category,
  is_active,
  created_at,
  updated_at,
  CASE 
    WHEN html_content IS NULL THEN 'NULL'
    WHEN LENGTH(html_content) = 0 THEN 'EMPTY'
    ELSE CONCAT('EXISTS (', LENGTH(html_content), ' chars)')
  END as html_status
FROM public.document_templates
WHERE template_key = 'pre_incorporation_consent';

-- If no results, the template doesn't exist and needs to be created
-- Run migration: 20250211000017_enhance_templates_with_legal_formatting.sql




