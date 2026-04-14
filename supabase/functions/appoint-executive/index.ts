import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AppointmentRequest {
  executive_name: string;
  executive_title: string; // CEO, COO, CFO, CTO, CMO, Admin
  start_date: string; // ISO
  equity_percent: string; // keep as string to avoid locale issues
  shares_issued: string;
  equity_type?: string;
  vesting_schedule?: string;
  strike_price?: string;
  annual_salary?: string;
  governing_law?: string;
  defer_salary?: boolean;
  funding_trigger?: string; // default 500000
}

const DEFAULTS = {
  equity_type: "Common Stock",
  vesting_schedule: "4 years, 1-year cliff; 25% after 12 months, remainder monthly over 36 months",
  strike_price: "$0.001 per share",
  annual_salary: "90000",
  governing_law: "Ohio",
  funding_trigger: "500000",
};

const DEFERRED_CLAUSE = (annualSalary: string) => `The Executive acknowledges that Crave’n Inc. is in an early, pre-revenue stage and will initially serve on an equity-only basis.
Upon the Company achieving a Funding Event—defined as closing a capital raise of at least $500,000 USD or achieving positive cash flow for three consecutive months—the Executive shall begin receiving a base annual salary of $${annualSalary} USD, payable according to standard payroll practices.
No back pay or retroactive wages shall accrue prior to the Funding Event.`;

function fillTemplateEquityOffer(v: any): string {
  const deferredText = v.salary_status === 'deferred' ? `\n${DEFERRED_CLAUSE(v.annual_salary)}\n` : '';
  return `# Equity Offer Agreement

This Equity Offer Agreement (the "Agreement") is entered into by and between Crave’n Inc. (the "Company") and ${v.executive_name} (the "Executive").

## 1. Appointment and Role
- Title: ${v.executive_title}
- Start Date: ${v.start_date}

## 2. Equity Grant
- Equity Percent: ${v.equity_percent}%
- Shares Issued: ${v.shares_issued} shares
- Equity Type: ${v.equity_type}
- Vesting Schedule: ${v.vesting_schedule}
- Strike Price: ${v.strike_price}

## 3. Compensation
- Salary Status: ${v.salary_status}
- Annual Salary (if active): $${v.annual_salary} USD/year
${deferredText}
## 4. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of ${v.governing_law}.

## 5. Acknowledgement
Executive acknowledges receipt and acceptance of the terms set forth herein and in the accompanying Board Resolution.

---

Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.

---

Executive: ________________________________  Date: ____________

Company:   ________________________________  Date: ____________
`;
}

function fillTemplateDeferredComp(v: any): string {
  return `# Deferred Compensation Agreement

This Deferred Compensation Agreement (the "Agreement") is entered into by and between Crave’n Inc. (the "Company") and ${v.executive_name} (the "Executive").

## 1. Appointment and Role
- Title: ${v.executive_title}
- Start Date: ${v.start_date}
- Salary Status: ${v.salary_status}

## 2. Deferred Salary Clause
${DEFERRED_CLAUSE(v.annual_salary)}

## 3. Additional Terms
- Equity and vesting are as set forth in the Equity Offer Agreement.
- This Agreement shall be read together with the Equity Offer Agreement.

## 4. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of ${v.governing_law}.

---

Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.

---

Executive: ________________________________  Date: ____________

Company:   ________________________________  Date: ____________
`;
}

function fillTemplateBoardResolution(v: any): string {
  return `# Board Resolution – Officer Appointment

The undersigned, being all of the members of the Board of Directors of Crave’n Inc. (the "Company"), hereby adopt the following resolutions:

Resolved, that ${v.executive_name} is hereby appointed as ${v.executive_title} of Crave’n Inc., effective ${v.start_date}, and is authorized to carry out the duties of such office.

Further Resolved, that ${v.shares_issued} shares of ${v.equity_type} are hereby issued to ${v.executive_name} in consideration of services rendered, subject to the vesting schedule and terms set forth in the Equity Offer Agreement.

---

For the record:
- Equity Percent: ${v.equity_percent}%
- Vesting Schedule: ${v.vesting_schedule}
- Strike Price: ${v.strike_price}
- Salary Status: ${v.salary_status}
- Annual Salary: $${v.annual_salary} (if active)
- Funding Trigger: $${v.funding_trigger}

---

Disclaimer: This agreement reflects an equity-only officer appointment until such time as Crave’n Inc. achieves a qualifying funding event.

---

Director: ________________________________  Date: ____________

Director: ________________________________  Date: ____________
`;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const body: AppointmentRequest = await req.json();

    const v = {
      executive_name: body.executive_name.trim(),
      executive_title: body.executive_title,
      start_date: body.start_date,
      equity_percent: body.equity_percent,
      shares_issued: body.shares_issued,
      equity_type: body.equity_type || DEFAULTS.equity_type,
      vesting_schedule: body.vesting_schedule || DEFAULTS.vesting_schedule,
      strike_price: body.strike_price || DEFAULTS.strike_price,
      annual_salary: body.annual_salary || DEFAULTS.annual_salary,
      governing_law: body.governing_law || DEFAULTS.governing_law,
      salary_status: body.defer_salary ? "deferred" : "active",
      funding_trigger: body.defer_salary ? (body.funding_trigger || DEFAULTS.funding_trigger) : "",
      tag_equity_only: body.defer_salary ? "equity_only" : null,
    };

    // Upsert executives record
    const { error: upsertError } = await supabase
      .from("executives")
      .upsert({
        name: v.executive_name,
        title: v.executive_title,
        equity_percent: v.equity_percent,
        shares_issued: v.shares_issued,
        salary_status: v.salary_status,
        annual_salary: v.annual_salary,
        funding_trigger: v.funding_trigger || null,
        vesting_schedule: v.vesting_schedule,
        strike_price: v.strike_price,
        tag: v.tag_equity_only,
      }, { onConflict: "name" });

    if (upsertError) {
      // Fallback: upsert into exec_users if executives table not present
      const exec_role = v.executive_title.toLowerCase().split(' ')[v.executive_title.toLowerCase().split(' ').indexOf('chief') + 1] || 
                       v.executive_title.toLowerCase().replace(/chief |officer/g, '').trim();
      await supabase.from("exec_users").upsert({
        role: exec_role,
        title: v.executive_title,
        name: v.executive_name,
        department: null,
        approved_at: new Date().toISOString(),
      }, { onConflict: 'name' });
    }

    // Also record equity for dashboard if we don't have an employee_id entry
    try {
      const eqTypeInput = (v.equity_type || '').toLowerCase();
      const eqMap: Record<string, 'stock'|'options'|'phantom'> = {
        'common stock': 'stock',
        'preferred stock': 'stock',
        'stock': 'stock',
        'stock options': 'options',
        'options': 'options',
        'phantom stock': 'phantom',
        'phantom': 'phantom',
      };
      const normalized = eqMap[eqTypeInput] || 'stock';
      // Store a name-only equity record into a helper table executives_equity (create if missing)
      await supabase.rpc('execute_sql_passthrough', { sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='executives_equity') THEN
            CREATE TABLE public.executives_equity (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              title TEXT,
              shares_percentage NUMERIC(5,2),
              shares_total INTEGER,
              equity_type TEXT CHECK (equity_type IN ('stock','options','phantom')),
              created_at TIMESTAMPTZ DEFAULT now()
            );
          END IF;
        END $$;` });
      await supabase.from('executives_equity').upsert({
        name: v.executive_name,
        title: v.executive_title,
        shares_percentage: Number(v.equity_percent || 0),
        shares_total: Number(v.shares_issued || 0),
        equity_type: normalized,
      }, { onConflict: 'name' });
    } catch (_) {}

    // Generate documents (Markdown)
    const eqOffer = fillTemplateEquityOffer(v);
    const boardRes = fillTemplateBoardResolution(v);
    const defComp = v.salary_status === 'deferred' ? fillTemplateDeferredComp(v) : '';

    const safeName = v.executive_name.replace(/[^a-z0-9-_]+/gi, '_');
    const basePath = `legal/executives/${safeName}`;

    const uploads: Array<Promise<any>> = [];

    uploads.push(
      supabase.storage.from("feeder-documents").upload(
        `${basePath}/EquityOfferAgreement.md`,
        new Blob([eqOffer], { type: "text/markdown" }),
        { upsert: true, contentType: "text/markdown" }
      )
    );

    uploads.push(
      supabase.storage.from("feeder-documents").upload(
        `${basePath}/BoardResolution_OfficerAppointment.md`,
        new Blob([boardRes], { type: "text/markdown" }),
        { upsert: true, contentType: "text/markdown" }
      )
    );

    if (v.salary_status === 'deferred') {
      uploads.push(
        supabase.storage.from("feeder-documents").upload(
          `${basePath}/DeferredCompensationAgreement.md`,
          new Blob([defComp], { type: "text/markdown" }),
          { upsert: true, contentType: "text/markdown" }
        )
      );
    }

    await Promise.all(uploads);

    const summary = {
      executive_name: v.executive_name,
      executive_title: v.executive_title,
      equity_percent: v.equity_percent,
      shares_issued: v.shares_issued,
      equity_type: v.equity_type,
      vesting_schedule: v.vesting_schedule,
      strike_price: v.strike_price,
      annual_salary: v.annual_salary,
      salary_status: v.salary_status,
      funding_trigger: v.funding_trigger || null,
      storage_path: basePath,
      documents: [
        "Equity Offer Agreement",
        ...(v.salary_status === 'deferred' ? ["Deferred Compensation Agreement"] : []),
        "Board Resolution",
      ],
    };

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
