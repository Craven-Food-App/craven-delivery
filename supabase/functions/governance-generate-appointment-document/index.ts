import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Helper function to format dates nicely (e.g., "January 15, 2025")
function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateString;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  let appointment_id: string | undefined;
  let document_type: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always use service role key for document generation (bypasses RLS)
    // This function can be called internally without user JWT validation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    appointment_id = body.appointment_id;
    document_type = body.document_type;

    if (!appointment_id || !document_type) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id or document_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch resolution if exists
    let resolution = null;
    if (appointment.board_resolution_id) {
      const { data: resData } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('*')
        .eq('id', appointment.board_resolution_id)
        .single();
      resolution = resData;
    }

    // Fetch company settings for governing state and company name
    let governingState = 'Delaware'; // Default fallback
    let companyName = 'Crave\'n, Inc.'; // Default fallback
    
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['state_of_incorporation', 'company_name']);
    
    if (companySettings) {
      companySettings.forEach((setting) => {
        if (setting.setting_key === 'state_of_incorporation' && setting.setting_value) {
          governingState = setting.setting_value;
        }
        if (setting.setting_key === 'company_name' && setting.setting_value) {
          companyName = setting.setting_value;
        }
      });
    }

    // Parse JSON fields if they're strings, with safe fallback
    interface CompensationStructure {
      base_salary?: number;
      annual_bonus_percentage?: number;
      performance_bonus?: string;
      benefits?: string;
      description?: string;
      [key: string]: any;
    }

    interface EquityDetails {
      percentage?: number;
      share_count?: number;
      vesting_schedule?: string;
      exercise_price?: string;
      description?: string;
      [key: string]: any;
    }

    let compensationStructure: CompensationStructure = {};
    if (appointment.compensation_structure) {
      if (typeof appointment.compensation_structure === 'string') {
        try {
          // Try to parse as JSON
          compensationStructure = JSON.parse(appointment.compensation_structure);
        } catch (e) {
          // If it's not valid JSON, treat it as plain text and wrap it
          console.warn('compensation_structure is not valid JSON, treating as text:', appointment.compensation_structure);
          compensationStructure = { description: appointment.compensation_structure };
        }
      } else {
        compensationStructure = appointment.compensation_structure as CompensationStructure;
      }
    }
    
    let equityDetails: EquityDetails = {};
    if (appointment.equity_details) {
      if (typeof appointment.equity_details === 'string') {
        try {
          // Try to parse as JSON
          equityDetails = JSON.parse(appointment.equity_details);
        } catch (e) {
          // If it's not valid JSON, treat it as plain text and wrap it
          console.warn('equity_details is not valid JSON, treating as text:', appointment.equity_details);
          equityDetails = { description: appointment.equity_details };
        }
      } else {
        equityDetails = appointment.equity_details as EquityDetails;
      }
    }

    // Map appointment data to template placeholders - supporting multiple formats
    const templateData: Record<string, any> = {
      // Name variations (all formats)
      full_name: appointment.proposed_officer_name,
      executive_name: appointment.proposed_officer_name,
      officer_name: appointment.proposed_officer_name,
      name: appointment.proposed_officer_name,
      proposed_officer_name: appointment.proposed_officer_name,
      EXECUTIVE_NAME: appointment.proposed_officer_name,
      OFFICER_NAME: appointment.proposed_officer_name,
      FULL_NAME: appointment.proposed_officer_name,
      NAME: appointment.proposed_officer_name,
      
      // Equity award specific fields (uppercase for [[]] format)
      'OPTION / RSU': equityDetails.share_count ? 'OPTION' : 'RSU',
      AWARD_TYPE: equityDetails.share_count ? 'OPTION' : 'RSU',
      awardType: equityDetails.share_count ? 'OPTION' : 'RSU',
      SHARE_AMOUNT: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0',
      sharesGranted: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0',
      PRICE: equityDetails.exercise_price ? String(equityDetails.exercise_price).replace(/[^0-9.]/g, '') : '0.01',
      strikePrice: equityDetails.exercise_price ? String(equityDetails.exercise_price).replace(/[^0-9.]/g, '') : '0.01',
      vestingSchedule: equityDetails.vesting_schedule || '25% after 12 months, then monthly over 36 months',
      cliffPeriod: '12 months',
      
      // Date variations (all formats)
      DATE: appointment.effective_date ? formatDate(appointment.effective_date) : formatDate(new Date().toISOString().split('T')[0]),
      grantDate: appointment.effective_date ? formatDate(appointment.effective_date) : formatDate(new Date().toISOString().split('T')[0]),
      
      // Contact information (all formats)
      proposed_officer_email: appointment.proposed_officer_email || '',
      email: appointment.proposed_officer_email || '',
      EMAIL: appointment.proposed_officer_email || '',
      'officer.email': appointment.proposed_officer_email || '',
      proposed_officer_phone: (appointment as any).proposed_officer_phone || '',
      phone: (appointment as any).proposed_officer_phone || '',
      PHONE: (appointment as any).proposed_officer_phone || '',
      
      // Title variations (all formats)
      role: appointment.proposed_title,
      position: appointment.proposed_title,
      title: appointment.proposed_title,
      position_title: appointment.proposed_title,
      executive_title: appointment.proposed_title,
      proposed_title: appointment.proposed_title,
      TITLE: appointment.proposed_title,
      ROLE: appointment.proposed_title,
      POSITION: appointment.proposed_title,
      'officer.title': appointment.proposed_title,
      
      // Company and dates (all formats)
      company_name: companyName,
      COMPANY_NAME: companyName,
      'company.legalName': companyName,
      ceoName: 'Torrance Stroman',
      CEO_NAME: 'Torrance Stroman',
      'officer.fullName': appointment.proposed_officer_name,
      effective_date: appointment.effective_date,
      date: appointment.effective_date,
      appointment_date: appointment.effective_date,
      board_meeting_date: appointment.board_meeting_date || appointment.effective_date,
      
      // Appointment details
      appointment_type: appointment.appointment_type || 'NEW',
      reporting_to: (appointment as any).reporting_to || 'Board of Directors',
      department: (appointment as any).department || '',
      
      // Compensation - format numbers properly
      annual_salary: compensationStructure.base_salary ? formatCurrency(compensationStructure.base_salary) : '$0',
      annual_base_salary: compensationStructure.base_salary ? formatCurrency(compensationStructure.base_salary) : '$0',
      base_salary: compensationStructure.base_salary ? formatCurrency(compensationStructure.base_salary) : '$0',
      salary: compensationStructure.base_salary ? formatCurrency(compensationStructure.base_salary) : '$0',
      annual_bonus_percentage: compensationStructure.annual_bonus_percentage ? String(compensationStructure.annual_bonus_percentage) : '0',
      bonus_percentage: compensationStructure.annual_bonus_percentage ? String(compensationStructure.annual_bonus_percentage) : '0',
      performance_bonus: compensationStructure.performance_bonus || '',
      benefits: compensationStructure.benefits || '',
      compensation_description: compensationStructure.description || '',
      
      // Equity - format numbers properly
      equity_percentage: equityDetails.percentage ? String(equityDetails.percentage) : '0',
      equity_percent: equityDetails.percentage ? String(equityDetails.percentage) : '0',
      share_count: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0',
      shares_issued: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0',
      number_of_shares: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0',
      vesting_schedule: equityDetails.vesting_schedule || '',
      exercise_price: equityDetails.exercise_price || '',
      equity_included: appointment.equity_included ? 'Yes' : 'No',
      
      // Authority and terms
      authority_granted: appointment.authority_granted || 'Standard executive authority',
      term_length_months: appointment.term_length_months ? String(appointment.term_length_months) : 'N/A',
      term_end: appointment.term_end || null,
      
      // Resolution details
      resolution_number: resolution?.resolution_number || 'TBD',
      resolution_date: resolution?.meeting_date || appointment.effective_date,
      
      // Stock Certificate specific fields
      certificate_number: `CERT-${appointment.id.substring(0, 8).toUpperCase()}`,
      share_class: 'Common',
      company_state: governingState,
      issue_date: appointment.effective_date,
      company_signatory_name: 'Torrance Stroman',
      company_signatory_title: 'Chief Executive Officer',
      secretary_name: 'Corporate Secretary',
      
      // Legal/governing law fields - all pulled from company_settings
      governing_law_state: governingState,
      state: governingState,
      state_of_incorporation: governingState,
      
      // Signature dates - use effective_date formatted nicely
      company_signature_date: appointment.effective_date ? formatDate(appointment.effective_date) : formatDate(new Date().toISOString().split('T')[0]),
      executive_signature_date: appointment.effective_date ? formatDate(appointment.effective_date) : formatDate(new Date().toISOString().split('T')[0]),
      signature_date: appointment.effective_date ? formatDate(appointment.effective_date) : formatDate(new Date().toISOString().split('T')[0]),
      
      // Additional equity/stock fields that might be in templates
      price_per_share: equityDetails.exercise_price || '$0.01',
      total_purchase_price: equityDetails.share_count && equityDetails.exercise_price ? 
        formatCurrency((equityDetails.share_count || 0) * parseFloat(String(equityDetails.exercise_price).replace(/[^0-9.]/g, '') || '0.01')) : '$0',
      consideration_type: equityDetails.exercise_price ? 'Cash' : 'Service',
      currency: 'USD',
      
      // Deferred compensation specific fields
      salary_currency: '$',
      trigger_conditions: 'the Company achieves a liquidity event (including but not limited to a merger, acquisition, sale of substantially all assets, or initial public offering), or the Executive\'s employment is terminated by the Company without cause, or the Executive\'s employment is terminated due to death or disability',
      
      // Additional notes
      notes: appointment.notes || '',
    };

    // FORMATION-SPECIFIC FIELD MAPPING (ONLY for pre_incorporation_consent)
    if (document_type === 'pre_incorporation_consent') {
      // Map formation-specific fields from appointment
      templateData.company_name = companyName;
      templateData.company_state = governingState;
      templateData.state_of_incorporation = governingState;
      templateData.officer_name = appointment.proposed_officer_name || '';
      templateData.officer_role = appointment.proposed_title || '';
      templateData.board_meeting_date = appointment.board_meeting_date 
        ? formatDate(appointment.board_meeting_date) 
        : formatDate(new Date().toISOString());
      templateData.effective_date = appointment.effective_date 
        ? formatDate(appointment.effective_date) 
        : formatDate(new Date().toISOString());
      
      // Parse equity details for formation document
      let equityPct = 0;
      let shareCount = 0;
      if (appointment.equity_details) {
        try {
          const equity = typeof appointment.equity_details === 'string' 
            ? JSON.parse(appointment.equity_details) 
            : appointment.equity_details;
          equityPct = equity.percentage || 0;
          shareCount = equity.share_count || 0;
        } catch (e) {
          // Use defaults if parsing fails
        }
      }
      templateData.equity_percentage = equityPct;
      templateData.number_of_shares = shareCount;
      
      // Static defaults for formation document
      templateData.incorporator_name = 'Torrance Stroman';
      templateData.founder_invero_percent = '55%';
      templateData.founder_torrance_percent = '18%';
      
      // Add company settings fields for formation document
      const { data: companySettings } = await supabaseAdmin
        .from('company_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['registered_office', 'state_filing_office', 'registered_agent_name', 'registered_agent_address', 'fiscal_year_end', 'principal_office', 'incorporator_name', 'incorporator_address', 'incorporator_email', 'county']);
      
      if (companySettings) {
        companySettings.forEach((setting) => {
          templateData[setting.setting_key] = setting.setting_value || '';
        });
      }
      
      // Set consent_date to effective_date or current date
      templateData.consent_date = appointment.effective_date 
        ? formatDate(appointment.effective_date) 
        : formatDate(new Date().toISOString());
      
      // Set principal_office if not already set
      if (!templateData.principal_office) {
        templateData.principal_office = templateData.registered_office || '123 Main St, Wilmington, DE 19801';
      }
      
      // Set notary_date
      templateData.notary_date = appointment.effective_date 
        ? formatDate(appointment.effective_date) 
        : formatDate(new Date().toISOString());
      
      // Set role placeholder (used multiple times in bylaws)
      templateData.role = appointment.proposed_title || 'Chief Executive Officer';
      
      // Fetch all formation_mode appointments to populate officers
      const { data: formationAppointments } = await supabaseAdmin
        .from('executive_appointments')
        .select('proposed_officer_name, proposed_title, proposed_officer_email')
        .eq('formation_mode', true)
        .in('status', ['APPROVED', 'SENT_TO_BOARD'])
        .order('created_at', { ascending: true })
        .limit(3);
      
      // Populate officers (up to 3)
      if (formationAppointments && formationAppointments.length > 0) {
        templateData.officer_1_name = formationAppointments[0]?.proposed_officer_name || '';
        templateData.officer_1_title = formationAppointments[0]?.proposed_title || '';
        templateData.officer_1_email = formationAppointments[0]?.proposed_officer_email || '';
        
        if (formationAppointments.length > 1) {
          templateData.officer_2_name = formationAppointments[1]?.proposed_officer_name || '';
          templateData.officer_2_title = formationAppointments[1]?.proposed_title || '';
          templateData.officer_2_email = formationAppointments[1]?.proposed_officer_email || '';
        } else {
          templateData.officer_2_name = '';
          templateData.officer_2_title = '';
          templateData.officer_2_email = '';
        }
        
        if (formationAppointments.length > 2) {
          templateData.officer_3_name = formationAppointments[2]?.proposed_officer_name || '';
          templateData.officer_3_title = formationAppointments[2]?.proposed_title || '';
          templateData.officer_3_email = formationAppointments[2]?.proposed_officer_email || '';
        } else {
          templateData.officer_3_name = '';
          templateData.officer_3_title = '';
          templateData.officer_3_email = '';
        }
      } else {
        // Default to current appointment
        templateData.officer_1_name = appointment.proposed_officer_name || '';
        templateData.officer_1_title = appointment.proposed_title || '';
        templateData.officer_1_email = appointment.proposed_officer_email || '';
        templateData.officer_2_name = '';
        templateData.officer_2_title = '';
        templateData.officer_2_email = '';
        templateData.officer_3_name = '';
        templateData.officer_3_title = '';
        templateData.officer_3_email = '';
      }
      
      // Set directors (default to incorporator and CEO if no directors table)
      templateData.director_1_name = 'Torrance Stroman';
      templateData.director_1_address = templateData.incorporator_address || templateData.principal_office || '';
      templateData.director_1_email = templateData.incorporator_email || 'tstroman.ceo@cravenusa.com';
      
      templateData.director_2_name = 'Invero';
      templateData.director_2_address = templateData.principal_office || '';
      templateData.director_2_email = 'invero@cravenusa.com';
      
      // Set appointees (current appointment and one other if available)
      templateData.appointee_1_name = appointment.proposed_officer_name || '';
      templateData.appointee_1_role = appointment.proposed_title || '';
      templateData.appointee_1_email = appointment.proposed_officer_email || '';
      
      if (formationAppointments && formationAppointments.length > 1 && formationAppointments[1]?.proposed_officer_name !== appointment.proposed_officer_name) {
        templateData.appointee_2_name = formationAppointments[1]?.proposed_officer_name || '';
        templateData.appointee_2_role = formationAppointments[1]?.proposed_title || '';
        templateData.appointee_2_email = formationAppointments[1]?.proposed_officer_email || '';
      } else {
        templateData.appointee_2_name = '';
        templateData.appointee_2_role = '';
        templateData.appointee_2_email = '';
      }
      
      // Set pre-incorporation agreements (default empty)
      templateData.counterparty_1 = '';
      templateData.agreement_1_name = '';
      templateData.agreement_1_date = '';
      templateData.agreement_1_notes = '';
    }

    // Fetch template from database - Fortune 500 14-document flow
    const templateKeyMap: Record<string, string> = {
      // Core employment documents
      'appointment_letter': 'offer_letter',
      'employment_agreement': 'employment_agreement',
      'confidentiality_ip': 'confidentiality_ip',
      
      // Board & formation documents
      'board_resolution': 'board_resolution',
      'pre_incorporation_consent': 'initial_director_consent',
      'certificate_of_incorporation': 'certificate_of_incorporation',
      'bylaws': 'craven_bylaws',
      
      // Governance documents
      'bylaws_acknowledgment': 'bylaws_acknowledgment',
      'fiduciary_ethics_ack': 'fiduciary_ethics_ack',
      'conflict_disclosure': 'conflict_disclosure',
      'officer_indemnification': 'officer_indemnification',
      
      // Equity documents
      'certificate': 'stock_certificate',
      'stock_subscription': 'stock_issuance',
      'equity_incentive_plan': 'equity_incentive_plan',
      'option_rsu_award': 'equity_award_agreement',
      
      // Compensation
      'deferred_compensation': 'deferred_comp_addendum',
    };

    const templateKey = templateKeyMap[document_type] || 'offer_letter';
    
    // Debug: Verify we can query templates at all
    console.log(`Looking for template: ${templateKey} for document_type: ${document_type}`);
    
    const { data: template, error: templateError } = await supabaseAdmin
      .from('document_templates')
      .select('html_content, placeholders')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError) {
      console.error(`Template ${templateKey} query error:`, {
        error: templateError,
        message: templateError.message,
        details: templateError.details,
        hint: templateError.hint,
        code: templateError.code
      });
      
      // If it's a "not found" error (PGRST116), provide helpful message
      if (templateError.code === 'PGRST116' || templateError.message?.includes('No rows')) {
        return new Response(
          JSON.stringify({ 
            error: `Template '${templateKey}' not found in database. Please ensure the migration has been applied.`,
            templateKey,
            hint: 'Run migration: 20250211000012_ensure_appointment_templates_exist.sql'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Database error while fetching template: ${templateError.message}`,
          templateKey,
          details: templateError.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!template) {
      console.error(`Template ${templateKey} returned null/undefined`);
      return new Response(
        JSON.stringify({ 
          error: `Template '${templateKey}' not found. Please create it in Template Manager.`,
          templateKey
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use html_content
    const htmlContent = template.html_content;
    if (!htmlContent) {
      console.error(`Template ${templateKey} has no HTML content`);
      return new Response(
        JSON.stringify({ error: `Template ${templateKey} has no HTML content.` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Debug: Log template data before replacement
    console.log('Template data for replacement:', {
      term_length_months: templateData.term_length_months,
      annual_salary: templateData.annual_salary,
      equity_percentage: templateData.equity_percentage,
      share_count: templateData.share_count,
      company_signature_date: templateData.company_signature_date,
      executive_signature_date: templateData.executive_signature_date,
      governing_law_state: templateData.governing_law_state,
      compensation_structure: compensationStructure,
      equity_details: equityDetails,
    });
    
    // Debug: Check for specific placeholders in template
    const testPlaceholders = ['company_signature_date', 'executive_signature_date', 'governing_law_state'];
    testPlaceholders.forEach(ph => {
      const regex = new RegExp(`\\{\\{${ph}\\}\\}`, 'gi');
      if (regex.test(htmlContent)) {
        console.log(`Found placeholder ${ph} in template`);
      }
    });

    // Render HTML (replace placeholders)
    let html = htmlContent;
    
    // Add CSS to hide signature tags but preserve them in PDF
    const signatureTagCSS = `
<style>
  [data-sig] {
    font-size: 0px !important;
    color: transparent !important;
    visibility: hidden !important;
    position: absolute !important;
    width: 0px !important;
    height: 0px !important;
    overflow: hidden !important;
    line-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
`;
    
    // Inject CSS into HTML head if it exists, otherwise before body
    if (html.includes('</head>')) {
      html = html.replace('</head>', signatureTagCSS + '</head>');
    } else if (html.includes('<body')) {
      html = html.replace('<body', signatureTagCSS + '<body');
    } else if (html.includes('<!DOCTYPE') || html.includes('<html')) {
      // Insert after opening html tag
      html = html.replace(/(<html[^>]*>)/i, '$1' + signatureTagCSS);
    } else {
      // Prepend to HTML if no structure found
      html = signatureTagCSS + html;
    }
    
    // Add data-sig attributes to signature tags before replacing placeholders
    // This preserves the tags as anchor points in the PDF
    const signatureTagMap: Record<string, RegExp> = {
      'CEO': /\{\{SIGNATURE_CEO\}\}/gi,
      'CFO': /\{\{SIGNATURE_CFO\}\}/gi,
      'CTO': /\{\{SIGNATURE_CTO\}\}/gi,
      'CXO': /\{\{SIGNATURE_CXO\}\}/gi,
      'COO': /\{\{SIGNATURE_COO\}\}/gi,
      'SECRETARY': /\{\{SIGNATURE_SECRETARY\}\}/gi,
      'BOARD': /\{\{SIGNATURE_BOARD\}\}/gi,
    };
    
    Object.entries(signatureTagMap).forEach(([role, pattern]) => {
      html = html.replace(pattern, `<span data-sig="${role}">$&</span>`);
    });
    
    // First pass: Replace all known placeholders
    console.log('Starting placeholder replacement with', Object.keys(templateData).length, 'keys');
    Object.keys(templateData).forEach((key) => {
      const value = templateData[key];
      // Replace placeholders even if value is null/undefined/0 - replace with empty string or appropriate default
      let replacementValue = '';
      if (value !== null && value !== undefined) {
        replacementValue = String(value);
      } else if (key === 'term_length_months' && value === null) {
        replacementValue = 'N/A';
      } else if (key.includes('salary') || key.includes('percentage') || key.includes('share')) {
        replacementValue = '0';
      }
      
      // Use simple string replacement for all placeholder formats
      // This handles special characters better than regex
      const placeholderFormats = [
        `{{${key}}}`,
        `{{ ${key} }}`,
        `\${${key}}`,
        `[${key}]`,
        `[[${key}]]`,
      ];
      
      let replaced = false;
      placeholderFormats.forEach(placeholder => {
        if (html.includes(placeholder)) {
          replaced = true;
          console.log(`Replacing ${placeholder} with: ${replacementValue}`);
        }
        // Global replacement using split/join for all occurrences
        html = html.split(placeholder).join(replacementValue);
      });
    });
    
    // Second pass: Find and replace any remaining placeholders with empty string or sensible defaults
    const remainingPlaceholders = [
      ...(html.match(/\{\{[^}]+\}\}/g) || []),
      ...(html.match(/\[\[[^\]]+\]\]/g) || [])
    ];
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      const uniquePlaceholders = [...new Set(remainingPlaceholders)];
      console.warn('Unreplaced placeholders found:', uniquePlaceholders);
      
      // Replace remaining placeholders with defaults based on their name
      uniquePlaceholders.forEach((placeholder: string) => {
        const key = placeholder.replace(/\{\{|\}\}|\[\[|\]\]/g, '').trim();
        let defaultValue = '';
        
        // Smart defaults based on placeholder name
        if (key.includes('signature') && (key.includes('date') || key.includes('Date'))) {
          defaultValue = formatDate(appointment.effective_date || new Date().toISOString().split('T')[0]);
        } else if (key.includes('date') || key.includes('Date')) {
          defaultValue = formatDate(appointment.effective_date || new Date().toISOString().split('T')[0]);
        } else if (key.includes('governing') && (key.includes('law') || key.includes('state'))) {
          defaultValue = governingState;
        } else if (key.includes('state') && !key.includes('date')) {
          defaultValue = governingState;
        } else if (key.includes('name') || key.includes('Name')) {
          defaultValue = appointment.proposed_officer_name || '';
        } else if (key.includes('email') || key.includes('Email')) {
          defaultValue = appointment.proposed_officer_email || '';
        } else if (key.includes('title') || key.includes('Title')) {
          defaultValue = appointment.proposed_title || '';
        } else if (key.includes('company')) {
          defaultValue = companyName;
        } else if (key.includes('salary') && key.includes('currency')) {
          defaultValue = '$';
        } else if (key.includes('currency')) {
          defaultValue = 'USD';
        } else if (key.includes('trigger') && key.includes('condition')) {
          defaultValue = 'the Company achieves a liquidity event (including but not limited to a merger, acquisition, sale of substantially all assets, or initial public offering), or the Executive\'s employment is terminated by the Company without cause, or the Executive\'s employment is terminated due to death or disability';
        } else if (key.includes('salary') || key.includes('Salary')) {
          defaultValue = '$0';
        } else if (key.includes('share') || key.includes('Share') || key.includes('equity') || key.includes('Equity')) {
          defaultValue = '0';
        } else if (key.includes('percentage') || key.includes('Percentage') || key.includes('percent') || key.includes('Percent')) {
          defaultValue = '0';
        }
        
        // Replace all instances of this placeholder using simple string replacement
        html = html.split(placeholder).join(defaultValue);
      });
    }

    // Keep signature field tags in place - they will be replaced during signing
    // Format: {{SIGNATURE_FIELD:role:type}} - these are board-tagged signature fields
    // We leave them as-is so the signing function can find and replace them

    // Upload HTML to storage
    const htmlBlob = new Blob([html], { type: 'text/html' });
    
    const bucketMap: Record<string, string> = {
      'appointment_letter': 'contracts-executives',
      'board_resolution': 'governance-resolutions',
      'employment_agreement': 'contracts-executives',
      'certificate': 'governance-certificates',
      'deferred_compensation': 'contracts-executives',
      'confidentiality_ip': 'contracts-executives',
      'stock_subscription': 'contracts-executives',
      'pre_incorporation_consent': 'governance-resolutions',
    };

    const bucket = bucketMap[document_type] || 'contracts-executives';
    const fileName = `${appointment_id}/${document_type}_${Date.now()}.html`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, htmlBlob, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      const errorMessage = uploadError.message || JSON.stringify(uploadError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to upload document to storage: ${errorMessage}. Make sure the storage bucket allows HTML files (text/html).` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL (buckets are now public for easier document viewing)
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to generate document URL' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentUrl = urlData.publicUrl;

    // Update appointment with document URL
    const documentFieldMap: Record<string, string> = {
      'appointment_letter': 'appointment_letter_url',
      'board_resolution': 'board_resolution_url',
      'employment_agreement': 'employment_agreement_url',
      'certificate': 'certificate_url',
      'deferred_compensation': 'deferred_compensation_url',
      'confidentiality_ip': 'confidentiality_ip_url',
      'stock_subscription': 'stock_subscription_url',
      'pre_incorporation_consent': 'pre_incorporation_consent_url',
      'certificate_of_incorporation': 'certificate_of_incorporation_url',
      'bylaws': 'bylaws_url',
      'bylaws_acknowledgment': 'bylaws_acknowledgment_url',
      'fiduciary_ethics_ack': 'fiduciary_ethics_url',
      'conflict_disclosure': 'conflict_disclosure_url',
      'officer_indemnification': 'officer_indemnification_url',
      'equity_incentive_plan': 'equity_plan_url',
      'option_rsu_award': 'option_rsu_award_url',
    };

    const documentField = documentFieldMap[document_type];
    if (documentField) {
      const { error: updateError, data: updateData } = await supabaseAdmin
        .from('executive_appointments')
        .update({ [documentField]: documentUrl })
        .eq('id', appointment_id)
        .select();

      if (updateError) {
        console.error(`Failed to update ${documentField} for appointment ${appointment_id}:`, updateError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Document generated but failed to save URL: ${updateError.message}`,
            document_url: documentUrl,
            document_type 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Successfully updated ${documentField} for appointment ${appointment_id} with URL: ${documentUrl}`);
    } else {
      console.warn(`No document field mapping found for document_type: ${document_type}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_url: documentUrl,
        document_type 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating document:', error);
    const errorMessage = error?.message || error?.toString() || 'Internal server error';
    console.error('Error details:', {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
      appointment_id,
      document_type,
    });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

