-- Insert exit and reversion document templates
-- Provides clean off-ramps and failure paths

-- 1. Intern Exit Letter Template
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'intern_exit_letter',
  'Intern Exit Letter',
  'executive',
  'Formal exit letter for intern role termination',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Intern Exit Letter</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Intern Exit Letter</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter confirms the conclusion of your internship at {{COMPANY_LEGAL_NAME}}, effective {{EFFECTIVE_DATE}}.</p>
<h2>Exit Details</h2>
<table class="kvs">
<tr><td>Last Day</td><td>{{EFFECTIVE_DATE}}</td></tr>
<tr><td>Reason</td><td>{{EXIT_REASON}}</td></tr>
<tr><td>Final Review Rating</td><td>{{FINAL_RATING}}/100</td></tr>
</table>
<h2>Next Steps</h2>
<p>{{NEXT_STEPS}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "EFFECTIVE_DATE", "EXIT_REASON", "FINAL_RATING", "NEXT_STEPS", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

-- 2. Acting Executive Reversion Letter
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'acting_exec_reversion_letter',
  'Acting Executive Reversion Letter',
  'executive',
  'Reversion of acting executive to previous role',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Acting Executive Reversion</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Acting Executive Role Reversion</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter confirms the reversion of your role from <strong>Acting {{PREVIOUS_TITLE}}</strong> to <strong>{{NEW_TITLE}}</strong> at {{COMPANY_LEGAL_NAME}}, effective {{EFFECTIVE_DATE}}.</p>
<h2>Reversion Details</h2>
<table class="kvs">
<tr><td>Previous Title</td><td>Acting {{PREVIOUS_TITLE}}</td></tr>
<tr><td>New Title</td><td>{{NEW_TITLE}}</td></tr>
<tr><td>Effective Date</td><td>{{EFFECTIVE_DATE}}</td></tr>
<tr><td>Reason</td><td>{{REVERSION_REASON}}</td></tr>
</table>
<h2>Authority Changes</h2>
<p>{{AUTHORITY_CHANGES}}</p>
<h2>Compensation</h2>
<p>{{COMPENSATION_ADJUSTMENTS}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "PREVIOUS_TITLE", "NEW_TITLE", "EFFECTIVE_DATE", "REVERSION_REASON", "AUTHORITY_CHANGES", "COMPENSATION_ADJUSTMENTS", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

-- 3. Performance Failure Notice (Soft)
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'performance_failure_notice_soft',
  'Performance Improvement Notice (Soft)',
  'executive',
  'First warning for performance issues with improvement plan',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Performance Improvement Notice</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Performance Improvement Plan</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter outlines performance concerns and establishes a formal improvement plan for your role as {{CURRENT_TITLE}} at {{COMPANY_LEGAL_NAME}}.</p>
<h2>Performance Concerns</h2>
<p>{{PERFORMANCE_CONCERNS}}</p>
<h2>Improvement Plan</h2>
<ul>
<li><strong>Review Period:</strong> {{IMPROVEMENT_PERIOD}}</li>
<li><strong>Expected Outcomes:</strong> {{EXPECTED_OUTCOMES}}</li>
<li><strong>Support Provided:</strong> {{SUPPORT_PROVIDED}}</li>
</ul>
<h2>Consequences</h2>
<p>{{CONSEQUENCES}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "CURRENT_TITLE", "PERFORMANCE_CONCERNS", "IMPROVEMENT_PERIOD", "EXPECTED_OUTCOMES", "SUPPORT_PROVIDED", "CONSEQUENCES", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

-- 4. Performance Failure Notice (Final)
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'performance_failure_notice_final',
  'Final Performance Termination Notice',
  'executive',
  'Final termination notice after failed improvement plan',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Final Performance Notice</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; color: #cc0000; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Final Performance Termination Notice</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter serves as formal notice that your employment with {{COMPANY_LEGAL_NAME}} in the role of {{CURRENT_TITLE}} will be terminated effective {{TERMINATION_DATE}} due to continued performance deficiencies.</p>
<h2>Termination Details</h2>
<table class="kvs">
<tr><td>Effective Date</td><td>{{TERMINATION_DATE}}</td></tr>
<tr><td>Reason</td><td>Performance - Failure to meet improvement plan requirements</td></tr>
<tr><td>Final Review Rating</td><td>{{FINAL_RATING}}/100</td></tr>
</table>
<h2>Performance Summary</h2>
<p>{{PERFORMANCE_SUMMARY}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "CURRENT_TITLE", "TERMINATION_DATE", "FINAL_RATING", "PERFORMANCE_SUMMARY", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

-- 5. Authority Revocation Notice
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'authority_revocation_notice',
  'Authority Revocation Notice',
  'executive',
  'Notice of authority scope reduction or revocation',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Authority Revocation Notice</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Authority Revocation Notice</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter formally revokes or reduces your authority scope in the role of {{CURRENT_TITLE}} at {{COMPANY_LEGAL_NAME}}, effective {{EFFECTIVE_DATE}}.</p>
<h2>Revocation Details</h2>
<table class="kvs">
<tr><td>Effective Date</td><td>{{EFFECTIVE_DATE}}</td></tr>
<tr><td>Reason</td><td>{{REVOCATION_REASON}}</td></tr>
</table>
<h2>Authority Changes</h2>
<p><strong>Revoked:</strong> {{REVOKED_AUTHORITIES}}</p>
<p><strong>Retained:</strong> {{RETAINED_AUTHORITIES}}</p>
<h2>Next Steps</h2>
<p>{{NEXT_STEPS}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "CURRENT_TITLE", "EFFECTIVE_DATE", "REVOCATION_REASON", "REVOKED_AUTHORITIES", "RETAINED_AUTHORITIES", "NEXT_STEPS", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

-- 6. Executive Appointment Confirmation Letter
INSERT INTO public.document_templates (
  template_key, name, category, description, html_content, placeholders, is_active, created_at, updated_at
) VALUES (
  'executive_appointment_confirmation',
  'Executive Appointment Confirmation Letter',
  'executive',
  'Confirmation of permanent executive officer appointment after acting period',
  '<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><title>Executive Appointment Confirmation</title>
<style>
:root { --text:#111; --muted:#666; --line:#e6e6e6; }
body { margin:0; background:#fff; color:var(--text); font-family: Arial, sans-serif; }
.page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
.card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
h1 { font-size: 20px; margin: 0 0 10px; }
h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
p, li { font-size: 13px; line-height: 1.5; }
.hr { height:1px; background: var(--line); margin: 16px 0; }
.kvs { width:100%; border-collapse: collapse; }
.kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
.kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
@media print { .page{margin:0; max-width:none;} .card{border:none;} }
</style>
</head>
<body>
<div class="page"><div class="card">
<h1>Executive Officer Appointment Confirmation</h1>
<div class="hr"></div>
<p>Dear {{CANDIDATE_FIRST_NAME}},</p>
<p>This letter confirms your appointment as <strong>{{NEW_TITLE}}</strong> at {{COMPANY_LEGAL_NAME}}, effective {{EFFECTIVE_DATE}}, following successful completion of your acting period.</p>
<h2>Appointment Details</h2>
<table class="kvs">
<tr><td>Title</td><td>{{NEW_TITLE}}</td></tr>
<tr><td>Effective Date</td><td>{{EFFECTIVE_DATE}}</td></tr>
<tr><td>Department</td><td>{{DEPARTMENT_NAME}}</td></tr>
<tr><td>Reports To</td><td>{{REPORTS_TO_TITLE}} ({{REPORTS_TO_NAME}})</td></tr>
</table>
<h2>Acting Period Performance</h2>
<p>Your performance during the acting period ({{ACTING_PERIOD_START}} to {{ACTING_PERIOD_END}}) demonstrated {{PERFORMANCE_SUMMARY}}.</p>
<h2>Equity & Compensation</h2>
<p>{{EQUITY_DETAILS}}</p>
<div class="hr"></div>
<p>{{CEO_NAME}}, {{CEO_TITLE}}<br/>{{COMPANY_LEGAL_NAME}}<br/>{{SIGN_DATE}}</p>
</div></div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_FULL_NAME", "NEW_TITLE", "EFFECTIVE_DATE", "DEPARTMENT_NAME", "REPORTS_TO_TITLE", "REPORTS_TO_NAME", "ACTING_PERIOD_START", "ACTING_PERIOD_END", "PERFORMANCE_SUMMARY", "EQUITY_DETAILS", "CEO_NAME", "CEO_TITLE", "SIGN_DATE"]'::jsonb,
  true, now(), now()
) ON CONFLICT (template_key) DO UPDATE SET html_content = EXCLUDED.html_content, placeholders = EXCLUDED.placeholders, updated_at = now();

