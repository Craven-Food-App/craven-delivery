-- Seed Fortune 500 Executive Appointment Templates into document_templates
INSERT INTO document_templates (template_key, name, category, description, placeholders, is_active, html_content, created_at, updated_at)
VALUES
  ('certificate_of_incorporation', 'Certificate of Incorporation', 'governance', 'Delaware Certificate of Incorporation', 
   '["company_name","state","registered_office","registered_agent_name","total_authorized_shares","par_value","incorporator_name","board_members","board_count","incorporation_date_iso","principal_office_address"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('bylaws_acknowledgment', 'Bylaws Acknowledgment & Consent', 'executive', 'Executive acknowledgment of corporate bylaws', 
   '["company_name","officer_name","title","current_date","bylaws_adoption_date"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('fiduciary_duty_ethics', 'Fiduciary Duty & Ethics Acknowledgment', 'executive', 'Ethics and fiduciary duty acknowledgment', 
   '["company_name","officer_name","title","current_date"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('conflict_of_interest_disclosure', 'Conflict of Interest Disclosure', 'executive', 'Conflict of interest disclosure form', 
   '["company_name","officer_name","title","current_date"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('officer_indemnification', 'Officer Indemnification Agreement', 'executive', 'D&O liability indemnification', 
   '["company_name","officer_name","title","current_date","state"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('equity_incentive_plan', '2025 Equity Incentive Plan', 'equity', 'Company equity incentive plan', 
   '["company_name","equity_pool_shares","par_value","plan_effective_date","plan_adoption_date","state"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('option_rsu_award', 'Option/RSU Award Agreement', 'equity', 'Individual equity award agreement', 
   '["company_name","officer_name","title","award_type","shares_granted","strike_price","grant_date","vesting_schedule","cliff_period","ceo_name"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW()),
  ('bylaws_complete', 'Corporate Bylaws (Complete)', 'governance', 'Full corporate bylaws', 
   '["company_name","state_of_incorporation","adoption_date","authorized_shares","par_value"]'::jsonb, true, 
   (SELECT html_content FROM document_templates WHERE template_key = 'pre_incorporation_consent' LIMIT 1), NOW(), NOW())
ON CONFLICT (template_key) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description, placeholders = EXCLUDED.placeholders, is_active = true, updated_at = NOW();