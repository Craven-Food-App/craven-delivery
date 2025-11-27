-- Delete incorrectly seeded templates with placeholder content
DELETE FROM document_templates 
WHERE template_key IN (
  'certificate_of_incorporation',
  'bylaws_complete', 
  'pre_incorporation_consent',
  'bylaws_acknowledgment',
  'fiduciary_duty_ethics',
  'conflict_of_interest_disclosure',
  'officer_indemnification',
  'equity_incentive_plan',
  'option_rsu_award'
)
AND html_content LIKE '%Pre-Incorporation Written Consent of S%';