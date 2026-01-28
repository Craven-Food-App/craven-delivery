-- Add CEO signature to stock certificate template
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '    <div class="signature">
      position: absolute;
      right: 0.65in;
      bottom: 0.78in;
      z-index: 3;
      text-align: center;
      width: 2.9in;
    }
    .sig-name{',
  '    .signature{
      position: absolute;
      right: 0.65in;
      bottom: 0.78in;
      z-index: 3;
      text-align: center;
      width: 2.9in;
    }
    .sig-img{
      width: 2.55in;
      height: auto;
      display: block;
      margin: 0 auto 0.04in;
    }
    .sig-name{'
)
WHERE template_key = 'stock_certificate';

UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '    <div class="footer">
      This certificate may be issued in digital form. Ownership is determined by the Company''s official stock ledger.
    </div>',
  '    <div class="signature">
      <img class="sig-img" src="{{signature_url}}" alt="CEO Signature" />
      <p class="sig-name">Torrance A. Stroman</p>
      <p class="sig-title">Chief Executive Officer</p>
    </div>

    <div class="footer">
      This certificate may be issued in digital form. Ownership is determined by the Company''s official stock ledger.
    </div>'
)
WHERE template_key = 'stock_certificate';

