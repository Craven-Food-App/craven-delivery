-- Set Torrance Stroman signature URL in company_settings so documents can use it
INSERT INTO public.company_settings (setting_key, setting_value, created_at, updated_at)
VALUES (
  'torrance_signature_url',
  'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/torrance_stroman_signature.png',
  now(),
  now()
)
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = EXCLUDED.setting_value,
  updated_at    = now();

-- Update appointment/employment templates to embed the company signatory signature image
-- Replace the legacy double-line signature block with an image-based company signature on the left
UPDATE public.document_templates
SET html_content = REPLACE(
  html_content,
  '<div style="margin-top: 60px;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <div style="border-top: 1px solid #000; width: 300px; margin-top: 50px;"></div>
          <p>{{company_name}}</p>
        </div>
        <div>
          <div style="border-top: 1px solid #000; width: 300px; margin-top: 50px;"></div>
          <p>{{full_name}}</p>
        </div>
      </div>
    </div>',
  '<div style="margin-top: 60px;">
      <div style="display: flex; justify-content: space-between;">
        <div style="text-align: left;">
          {{company_signatory_name}}
          <p style="margin-top: 4px;">{{company_signatory_title}}</p>
          <p style="margin-top: 0;">{{company_name}}</p>
        </div>
        <div style="text-align: left;">
          <div style="border-top: 1px solid #000; width: 300px; margin-top: 50px;"></div>
          <p>{{full_name}}</p>
        </div>
      </div>
    </div>'
)
WHERE html_content LIKE '%border-top: 1px solid #000; width: 300px; margin-top: 50px;%{{company_name}}%{{full_name}}%';

