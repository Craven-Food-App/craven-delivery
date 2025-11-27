import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

const TPL = (name: string) => fs.readFileSync(path.join(process.cwd(), "server", "templates", name), "utf8");

// Shared print-friendly CSS injected into every HTML doc
export const baseStyles = `
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; }
    h1,h2,h3 { margin: 0 0 8px; }
    .muted { color:#666; }
    .sig-block { margin-top: 40px; display:flex; gap:48px; }
    .sig { width: 320px; border-top:1px solid #000; padding-top:6px; }
    .label { font-size:12px; color:#666; }
  </style>
`;

// Register helpers as needed
Handlebars.registerHelper("uppercase", (s: string) => (s || "").toUpperCase());

export type TemplateMeta = {
  id: string;
  title: string;
  placeholders: string[];
  compile: HandlebarsTemplateDelegate<any>;
};

// Load & compile all templates
export const templates: TemplateMeta[] = [
  { 
    id: "employment_agreement", 
    title: "Executive Employment Agreement", 
    placeholders: ["company_name","full_name","role","equity_percentage","effective_date","funding_trigger","governing_law"], 
    compile: Handlebars.compile(TPL("employment_agreement.hbs")) 
  },
  { 
    id: "board_resolution", 
    title: "Board Resolution – Appointment of Officers", 
    placeholders: ["company_name","date","directors","ceo_name","cfo_name","cxo_name","equity_ceo","equity_cfo","equity_cxo","funding_trigger"], 
    compile: Handlebars.compile(TPL("board_resolution.hbs")) 
  },
  { 
    id: "founders_agreement", 
    title: "Founders' / Shareholders' Agreement", 
    placeholders: [
      "company_name",
      "founders_table_html",
      "founders_signature_html",
      "founders_addressed_name",
      "founders_addressed_role",
      "founders_addressed_equity",
      "founders_addressed_shares",
      "founders_addressed_vesting",
      "founders_ceo_name",
      "founders_ceo_role",
      "founders_ceo_equity",
      "founders_ceo_shares",
      "founders_ceo_vesting",
      "founders_cfo_name",
      "founders_cfo_role",
      "founders_cfo_equity",
      "founders_cfo_shares",
      "founders_cfo_vesting",
      "founders_cxo_name",
      "founders_cxo_role",
      "founders_cxo_equity",
      "founders_cxo_shares",
      "founders_cxo_vesting",
      "vesting_years",
      "cliff_months",
      "governing_law"
    ], 
    compile: Handlebars.compile(TPL("founders_agreement.hbs")) 
  },
  { 
    id: "stock_issuance", 
    title: "Stock Subscription / Issuance Agreement", 
    placeholders: ["company_name","full_name","role","share_count","class_name","par_value","consideration","vesting_schedule"], 
    compile: Handlebars.compile(TPL("stock_issuance.hbs")) 
  },
  { 
    id: "confidentiality_ip", 
    title: "Confidentiality & IP Assignment Agreement", 
    placeholders: ["company_name","full_name","role","effective_date","governing_law"], 
    compile: Handlebars.compile(TPL("confidentiality_ip.hbs")) 
  },
  { 
    id: "deferred_comp_addendum", 
    title: "Deferred Compensation Addendum", 
    placeholders: ["company_name","full_name","role","funding_trigger","effective_date","governing_law"], 
    compile: Handlebars.compile(TPL("deferred_comp_addendum.hbs")) 
  },
  { 
    id: "offer_letter", 
    title: "Executive Offer Letter", 
    placeholders: ["company_name","full_name","role","equity_percentage","effective_date","funding_trigger"], 
    compile: Handlebars.compile(TPL("offer_letter.hbs")) 
  },
  { 
    id: "bylaws_officers_excerpt", 
    title: "Bylaws – Officers (Excerpt)", 
    placeholders: ["company_name","funding_trigger","officer_roles_html","governing_law"], 
    compile: Handlebars.compile(TPL("bylaws_officers_excerpt.hbs")) 
  },
  { 
    id: "irs_83b", 
    title: "IRS Form 83(b) – Info Sheet", 
    placeholders: ["taxpayer_name","taxpayer_address","company_name","date_of_transfer","stock_class","number_of_shares","fair_market_value","amount_paid"], 
    compile: Handlebars.compile(TPL("irs_83b.hbs")) 
  },
  { 
    id: "bylaws_complete", 
    title: "Corporate Bylaws (Complete)", 
    placeholders: ["company_name","state_of_incorporation","state_abbreviation","adoption_date","registered_office_address","principal_office_address","principal_office_city","principal_office_state","authorized_shares","par_value","shareholders","fiscal_year","ceo_name","cfo_name","cxo_name","cto_name","secretary_name","secretary_title","additional_director_name","signers"], 
    compile: Handlebars.compile(TPL("bylaws_complete.hbs")) 
  },
  { 
    id: "pre_incorporation_consent", 
    title: "Pre-Incorporation Consent", 
    placeholders: ["company_name","incorporator_name","board_members","state"], 
    compile: Handlebars.compile(TPL("pre_incorporation_consent.hbs")) 
  },
  { 
    id: "certificate_of_incorporation", 
    title: "Certificate of Incorporation", 
    placeholders: ["company_name","state","registered_office","registered_agent","incorporator_name","board_members","authorized_shares","par_value"], 
    compile: Handlebars.compile(TPL("certificate_of_incorporation.hbs")) 
  },
  { 
    id: "bylaws_acknowledgment", 
    title: "Bylaws Acknowledgment & Consent", 
    placeholders: ["company_name","officer_name","title","current_date"], 
    compile: Handlebars.compile(TPL("bylaws_acknowledgment.hbs")) 
  },
  { 
    id: "fiduciary_duty_ethics", 
    title: "Fiduciary Duty & Ethics Acknowledgment", 
    placeholders: ["company_name","officer_name","title","current_date"], 
    compile: Handlebars.compile(TPL("fiduciary_duty_ethics.hbs")) 
  },
  { 
    id: "conflict_of_interest_disclosure", 
    title: "Conflict of Interest Disclosure", 
    placeholders: ["company_name","officer_name","title","current_date"], 
    compile: Handlebars.compile(TPL("conflict_of_interest_disclosure.hbs")) 
  },
  { 
    id: "officer_indemnification", 
    title: "Officer Indemnification Agreement", 
    placeholders: ["company_name","officer_name","title","current_date","state"], 
    compile: Handlebars.compile(TPL("officer_indemnification.hbs")) 
  },
  { 
    id: "equity_incentive_plan", 
    title: "2025 Equity Incentive Plan", 
    placeholders: ["company_name","equity_pool_shares","par_value","plan_effective_date","plan_adoption_date","state"], 
    compile: Handlebars.compile(TPL("equity_incentive_plan.hbs")) 
  },
  { 
    id: "option_rsu_award", 
    title: "Option/RSU Award Agreement", 
    placeholders: ["company_name","officer_name","title","award_type","shares_granted","strike_price","grant_date","vesting_schedule","equity_plan_name","state"], 
    compile: Handlebars.compile(TPL("option_rsu_award.hbs")) 
  }
];

// Simple renderer with shared styles + auto signature blocks
export function renderHtml(id: string, data: Record<string, any>) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) throw new Error("Template not found: " + id);
  const body = tpl.compile(data);
  return `<!doctype html><html><head><meta charset="utf-8" />${baseStyles}</head><body>${body}</body></html>`;
}

