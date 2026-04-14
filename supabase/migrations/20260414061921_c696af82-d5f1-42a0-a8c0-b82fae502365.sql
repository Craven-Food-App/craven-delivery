UPDATE document_templates
SET html_content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(html_content, 
        'Authorized Shares: 100,000,000', 
        'Authorized Shares: 70,000,000'),
      'Fourteen Million (14,000,000)',
      'Fourteen Million Seven Hundred Thousand (14,700,000)'),
    '14,000,000',
    '14,700,000'),
  '100,000,000',
  '70,000,000'),
  updated_at = NOW()
WHERE template_key = 'equity_incentive_plan';