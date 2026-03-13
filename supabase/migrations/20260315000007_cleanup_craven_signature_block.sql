-- Cleanup legacy Crave'n, Inc. company-side signature blocks
-- This targets any remaining "Very truly yours" blocks that still render:
-- - a blank horizontal line above "Craven, Inc."
-- - a "By: _________" line above Torrance's signature image
-- on the company (Crave'n) side of executive documents.

-- 1) Remove the blank underline that appears directly above "Craven, Inc."
-- We collapse the pattern:
--   <p>_________________________</p>
--   <p><strong>Craven, Inc.</strong></p>
-- into just:
--   <p><strong>Craven, Inc.</strong></p>
UPDATE public.document_templates
SET html_content = regexp_replace(
  html_content,
  '(<p[^>]*>_+\s*</p>\s*<p[^>]*><strong>Craven,\s*Inc\.\s*</strong></p>)',
  '<p><strong>Craven, Inc.</strong></p>',
  'gi'
)
WHERE html_content LIKE '%Craven, Inc.%'
  AND html_content ~ '<p[^>]*>_+\s*</p>';

-- 2) Remove any "By: ______" company-side line that appears before
-- Torrance''s signature or other company signatory content.
-- This is intentionally broad but only affects templates that contain "By:"
-- and "Craven, Inc." to avoid touching unrelated documents.
UPDATE public.document_templates
SET html_content = regexp_replace(
  html_content,
  '<p[^>]*>By:\s*_+\s*</p>\s*',
  '',
  'gi'
)
WHERE html_content LIKE '%Craven, Inc.%'
  AND html_content ~ '<p[^>]*>By:\s*_+';

