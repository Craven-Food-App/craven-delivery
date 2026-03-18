UPDATE public.document_templates 
SET html_content = (
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        html_content,
        '<li><strong>Chief Technology Officer:</strong> Nathan Curry</li>',
        '<li><strong>Chief Technology Officer:</strong> To be appointed by the Board</li>'
      ),
      '<li><strong>Chief Experience Officer:</strong> Terri Crawford</li>',
      '<li><strong>Chief Experience Officer:</strong> To be appointed by the Board</li>'
    ),
    '<div class="signature-row">\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Torrance Stroman<br />\s*Chief Executive Officer &amp; Director\s*</div>\s*</div>\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Justin Sweet<br />\s*Chief Financial Officer\s*</div>\s*</div>\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Nathan Curry<br />\s*Chief Technology Officer\s*</div>\s*</div>\s*</div>\s*<div class="signature-row">\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Terri Crawford<br />\s*Chief Experience Officer\s*</div>\s*</div>\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Secretary \(if other than above\)<br />\s*Title: Secretary\s*</div>\s*</div>\s*<div class="signature-block">\s*<div class="signature-line"></div>\s*<div class="signature-label">\s*Director<br />\s*\(Additional Board Member, if applicable\)\s*</div>\s*</div>\s*</div>',
    '<div class="signature-row">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">
            Torrance Stroman<br />
            Chief Executive Officer, Founder &amp; Sole Director
          </div>
        </div>
      </div>'
  )
  FROM document_templates WHERE id = '681d002d-69a9-4990-a599-47e904bedbe1'
),
updated_at = now()
WHERE id = '681d002d-69a9-4990-a599-47e904bedbe1';