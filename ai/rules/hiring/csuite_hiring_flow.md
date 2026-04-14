# ⚙️ **Crave’n Inc. – C-Suite Hiring & Appointment Automation Rule**

```md
# Purpose
Define how Cursor automates the appointment of new C-class executives (CEO, COO, CFO, CTO, CXO, CMO, CRO, CPO, CDO, CHRO, CLO, CSO, General Admin) for Crave'n Inc.
This process generates all required legal documents, records equity, and manages deferred-salary logic.

---

## Trigger
When an admin user selects “Add New Executive” or “Appoint C-Level Role” inside the Crave’n Admin Dashboard.

---

## Step 1: Prompt for Required Executive Data
Cursor must prompt for and collect the following variables:

```

executive_name:
executive_title: [CEO, COO, CFO, CTO, CXO, CMO, CRO, CPO, CDO, CHRO, CLO, CSO, Admin]
start_date:
equity_percent:
shares_issued:
equity_type: (default "Common Stock")
vesting_schedule: (default "4 years, 1-year cliff; 25% after 12 months, remainder monthly over 36 months")
strike_price: (default "$0.001 per share")
annual_salary: (default "90000")
governing_law: (default "Ohio")

```

---

## Step 2: Deferred Salary Option
Include a checkbox or toggle labeled:

> **“Defer Salary Until Funding?”**

If checked:
```

salary_status = "deferred"
deferred_salary_clause = true
funding_trigger = 500000 (default USD)

```

If unchecked:
```

salary_status = "active"
deferred_salary_clause = false
funding_trigger = null

```

When deferred is selected, Cursor must insert the following clause into the generated Offer Letter and Deferred Compensation Agreement:

> **Deferred Salary Clause:**  
> “The Executive acknowledges that Crave’n Inc. is in an early, pre-revenue stage and will initially serve on an equity-only basis.  
> Upon the Company achieving a Funding Event—defined as closing a capital raise of at least $500,000 USD or achieving positive cash flow for three consecutive months—the Executive shall begin receiving a base annual salary of ${{annual_salary}} USD, payable according to standard payroll practices.  
> No back pay or retroactive wages shall accrue prior to the Funding Event.”

---

## Step 3: Document Generation
For every new executive, Cursor must generate and fill templates from `/legal/templates/` with collected variables.

**Templates:**
1. `EquityOfferAgreement.md`
2. `DeferredCompensationAgreement.md` *(only if deferred_salary_clause = true)*
3. `BoardResolution_OfficerAppointment.md`

All generated documents are to be saved in:
```

/legal/executives/{{executive_name}}/

```

**Fill-in Variables:**
```

{{executive_name}}
{{executive_title}}
{{equity_percent}}
{{shares_issued}}
{{equity_type}}
{{vesting_schedule}}
{{strike_price}}
{{annual_salary}}
{{salary_status}}
{{funding_trigger}}
{{governing_law}}
{{start_date}}

```

---

## Step 4: Board Resolution Logic
When generating `BoardResolution_OfficerAppointment.md`, Cursor inserts:

> “Resolved, that {{executive_name}} is hereby appointed as {{executive_title}} of Crave’n Inc., effective {{start_date}}, and is authorized to carry out the duties of such office.  
> Further Resolved, that {{shares_issued}} shares of {{equity_type}} are hereby issued to {{executive_name}} in consideration of services rendered, subject to the vesting schedule and terms set forth in the Equity Offer Agreement.”

---

## Step 5: Supabase / Database Sync
Cursor must update or create an entry in the `executives` table:

| Column | Value |
|--------|--------|
| name | {{executive_name}} |
| title | {{executive_title}} |
| equity_percent | {{equity_percent}} |
| shares_issued | {{shares_issued}} |
| salary_status | {{salary_status}} |
| annual_salary | {{annual_salary}} |
| funding_trigger | {{funding_trigger}} |
| vesting_schedule | {{vesting_schedule}} |
| strike_price | {{strike_price}} |
| created_at | current timestamp |

---

## Step 6: Confirmation Output
After generation, Cursor displays a structured confirmation summary:

```

✅ EXECUTIVE APPOINTMENT COMPLETE

Name: {{executive_name}}
Role: {{executive_title}}
Equity: {{equity_percent}}% ({{shares_issued}} shares)
Equity Type: {{equity_type}}
Vesting: {{vesting_schedule}}
Salary: ${{annual_salary}}/year
Deferred: {{salary_status}}
Funding Trigger: ${{funding_trigger}} (if applicable)
Documents Generated:
• Equity Offer Agreement
• {{Conditional: Deferred Compensation Agreement}}
• Board Resolution

```

---

## Step 7: File & Version Handling
- Cursor saves generated PDFs under `/legal/generated/{{executive_name}}/`.
- Cursor commits Markdown versions to the repo branch `legal/appointments`.
- If an executive already exists, prompt the admin to confirm an update or create a new revision.

---

## Step 8: Automation Chain
1. Create executive record → Generate documents → Save → Sync cap table.
2. If `salary_status = deferred`, tag record as `"equity_only"` in Supabase for filtering.
3. Once funding milestone met, Cursor triggers salary-activation workflow to convert record from `"deferred"` to `"active"` and generate Employment Agreement.

---

## Default Values (unless overridden)
```

equity_type = "Common Stock"
vesting_schedule = "4 years, 1-year cliff"
strike_price = "$0.001 per share"
governing_law = "Ohio"
funding_trigger = "500000"
annual_salary = "90000"

```

---

## Notes
- All C-class roles are *appointed*, not employed, until funding.
- Use independent-contractor language until payroll is established.
- Cursor should never classify C-class executives as W-2 employees before funding activation.
- All generated documents must include the disclaimer:  
  *“This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.”*
```
