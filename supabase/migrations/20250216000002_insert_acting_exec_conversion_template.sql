-- Insert the Intern → Acting Executive Conversion Letter template
-- Note: Adjust column names based on your document_templates schema
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
  'acting_exec_conversion_letter',
  'Intern to Acting Executive Conversion Letter',
  'executive',
  'Conversion letter for promoting intern to acting executive role with deferred salary and equity eligibility',
  '<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Intern to Acting Executive Conversion Letter</title>
  <style>
    :root { --text:#111; --muted:#666; --line:#e6e6e6; }
    body { margin:0; background:#fff; color:var(--text); font-family: Arial, Helvetica, sans-serif; }
    .page { max-width: 900px; margin: 28px auto; padding: 0 18px; }
    .card { border:1px solid var(--line); border-radius: 12px; padding: 22px; }
    .row { display:flex; gap:18px; flex-wrap:wrap; }
    .col { flex:1; min-width: 260px; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .06em; color:#222; }
    p, li { font-size: 13px; line-height: 1.5; }
    .muted { color: var(--muted); }
    .hr { height:1px; background: var(--line); margin: 16px 0; }
    .meta { font-size: 12px; color: var(--muted); }
    .kvs { width:100%; border-collapse: collapse; }
    .kvs td { border-top:1px solid var(--line); padding: 10px 0; vertical-align: top; font-size: 13px; }
    .kvs td:first-child { width: 220px; color: #333; font-weight: 700; padding-right: 14px; }
    .pill { display:inline-block; border:1px solid var(--line); border-radius: 999px; padding: 4px 10px; font-size: 12px; }
    .sigbox { border:1px dashed var(--line); border-radius: 12px; padding: 14px; }
    .sigline { height: 34px; border-bottom: 1px solid #bbb; margin: 10px 0 6px; }
    .small { font-size: 12px; }
    .foot { margin-top: 14px; font-size: 11px; color: var(--muted); }
    @media print { .page{margin:0; max-width:none;} .card{border:none;} }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="row">
        <div class="col">
          <h1>Intern → Acting Executive Conversion Letter</h1>
          <div class="meta">
            <div><strong>Company:</strong> {{COMPANY_LEGAL_NAME}}</div>
            <div><strong>Document ID:</strong> {{DOCUMENT_ID}}</div>
            <div><strong>Date:</strong> {{EFFECTIVE_DATE}}</div>
          </div>
        </div>
        <div class="col" style="text-align:right;">
          <div class="pill">Status: Conversion</div>
          <div class="meta" style="margin-top:8px;">
            <div><strong>Candidate:</strong> {{CANDIDATE_FULL_NAME}}</div>
            <div><strong>Email:</strong> {{CANDIDATE_EMAIL}}</div>
            <div><strong>Location:</strong> {{CANDIDATE_LOCATION}}</div>
          </div>
        </div>
      </div>
      <div class="hr"></div>
      <p>
        {{CANDIDATE_FIRST_NAME}}, this letter confirms your conversion from <strong>{{CURRENT_ROLE_TITLE}}</strong>
        to <strong>Acting {{NEW_ROLE_TITLE}}</strong> at <strong>{{COMPANY_LEGAL_NAME}}</strong>, effective
        <strong>{{EFFECTIVE_DATE}}</strong>.
      </p>
      <p>
        This appointment is granted based on demonstrated performance, leadership, and founder-level alignment.
        Funding impacts salary liquidity only; it does not affect the legitimacy of your title, authority, or executive eligibility.
      </p>
      <h2>1. Appointment and Reporting</h2>
      <table class="kvs" role="presentation">
        <tr>
          <td>New Title</td>
          <td>Acting {{NEW_ROLE_TITLE}}</td>
        </tr>
        <tr>
          <td>Department</td>
          <td>{{DEPARTMENT_NAME}}</td>
        </tr>
        <tr>
          <td>Reports To</td>
          <td>{{REPORTS_TO_TITLE}} ({{REPORTS_TO_NAME}})</td>
        </tr>
        <tr>
          <td>Authority Scope</td>
          <td>
            {{AUTHORITY_SCOPE_SUMMARY}}
            <div class="small muted" style="margin-top:6px;">
              Boundaries: Decisions outside scope require written approval by {{APPROVAL_AUTHORITY_TITLE}}.
            </div>
          </td>
        </tr>
        <tr>
          <td>Role Type</td>
          <td>Acting Executive (Deputy / Successor Track where applicable)</td>
        </tr>
      </table>
      <h2>2. Performance Mandate</h2>
      <p>
        Your mandate for the acting term is to deliver measurable outcomes in the following priority areas:
      </p>
      <ul>
        <li><strong>90-Day Objectives:</strong> {{OBJECTIVES_90_DAY}}</li>
        <li><strong>Key Deliverables:</strong> {{KEY_DELIVERABLES}}</li>
        <li><strong>KPIs / Scorecard:</strong> {{KPI_SCORECARD_SUMMARY}}</li>
      </ul>
      <h2>3. Deferred Salary Terms</h2>
      <p>
        This role includes a deferred executive salary arrangement. Salary accrues during the deferral period and becomes payable upon the activation trigger(s) defined below.
      </p>
      <table class="kvs" role="presentation">
        <tr>
          <td>Deferred Salary (Annual)</td>
          <td><strong>{{DEFERRED_SALARY_ANNUAL}}</strong></td>
        </tr>
        <tr>
          <td>Accrual Start Date</td>
          <td>{{SALARY_ACCRUAL_START_DATE}}</td>
        </tr>
        <tr>
          <td>Activation Trigger(s)</td>
          <td>{{SALARY_ACTIVATION_TRIGGERS}}</td>
        </tr>
        <tr>
          <td>Payment Mechanics</td>
          <td>{{SALARY_PAYMENT_MECHANICS}}</td>
        </tr>
      </table>
      <h2>4. Equity Eligibility</h2>
      <p>
        You are eligible for an equity grant upon execution of the Company''s equity grant documentation. No equity is issued or transferred by this letter alone.
      </p>
      <table class="kvs" role="presentation">
        <tr>
          <td>Equity Type</td>
          <td>{{EQUITY_TYPE}} (e.g., Options / RSA / Units)</td>
        </tr>
        <tr>
          <td>Target Equity %</td>
          <td><strong>{{EQUITY_PERCENT_TARGET}}</strong> (subject to final grant documentation and approvals)</td>
        </tr>
        <tr>
          <td>Vesting Schedule</td>
          <td>{{VESTING_SCHEDULE}}</td>
        </tr>
        <tr>
          <td>Milestone Conditions</td>
          <td>{{EQUITY_MILESTONE_CONDITIONS}}</td>
        </tr>
      </table>
      <h2>5. Term of Acting Appointment</h2>
      <table class="kvs" role="presentation">
        <tr>
          <td>Acting Term</td>
          <td>{{ACTING_TERM_START}} to {{ACTING_TERM_END}}</td>
        </tr>
        <tr>
          <td>Review Cadence</td>
          <td>{{REVIEW_CADENCE}}</td>
        </tr>
        <tr>
          <td>Conversion Outcomes</td>
          <td>{{CONVERSION_OUTCOMES}} (e.g., permanent officer appointment, extension, role adjustment)</td>
        </tr>
      </table>
      <h2>6. Continuing Obligations</h2>
      <ul>
        <li>All confidentiality, IP assignment, and company policy obligations remain in effect.</li>
        <li>This appointment does not grant authority over restricted systems or "danger zones" unless explicitly stated in writing.</li>
        <li>All equity and deferred compensation are subject to documentation and approval requirements defined by the Company.</li>
      </ul>
      <div class="hr"></div>
      <div class="row">
        <div class="col sigbox">
          <strong>Company Authorized Signer</strong>
          <div class="sigline"></div>
          <div class="small">
            {{CEO_NAME}}, {{CEO_TITLE}}<br/>
            {{COMPANY_LEGAL_NAME}}<br/>
            Date: {{COMPANY_SIGN_DATE}}
          </div>
        </div>
        <div class="col sigbox">
          <strong>Participant Acknowledgment</strong>
          <div class="sigline"></div>
          <div class="small">
            {{CANDIDATE_FULL_NAME}}<br/>
            Date: {{CANDIDATE_SIGN_DATE}}
          </div>
        </div>
      </div>
      <div class="foot">
        Internal Reference: {{INTERNAL_REFERENCE_NOTES}}<br/>
        This letter is intended to be used alongside existing Deferred Salary and Equity Grant/Option agreements.
      </div>
    </div>
  </div>
</body>
</html>',
  '["COMPANY_LEGAL_NAME", "DOCUMENT_ID", "EFFECTIVE_DATE", "CANDIDATE_FULL_NAME", "CANDIDATE_FIRST_NAME", "CANDIDATE_EMAIL", "CANDIDATE_LOCATION", "CURRENT_ROLE_TITLE", "NEW_ROLE_TITLE", "DEPARTMENT_NAME", "REPORTS_TO_TITLE", "REPORTS_TO_NAME", "AUTHORITY_SCOPE_SUMMARY", "APPROVAL_AUTHORITY_TITLE", "OBJECTIVES_90_DAY", "KEY_DELIVERABLES", "KPI_SCORECARD_SUMMARY", "DEFERRED_SALARY_ANNUAL", "SALARY_ACCRUAL_START_DATE", "SALARY_ACTIVATION_TRIGGERS", "SALARY_PAYMENT_MECHANICS", "EQUITY_TYPE", "EQUITY_PERCENT_TARGET", "VESTING_SCHEDULE", "EQUITY_MILESTONE_CONDITIONS", "ACTING_TERM_START", "ACTING_TERM_END", "REVIEW_CADENCE", "CONVERSION_OUTCOMES", "CEO_NAME", "CEO_TITLE", "COMPANY_SIGN_DATE", "CANDIDATE_SIGN_DATE", "INTERNAL_REFERENCE_NOTES"]'::jsonb,
  true,
  now(),
  now()
)
ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  placeholders = EXCLUDED.placeholders,
  updated_at = now();

