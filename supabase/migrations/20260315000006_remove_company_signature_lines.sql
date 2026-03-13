-- Remove explicit signature lines on the Crave'n (company) side
-- and rely on the embedded company_signatory_name (image) + title instead.

-- 1) For all templates that use the "By: _________________________" pattern
-- with company_signatory_name/company_signatory_title, replace it with a
-- simple name + title block (no underline, no "By:" label).
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<p style="margin-top: 36pt;">By: _________________________</p>
      <p>{{company_signatory_name}}<br>{{company_signatory_title}}</p>',
  '<p>{{company_signatory_name}}</p>
      <p>{{company_signatory_title}}</p>'
)
WHERE html_content LIKE '%By: _________________________%</p>%{{company_signatory_name}}<br>{{company_signatory_title}}%';

-- 2) Remove secretary signature lines in bylaws-style templates on the company side
-- (both the enhanced and the earlier pre-incorporation versions).

-- Enhanced bylaws: plain paragraph with Secretary line
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<p>Secretary: _________________________</p>',
  '<p>Secretary</p>'
)
WHERE html_content LIKE '%Secretary: _________________________%</p>%';

-- Pre-incorporation bylaws: small text variant
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<p class="small">Secretary: __________________________</p>',
  '<p class="small">Secretary</p>'
)
WHERE html_content LIKE '%<p class="small">Secretary: __________________________</p>%';

