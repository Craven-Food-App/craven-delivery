-- Ensure Torrance Stroman's signature image is used consistently
-- across all Crave'n-side templates and clearly mark the executive
-- signature block for the new appointee.
--
-- 1) Anywhere the literal name "Torrance Stroman" appears in a template,
--    replace it with an image-based signature followed by his name.
--    This is intentionally broad but scoped only to templates that actually
--    reference his name.
UPDATE public.document_templates
SET html_content = regexp_replace(
  html_content,
  '(Torrance\\s+Stroman)',
  '<img src="https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/torrance_stroman_signature.png" alt="Torrance Stroman Signature" style="height:60px;object-fit:contain;" /><br />Torrance Stroman',
  'gi'
)
WHERE html_content ILIKE '%Torrance Stroman%';

-- 2) For officer/CEO acceptance blocks where the executive (new appointee)
--    signs, replace the generic "Officer:" / "Chief Executive Officer:"
--    labels with an explicit "Executive Signature" label so it is
--    unambiguous where the appointee must sign.
--
-- Officer acceptance (generic officer label)
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<div class="signature-line"></div>
<p><strong>Officer:</strong> {{officer_name}}</p>',
  '<div class="signature-line"></div>
<p><strong>Executive Signature:</strong> {{officer_name}}</p>'
)
WHERE html_content LIKE '%<div class="signature-line"></div>%<p><strong>Officer:</strong> {{officer_name}}</p>%';

-- CEO acceptance (explicit CEO label)
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<div class="signature-line"></div>
<p><strong>Chief Executive Officer:</strong> {{executive_name}}</p>',
  '<div class="signature-line"></div>
<p><strong>Executive Signature (Chief Executive Officer):</strong> {{executive_name}}</p>'
)
WHERE html_content LIKE '%<div class="signature-line"></div>%<p><strong>Chief Executive Officer:</strong> {{executive_name}}</p>%';

-- In case some templates use a slightly different formatting for CEO acceptance
-- (for example using officer_name instead of executive_name), add a broader
-- replacement for that pattern as well.
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<div class="signature-line"></div>
<p><strong>Chief Executive Officer:</strong> {{officer_name}}</p>',
  '<div class="signature-line"></div>
<p><strong>Executive Signature (Chief Executive Officer):</strong> {{officer_name}}</p>'
)
WHERE html_content LIKE '%<div class="signature-line"></div>%<p><strong>Chief Executive Officer:</strong> {{officer_name}}</p>%';

