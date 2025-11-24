-- Ensure all required appointment document templates exist
-- This migration ensures templates are created even if previous migrations failed

-- Offer Letter Template (for appointment letters)
INSERT INTO public.document_templates (
  template_key,
  name,
  description,
  category,
  html_content,
  placeholders,
  is_active,
  created_at,
  updated_at
) VALUES (
  'offer_letter',
  'Executive Appointment Letter',
  'Template for executive appointment letters',
  'governance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Appointment Letter</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .date {
      text-align: right;
      margin-bottom: 20px;
    }
    .content {
      margin: 30px 0;
    }
    .signature {
      margin-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 300px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">{{company_name}}</div>
  </div>
  
  <div class="date">
    {{date}}
  </div>
  
  <div class="content">
    <p>{{full_name}}</p>
    <p>{{proposed_officer_email}}</p>
    
    <p>Dear {{full_name}},</p>
    
    <p>We are pleased to offer you the position of <strong>{{title}}</strong> at {{company_name}}, effective {{effective_date}}.</p>
    
    <h3>Position Details</h3>
    <p><strong>Title:</strong> {{title}}</p>
    <p><strong>Effective Date:</strong> {{effective_date}}</p>
    <p><strong>Term Length:</strong> {{term_length_months}} months</p>
    
    <h3>Compensation</h3>
    <p><strong>Annual Base Salary:</strong> ${{annual_salary}}</p>
    <p><strong>Equity:</strong> {{equity_percentage}}% ({{share_count}} shares)</p>
    
    <h3>Authority and Responsibilities</h3>
    <p>{{authority_granted}}</p>
    
    <p>We look forward to your acceptance of this appointment and to working with you in this capacity.</p>
    
    <p>Sincerely,</p>
    
    <div class="signature">
      <div class="signature-line"></div>
      <p>Board of Directors<br>{{company_name}}</p>
    </div>
  </div>
</body>
</html>',
  '["full_name", "title", "company_name", "effective_date", "annual_salary", "equity_percentage", "share_count", "authority_granted", "date", "proposed_officer_email", "term_length_months"]'::jsonb,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  is_active = true,
  updated_at = now();

-- Board Resolution Template
INSERT INTO public.document_templates (
  template_key,
  name,
  description,
  category,
  html_content,
  placeholders,
  is_active,
  created_at,
  updated_at
) VALUES (
  'board_resolution',
  'Board Resolution',
  'Template for board resolutions',
  'governance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Board Resolution</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .resolution-number {
      text-align: right;
      margin-bottom: 20px;
      font-weight: bold;
    }
    .content {
      margin: 30px 0;
    }
    .whereas {
      margin: 15px 0;
      text-indent: 20px;
    }
    .resolved {
      margin: 20px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">{{company_name}}</div>
    <div>BOARD RESOLUTION</div>
  </div>
  
  <div class="resolution-number">
    Resolution No. {{resolution_number}}
  </div>
  
  <div class="date">
    Date: {{resolution_date}}
  </div>
  
  <div class="content">
    <p class="whereas">WHEREAS, the Board of Directors of {{company_name}} desires to appoint an executive officer;</p>
    
    <p class="whereas">WHEREAS, {{full_name}} has been proposed for the position of {{title}};</p>
    
    <p class="whereas">WHEREAS, the Board has reviewed and approved the terms of this appointment;</p>
    
    <p class="resolved">NOW, THEREFORE, BE IT RESOLVED:</p>
    
    <p>1. That {{full_name}} is hereby appointed as {{title}} of {{company_name}}, effective {{effective_date}}.</p>
    
    <p>2. That the terms of this appointment include:</p>
    <ul>
      <li>Annual base salary of ${{annual_salary}}</li>
      <li>Equity grant of {{equity_percentage}}% ({{share_count}} shares)</li>
      <li>Term length of {{term_length_months}} months</li>
    </ul>
    
    <p>3. That {{full_name}} is granted the following authority: {{authority_granted}}</p>
    
    <p>4. That this resolution shall take effect immediately upon adoption.</p>
    
    <p>Adopted by the Board of Directors on {{resolution_date}}.</p>
    
    <div style="margin-top: 60px;">
      <div style="border-top: 1px solid #000; width: 300px; margin-top: 50px;"></div>
      <p>Secretary<br>{{company_name}}</p>
    </div>
  </div>
</body>
</html>',
  '["full_name", "title", "company_name", "effective_date", "annual_salary", "equity_percentage", "share_count", "authority_granted", "resolution_number", "resolution_date", "term_length_months"]'::jsonb,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  is_active = true,
  updated_at = now();

-- Employment Agreement Template
INSERT INTO public.document_templates (
  template_key,
  name,
  description,
  category,
  html_content,
  placeholders,
  is_active,
  created_at,
  updated_at
) VALUES (
  'employment_agreement',
  'Executive Employment Agreement',
  'Template for executive employment agreements',
  'governance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Employment Agreement</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      margin: 30px 0;
    }
    h3 {
      margin-top: 30px;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">{{company_name}}</div>
    <div>EXECUTIVE EMPLOYMENT AGREEMENT</div>
  </div>
  
  <div class="content">
    <p>This Executive Employment Agreement ("Agreement") is entered into on {{date}} between {{company_name}} ("Company") and {{full_name}} ("Executive").</p>
    
    <h3>1. Position and Duties</h3>
    <p>Executive shall serve as {{title}} of the Company, effective {{effective_date}}. Executive shall have such duties and responsibilities as are customary for such position and as may be assigned by the Board of Directors.</p>
    
    <h3>2. Authority</h3>
    <p>{{authority_granted}}</p>
    
    <h3>3. Compensation</h3>
    <p>Executive shall receive an annual base salary of ${{annual_salary}}, payable in accordance with the Company''s standard payroll practices.</p>
    <p>Executive shall also receive an equity grant of {{equity_percentage}}% ({{share_count}} shares) in the Company.</p>
    
    <h3>4. Term</h3>
    <p>This Agreement shall have a term of {{term_length_months}} months, commencing on {{effective_date}}.</p>
    
    <h3>5. General Provisions</h3>
    <p>This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings relating to the subject matter hereof.</p>
    
    <p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>
    
    <div style="margin-top: 60px;">
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
    </div>
  </div>
</body>
</html>',
  '["full_name", "title", "company_name", "effective_date", "annual_salary", "equity_percentage", "share_count", "authority_granted", "date", "term_length_months"]'::jsonb,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  is_active = true,
  updated_at = now();

-- Stock Certificate Template
INSERT INTO public.document_templates (
  template_key,
  name,
  description,
  category,
  html_content,
  placeholders,
  is_active,
  created_at,
  updated_at
) VALUES (
  'stock_certificate',
  'Stock Certificate',
  'Template for stock certificates issued to executives',
  'governance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Stock Certificate - {{executive_name}}</title>
  <style>
    body { font-family: "Times New Roman", serif; font-size: 14px; }
    .certificate {
      width: 900px;
      margin: 40px auto;
      padding: 40px;
      border: 4px double #000;
    }
    .title { text-align: center; font-size: 22px; font-weight: bold; text-transform: uppercase; }
    .subtitle { text-align: center; font-size: 14px; margin-bottom: 20px; }
    .center { text-align: center; }
    .big { font-size: 20px; font-weight: bold; }
    .signature-row { margin-top: 60px; display: flex; justify-content: space-between; }
    .sig-block { width: 40%; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-top: 40px; }
  </style>
</head>
<body>
<div class="certificate">
  <div class="title">{{company_name}}</div>
  <div class="subtitle">Incorporated in {{company_state}}</div>

  <p class="center big">STOCK CERTIFICATE</p>

  <p class="center">
    Certificate No.: {{certificate_number}}<br />
    Number of Shares: {{number_of_shares}}
  </p>

  <p>
    THIS CERTIFIES that <strong>{{executive_name}}</strong> is the record holder of
    <strong>{{number_of_shares}}</strong> fully paid and non-assessable shares of
    <strong>{{share_class}}</strong> stock of <strong>{{company_name}}</strong> (the "Company"),
    transferable only on the books of the Company by the holder hereof in person or by duly authorized
    attorney upon surrender of this Certificate properly endorsed.
  </p>

  <p>
    This Certificate and the shares represented hereby are subject to all of the provisions of the
    Company''s Articles/Certificate of Incorporation, Bylaws, and any applicable Shareholders''
    Agreement (each as amended from time to time), and may be subject to restrictions on transfer
    under such documents and under applicable securities laws.
  </p>

  <p class="center">IN WITNESS WHEREOF, the Company has caused this Certificate to be executed by its duly authorized officers as of {{issue_date}}.</p>

  <div class="signature-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <p>{{company_signatory_name}}<br />{{company_signatory_title}}</p>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <p>{{secretary_name}}<br />Secretary</p>
    </div>
  </div>

</div>
</body>
</html>',
  '["executive_name", "full_name", "name", "proposed_officer_name", "title", "proposed_title", "company_name", "company_state", "certificate_number", "number_of_shares", "share_count", "share_class", "issue_date", "effective_date", "date", "company_signatory_name", "company_signatory_title", "secretary_name", "equity_percentage", "vesting_schedule", "exercise_price", "proposed_officer_email", "proposed_officer_phone", "reporting_to", "department", "annual_salary", "base_salary", "annual_bonus_percentage", "performance_bonus", "benefits", "appointment_type", "board_meeting_date", "authority_granted", "term_length_months", "notes"]'::jsonb,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  is_active = true,
  updated_at = now();





