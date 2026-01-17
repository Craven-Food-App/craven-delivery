// src/lib/templates/index.ts

import { supabase } from '@/integrations/supabase/client';

export type GovernanceTemplateId =
  | "pre_incorporation_consent"
  | "initial_action_sole_director"
  | "org_minutes_sole_director"
  | "officer_appointment_resolution"
  | "ceo_appointment_resolution"
  | "officer_acceptance"
  | "stock_issuance_resolution"
  | "cap_table_exhibit"
  | "banking_resolution"
  | "registered_agent_resolution"
  | "certificate_of_incorporation"
  | "bylaws_complete"
  | "bylaws_acknowledgment"
  | "fiduciary_duty_ethics"
  | "conflict_of_interest_disclosure"
  | "officer_indemnification"
  | "equity_incentive_plan"
  | "option_rsu_award";

export type TemplateCategory =
  | "governance"
  | "board"
  | "executive"
  | "equity"
  | "compliance";

export interface TemplateMeta {
  id: GovernanceTemplateId;
  title: string;
  description: string;
  category: TemplateCategory[];
  path: string; // relative to src/lib/templates
  // what context this template is used for
  triggers: {
    preIncorporation?: boolean;
    onDirectorCreate?: boolean;
    onOfficerAppointment?: boolean;
    onCEOAppointment?: boolean;
    onEquitySetup?: boolean;
    onBankingSetup?: boolean;
    onRegisteredAgentSetup?: boolean;
  };
}

export const governanceTemplates: TemplateMeta[] = [
  {
    id: "pre_incorporation_consent",
    title: "Pre-Incorporation Written Consent of Sole Incorporator",
    description:
      "DGCL §108 consent appointing initial director and adopting bylaws, conditional on filing.",
    category: ["governance", "board", "compliance"],
    path: "governance/pre_incorporation_consent.html",
    triggers: { preIncorporation: true, onDirectorCreate: true },
  },
  {
    id: "initial_action_sole_director",
    title: "Initial Action of Sole Director",
    description:
      "DGCL §141(f) written consent adopting bylaws, appointing officers, and organizing the corporation.",
    category: ["governance", "board"],
    path: "governance/initial_action_sole_director.html",
    triggers: { onDirectorCreate: true },
  },
  {
    id: "org_minutes_sole_director",
    title: "Organizational Minutes of Sole Director",
    description:
      "Certified organizational minutes summarizing formation, officer elections, and stock issuance.",
    category: ["governance", "board"],
    path: "governance/org_minutes_sole_director.html",
    triggers: { onDirectorCreate: true },
  },
  {
    id: "officer_appointment_resolution",
    title: "Board Resolution: Appointment of Officers",
    description:
      "DGCL §142 resolution appointing one or more officers to specified titles.",
    category: ["governance", "executive"],
    path: "governance/officer_appointment_resolution.html",
    triggers: { onOfficerAppointment: true },
  },
  {
    id: "ceo_appointment_resolution",
    title: "Board Resolution: Appointment of Chief Executive Officer",
    description:
      "DGCL §142 resolution appointing a CEO with full executive authority.",
    category: ["governance", "executive", "board"],
    path: "governance/ceo_appointment_resolution.html",
    triggers: { onCEOAppointment: true },
  },
  {
    id: "officer_acceptance",
    title: "Officer Acceptance of Appointment",
    description:
      "DGCL §142(b) officer acceptance, acknowledging fiduciary duties and role responsibilities.",
    category: ["governance", "executive"],
    path: "governance/officer_acceptance.html",
    triggers: { onOfficerAppointment: true, onCEOAppointment: true },
  },
  {
    id: "stock_issuance_resolution",
    title: "Stock Issuance Resolution",
    description:
      "DGCL §§152–154 resolution authorizing issuance of founder/trust shares and establishing equity pool.",
    category: ["governance", "equity"],
    path: "governance/stock_issuance_resolution.html",
    triggers: { onEquitySetup: true },
  },
  {
    id: "cap_table_exhibit",
    title: "Capitalization Table Exhibit",
    description:
      "Formal cap table exhibit showing authorized, issued, and reserved shares.",
    category: ["governance", "equity"],
    path: "governance/cap_table_exhibit.html",
    triggers: { onEquitySetup: true },
  },
  {
    id: "banking_resolution",
    title: "Corporate Banking Resolution",
    description:
      "Board resolution authorizing officers to open and control corporate bank accounts.",
    category: ["governance", "compliance"],
    path: "governance/banking_resolution.html",
    triggers: { onBankingSetup: true },
  },
  {
    id: "registered_agent_resolution",
    title: "Registered Agent & Registered Office Resolution",
    description:
      "DGCL §132 resolution designating the Delaware registered agent and registered office.",
    category: ["governance", "compliance"],
    path: "governance/registered_agent_resolution.html",
    triggers: { onRegisteredAgentSetup: true },
  },
  {
    id: "certificate_of_incorporation",
    title: "Certificate of Incorporation",
    description:
      "Delaware Certificate of Incorporation establishing the corporation.",
    category: ["governance", "compliance"],
    path: "governance/certificate_of_incorporation.html",
    triggers: { preIncorporation: true },
  },
  {
    id: "bylaws_complete",
    title: "Corporate Bylaws (Complete)",
    description:
      "Full comprehensive corporate bylaws document governing internal affairs.",
    category: ["governance", "compliance"],
    path: "governance/bylaws_complete.html",
    triggers: { onDirectorCreate: true },
  },
  {
    id: "bylaws_acknowledgment",
    title: "Bylaws Acknowledgment & Consent",
    description:
      "Executive acknowledgment of corporate bylaws and consent to be bound.",
    category: ["executive", "governance"],
    path: "governance/bylaws_acknowledgment.html",
    triggers: { onOfficerAppointment: true },
  },
  {
    id: "fiduciary_duty_ethics",
    title: "Fiduciary Duty & Ethics Acknowledgment",
    description:
      "Ethics and fiduciary duty acknowledgment for officers and directors.",
    category: ["executive", "compliance"],
    path: "governance/fiduciary_duty_ethics.html",
    triggers: { onOfficerAppointment: true, onCEOAppointment: true },
  },
  {
    id: "conflict_of_interest_disclosure",
    title: "Conflict of Interest Disclosure",
    description:
      "Initial conflict of interest disclosure form for executives.",
    category: ["executive", "compliance"],
    path: "governance/conflict_of_interest_disclosure.html",
    triggers: { onOfficerAppointment: true, onCEOAppointment: true },
  },
  {
    id: "officer_indemnification",
    title: "Officer Indemnification Agreement",
    description:
      "D&O liability indemnification agreement protecting officers.",
    category: ["executive", "compliance"],
    path: "governance/officer_indemnification.html",
    triggers: { onOfficerAppointment: true, onCEOAppointment: true },
  },
  {
    id: "equity_incentive_plan",
    title: "2025 Equity Incentive Plan",
    description:
      "Company equity incentive plan governing stock option and RSU grants.",
    category: ["equity", "governance"],
    path: "governance/equity_incentive_plan.html",
    triggers: { onEquitySetup: true },
  },
  {
    id: "option_rsu_award",
    title: "Option/RSU Award Agreement",
    description:
      "Individual equity award agreement for options or RSUs.",
    category: ["equity", "executive"],
    path: "governance/option_rsu_award.html",
    triggers: { onEquitySetup: true, onOfficerAppointment: true },
  },
];

/**
 * Load template HTML from file system
 * For Vite, we'll use dynamic imports with ?raw suffix
 * Fallback to Supabase document_templates if file not found
 */
async function importHtml(path: string): Promise<string> {
  // First, try to load from Supabase document_templates (more reliable)
  try {
    // Map template paths to template keys
    const pathToKey: Record<string, string> = {
      'governance/pre_incorporation_consent.html': 'pre_incorporation_consent',
      'governance/initial_action_sole_director.html': 'initial_director_consent',
      'governance/org_minutes_sole_director.html': 'organizational_board_minutes',
      'governance/officer_appointment_resolution.html': 'board_resolution_officer_appointment',
      'governance/ceo_appointment_resolution.html': 'board_resolution_appointing_ceo',
      'governance/officer_acceptance.html': 'multi_role_officer_acceptance',
      'governance/stock_issuance_resolution.html': 'board_resolution_stock_issuance',
      'governance/cap_table_exhibit.html': 'capitalization_table_exhibit',
      'governance/banking_resolution.html': 'corporate_banking_resolution',
      'governance/registered_agent_resolution.html': 'board_resolution',
    };

    const templateKey = pathToKey[path];
    if (templateKey) {
      const { data: template } = await supabase
        .from('document_templates')
        .select('html_content')
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .maybeSingle();
      
      if (template?.html_content) {
        return template.html_content;
      }
    }
  } catch (supabaseError) {
    console.warn('Could not load template from Supabase, trying file system:', supabaseError);
  }

  // Fallback: try to import from file system (for development/local)
  try {
    // Vite requires explicit ?raw suffix for raw text imports
    const templateMap: Record<string, () => Promise<{ default: string }>> = {
      'governance/pre_incorporation_consent.html': () => import('./governance/pre_incorporation_consent.html?raw'),
      'governance/initial_action_sole_director.html': () => import('./governance/initial_action_sole_director.html?raw'),
      'governance/org_minutes_sole_director.html': () => import('./governance/org_minutes_sole_director.html?raw'),
      'governance/officer_appointment_resolution.html': () => import('./governance/officer_appointment_resolution.html?raw'),
      'governance/ceo_appointment_resolution.html': () => import('./governance/ceo_appointment_resolution.html?raw'),
      'governance/officer_acceptance.html': () => import('./governance/officer_acceptance.html?raw'),
      'governance/stock_issuance_resolution.html': () => import('./governance/stock_issuance_resolution.html?raw'),
      'governance/cap_table_exhibit.html': () => import('./governance/cap_table_exhibit.html?raw'),
      'governance/banking_resolution.html': () => import('./governance/banking_resolution.html?raw'),
      'governance/registered_agent_resolution.html': () => import('./governance/registered_agent_resolution.html?raw'),
    };

    const importFn = templateMap[path];
    if (importFn) {
      const module = await importFn();
      return module.default;
    }
  } catch (fileError) {
    console.warn('Could not load template from file system:', fileError);
  }
  
  throw new Error(`Template not found: ${path}. Please ensure the template exists in Supabase document_templates table.`);
}

export async function loadTemplateHtml(id: GovernanceTemplateId): Promise<{
  meta: TemplateMeta;
  html: string;
}> {
  const meta = governanceTemplates.find((t) => t.id === id);
  if (!meta) {
    throw new Error(`Template not found: ${id}`);
  }
  const html = await importHtml(meta.path);
  return { meta, html };
}

/**
 * Very simple variable interpolation.
 * Example:
 *   interpolateTemplate("<p>{{company_name}}</p>", { company_name: "Craven, Inc." })
 */
export function interpolateTemplate(html: string, data: Record<string, any>): string {
  let output = html;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    output = output.replace(regex, value == null ? "" : String(value));
  }
  return output;
}

