-- Insert certificate_of_incorporation template with proper JSONB placeholders
INSERT INTO public.document_templates (
  template_key,
  name,
  category,
  description,
  html_content,
  placeholders,
  is_active,
  created_at,
  updated_at
) VALUES (
  'certificate_of_incorporation',
  'Certificate of Incorporation',
  'formation',
  'Legal certificate of incorporation filed with the state',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Incorporation - {{company_name}}</title>
  <style>
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      text-transform: uppercase;
      font-size: 18pt;
      margin-bottom: 30px;
    }
    h2 {
      font-size: 14pt;
      text-transform: uppercase;
      margin-top: 20px;
    }
    p {
      margin: 10px 0;
    }
    .signature-section {
      margin-top: 60px;
      border-top: 1px solid #ccc;
      padding-top: 30px;
    }
    .signature-line {
      border-bottom: 1px solid #ccc;
      width: 300px;
      margin: 30px 0 5px 0;
    }
  </style>
</head>
<body>
  <h1>Certificate of Incorporation</h1>
  <h1>{{company_name}}</h1>

  <h2>Article I - Name</h2>
  <p>The name of this corporation is <strong>{{company_name}}</strong>.</p>

  <h2>Article II - Registered Office</h2>
  <p>The address of the registered office of the corporation in the State of {{state_of_incorporation}} is:</p>
  <p><strong>{{registered_office}}</strong></p>
  <p>The name of the registered agent at such address is: <strong>{{registered_agent_name}}</strong></p>

  <h2>Article III - Purpose</h2>
  <p>The purpose of the corporation is to engage in any lawful act or activity for which corporations may be organized under the General Corporation Law of {{state_of_incorporation}}.</p>

  <h2>Article IV - Capital Stock</h2>
  <p>The total number of shares of stock which the corporation shall have authority to issue is <strong>100,000,000</strong> shares of Common Stock, par value $<strong>0.0001</strong> per share.</p>

  <h2>Article V - Incorporator</h2>
  <p>The name and address of the incorporator is:</p>
  <p><strong>{{incorporator_name}}</strong><br />
  {{incorporator_address}}</p>

  <h2>Article VI - Directors</h2>
  <p>The number of directors constituting the initial Board of Directors is <strong>2</strong>, and the names and addresses of the persons who are to serve as the initial directors are:</p>
  <ul>
    <li>{{director_1_name}} - {{director_1_email}}</li>
    <li>{{director_2_name}} - {{director_2_email}}</li>
  </ul>

  <h2>Article VII - Limitation of Liability</h2>
  <p>A director of the corporation shall not be personally liable to the corporation or its stockholders for monetary damages for breach of fiduciary duty as a director, except to the extent such exemption from liability or limitation thereof is not permitted under the General Corporation Law of {{state_of_incorporation}}.</p>

  <div class="signature-section">
    <p>IN WITNESS WHEREOF, the undersigned, being the incorporator herein, has executed this Certificate of Incorporation on <strong>{{effective_date}}</strong>.</p>
    
    <div class="signature-line"></div>
    <p><strong>{{incorporator_name}}</strong><br />Incorporator</p>
  </div>
</body>
</html>',
  jsonb_build_array(
    'company_name',
    'state_of_incorporation',
    'registered_office',
    'registered_agent_name',
    'incorporator_name',
    'incorporator_address',
    'director_1_name',
    'director_1_email',
    'director_2_name',
    'director_2_email',
    'effective_date'
  ),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  is_active = true,
  updated_at = NOW();