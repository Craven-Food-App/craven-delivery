// Document templates configuration
// NOTE: All hardcoded HTML templates have been removed.
// Document templates must be provided via Template Manager in the Board Portal.
// This file only contains metadata for template reference.

export type TemplateMeta = {
  id: string;
  title: string;
  placeholders: string[];
};

export const templates: TemplateMeta[] = [
  { 
    id: "employment_agreement", 
    title: "Executive Employment Agreement", 
    placeholders: ["company_name", "full_name", "role", "equity_percentage", "effective_date", "funding_trigger", "governing_law"]
  },
  { 
    id: "board_resolution", 
    title: "Board Resolution – Appointment of Officers", 
    placeholders: ["company_name", "date", "directors", "ceo_name", "cfo_name", "cxo_name", "equity_ceo", "equity_cfo", "equity_cxo", "funding_trigger"]
  },
  { 
    id: "founders_agreement", 
    title: "Founders' Agreement", 
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
      "vesting_years",
      "cliff_months",
      "governing_law"
    ]
  },
  { 
    id: "shareholders_agreement", 
    title: "Shareholders' Agreement", 
    placeholders: [
      "company_name",
      "shareholders_table_html",
      "shareholders_signature_html",
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
    ]
  },
  { 
    id: "stock_issuance", 
    title: "Stock Subscription / Issuance Agreement", 
    placeholders: ["company_name", "full_name", "role", "share_count", "price_per_share", "total_purchase_price", "share_class", "consideration_type", "vesting_schedule", "currency"]
  },
  { 
    id: "confidentiality_ip", 
    title: "Confidentiality & IP Assignment Agreement", 
    placeholders: ["company_name", "full_name", "role", "effective_date", "governing_law"]
  },
  { 
    id: "deferred_comp_addendum", 
    title: "Deferred Compensation Addendum", 
    placeholders: ["company_name", "full_name", "role", "funding_trigger", "effective_date", "governing_law"]
  },
  { 
    id: "offer_letter", 
    title: "Executive Offer Letter", 
    placeholders: [
      "company_name","offer_date","executive_name","executive_first_name","executive_address","executive_email",
      "position_title","reporting_to_title","work_location","start_date",
      "annual_base_salary","currency","funding_trigger_amount",
      "share_count","share_class","ownership_percent","vesting_period","vesting_cliff","bonus_structure",
      "employment_country","governing_law_state","signatory_name","signatory_title","company_mission_statement"
    ]
  },
  { 
    id: "pre_incorporation_consent", 
    title: "Pre-Incorporation Consent (Conditional Appointments)", 
    placeholders: [
      "company_name","state_of_incorporation","adoption_date","effective_date","execution_date","secretary_name",
      "full_name","role","position_title"
    ]
  },
  { 
    id: "bylaws_officers_excerpt", 
    title: "Bylaws – Officers (Excerpt)", 
    placeholders: [
      "company_name","state_of_incorporation","adoption_date","effective_date","execution_date","secretary_name",
      "full_name","role","position_title"
    ]
  },
  { 
    id: "irs_83b", 
    title: "IRS Form 83(b) – Info Sheet", 
    placeholders: [
      "company_name","recipient_name","grant_date","share_class","share_type","share_count","price_per_share","currency",
      "total_grant_value","total_payment","cfo_name","cfo_email","company_address",
      "recipient_address","recipient_ssn","tax_year","taxable_difference","vesting_schedule"
    ]
  }
];

// Template HTML generator - DEPRECATED
// All hardcoded templates have been removed. Use renderDocumentHtml() from @/utils/templateUtils
// which fetches templates from the database.
export function renderHtml(templateId: string, data: Record<string, any>): string {
  throw new Error(
    `Hardcoded templates have been removed. Template '${templateId}' must be created in the database via Template Manager. ` +
    `Please use renderDocumentHtml() from @/utils/templateUtils which uses database templates.`
  );
}
