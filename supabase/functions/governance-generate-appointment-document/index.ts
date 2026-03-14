import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

const TORRANCE_SIG_URL = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/torrance_stroman_signature.png';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

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

function stripCompanySignatureLines(html: string): string {
  if (!html) return html;
  html = html.replace(/<p[^>]*>_+\s*<\/p>\s*(<p[^>]*><strong>[^<]*Inc\.[^<]*<\/strong><\/p>)/gi, '$1');
  html = html.replace(/<p[^>]*>_+\s*<\/p>\s*/gi, '');
  html = html.replace(/<p[^>]*>By:\s*_+\s*<\/p>\s*/gi, '');
  return html;
}

function injectSecretarySignature(html: string, sigUrl: string): string {
  if (!html || !sigUrl) return html;
  return html.replace(
    /(<p[^>]*>\s*)Secretary(\s*<\/p>)/gi,
    `$1<img src="${sigUrl}" alt="Torrance Stroman Signature" style="height:60px;object-fit:contain;" /><br />Secretary$2`,
  );
}

function injectTorranceSignatureEverywhere(html: string, sigUrl: string): string {
  if (!html || !sigUrl) return html;
  if (html.includes(sigUrl)) return html;
  const img = `<img src="${sigUrl}" alt="Torrance Stroman Signature" style="height:60px;object-fit:contain;" /><br />Torrance A. Stroman`;
  return html.replace(/Torrance\s+A\.?\s*Stroman|Torrance\s+Stroman/gi, img);
}

/** Stock certificate only: ensure signature areas show only the image (sized to fit) and plain name. */
function fixStockCertificateSignatures(html: string, signatureUrl: string): string {
  if (!html || !signatureUrl) return html;
  let out = html;
  // Fix img inside .signature-line: correct src and alt, constrained size (no HTML in alt).
  out = out.replace(
    /<img\s+[^>]*class="signature-img"[^>]*>/gi,
    `<img class="signature-img" src="${signatureUrl}" alt="Torrance Stroman Signature" style="max-height:0.3in;object-fit:contain;" />`
  );
  // Replace .signer-name content with plain text so we don't render an image in the name line.
  out = out.replace(
    /<div class="signer-name"[^>]*>[\s\S]*?<\/div>/gi,
    '<div class="signer-name">Torrance A. Stroman</div>'
  );
  return out;
}

// Nuclear approach: find the earliest signature/witness marker in the HTML,
// CUT everything from that point to </body>, and APPEND a clean, hardcoded
// signature block with Torrance's image ABOVE his name.
function forceSignatureSection(
  html: string,
  documentType: string,
  officerName: string,
  officerTitle: string,
  companyName: string,
): string {
  if (!html) return html;

  const handledTypes = [
    'bylaws_acknowledgment',
    'fiduciary_ethics_ack',
    'conflict_disclosure',
    'officer_indemnification',
    'equity_incentive_plan',
    'option_rsu_award',
    'certificate',
  ];
  if (!handledTypes.includes(documentType)) return html;

  const sigImg = `<img src="${TORRANCE_SIG_URL}" alt="Torrance Stroman Signature" style="height:60px;object-fit:contain;display:block;margin-bottom:4px;" />`;

  // Find the earliest cut-point among known signature markers (case-insensitive)
  const lowerHtml = html.toLowerCase();
  const markers = [
    'in witness whereof',
    'class="signature-section"',
    "class='signature-section'",
    'class="signature-block"',
    "class='signature-block'",
  ];

  let cutIndex = -1;
  for (const marker of markers) {
    const idx = lowerHtml.indexOf(marker);
    if (idx !== -1) {
      const tagStart = html.lastIndexOf('<', idx);
      if (tagStart !== -1 && (cutIndex === -1 || tagStart < cutIndex)) {
        cutIndex = tagStart;
      }
    }
  }

  // If nothing found, cut right before </body>
  if (cutIndex === -1) {
    const bodyEnd = lowerHtml.lastIndexOf('</body>');
    cutIndex = bodyEnd !== -1 ? bodyEnd : html.length;
  }

  const cleanHtml = html.substring(0, cutIndex);

  let block = '';
  switch (documentType) {
    case 'bylaws_acknowledgment':
    case 'fiduciary_ethics_ack':
    case 'conflict_disclosure':
    case 'officer_indemnification':
      block = `
<div style="margin-top:60px;border-top:1px solid #ccc;padding-top:30px;">
  <p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date first written above.</p>
  <div style="display:flex;justify-content:space-between;gap:40px;margin-top:30px;">
    <div style="width:45%;">
      <p><strong>${companyName}</strong></p>
      ${sigImg}
      <p>Torrance A. Stroman<br/>Chief Executive Officer &amp; Corporate Secretary</p>
    </div>
    <div style="width:45%;">
      <div style="border-bottom:1px solid #000;width:280px;margin-top:76px;margin-bottom:5px;"></div>
      <p><strong>Executive Signature</strong><br/>${officerName}<br/>${officerTitle}</p>
    </div>
  </div>
</div>`;
      break;

    case 'equity_incentive_plan':
      block = `
<div style="margin-top:60px;border-top:1px solid #ccc;padding-top:30px;">
  <p>IN WITNESS WHEREOF, this Plan is adopted by the Board of Directors as of the Effective Date.</p>
  <div style="margin-top:30px;">
    <div style="margin-bottom:40px;">
      ${sigImg}
      <p>Torrance A. Stroman<br/>Board Chair &amp; Chief Executive Officer</p>
    </div>
    <div>
      ${sigImg}
      <p>Torrance A. Stroman<br/>Corporate Secretary</p>
    </div>
  </div>
</div>`;
      break;

    case 'option_rsu_award':
      block = `
<div style="margin-top:60px;border-top:1px solid #ccc;padding-top:30px;">
  <p>IN WITNESS WHEREOF, the parties have executed this Equity Award Agreement as of the Effective Date.</p>
  <div style="display:flex;justify-content:space-between;gap:40px;margin-top:30px;">
    <div style="width:45%;">
      <p><strong>Company</strong></p>
      <p>${companyName}</p>
      ${sigImg}
      <p>Torrance A. Stroman, Chief Executive Officer</p>
    </div>
    <div style="width:45%;">
      <p><strong>Participant</strong></p>
      <p>${officerName}</p>
      <div style="border-bottom:1px solid #000;width:280px;margin-top:40px;margin-bottom:5px;"></div>
      <p><strong>Executive Signature</strong></p>
    </div>
  </div>
</div>`;
      break;

    case 'certificate':
      return html;

    default:
      return html;
  }

  return cleanHtml + '\n' + block + '\n</body>\n</html>';
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

    // Resolve officer name, email, title from executive_id -> exec_users (+ user_profiles/auth)
    let officerName = (appointment as any).proposed_officer_name;
    let officerEmail = (appointment as any).proposed_officer_email;
    let officerTitle = (appointment as any).proposed_title ?? appointment.position;
    if (appointment.executive_id) {
      const { data: execUser } = await supabaseAdmin
        .from('exec_users')
        .select('user_id, name, email, title')
        .eq('id', appointment.executive_id)
        .single();
      if (execUser) {
        officerTitle = officerTitle || execUser.title || appointment.position;
        officerName = officerName || execUser.name;
        officerEmail = officerEmail || (execUser.email ?? null);
        if (execUser.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', execUser.user_id)
            .maybeSingle();
          if (profile) {
            officerName = officerName || profile.full_name;
            officerEmail = officerEmail || (profile.email ?? officerEmail);
          }
          if (!officerEmail) {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(execUser.user_id);
            officerEmail = officerEmail || (user?.email ?? null);
          }
        }
      }
    }

    // Fetch resolution if exists (support both resolution_id and board_resolution_id)
    let resolution = null;
    const resolutionId = appointment.resolution_id ?? (appointment as any).board_resolution_id;
    if (resolutionId) {
      const { data: resData } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('*')
        .eq('id', resolutionId)
        .single();
      resolution = resData;
    }

    // Fetch company settings for governing state, company name, and Torrance's signature image URL
    let governingState = 'Delaware'; // Default fallback
    let companyName = 'Crave\'n, Inc.'; // Default fallback
    let torranceSignatureUrl = ''; // Will be used to render signature image in documents
    
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['state_of_incorporation', 'company_name', 'torrance_signature_url']);
    
    if (companySettings) {
      companySettings.forEach((setting) => {
        if (setting.setting_key === 'state_of_incorporation' && setting.setting_value) {
          governingState = setting.setting_value;
        }
        if (setting.setting_key === 'company_name' && setting.setting_value) {
          companyName = setting.setting_value;
        }
        if (setting.setting_key === 'torrance_signature_url' && setting.setting_value) {
          torranceSignatureUrl = setting.setting_value;
        }
      });
    }
    
    // Allow environment variable override for signature URL if needed
    if (!torranceSignatureUrl) {
      const envSignature = Deno.env.get('TORRANCE_SIGNATURE_URL');
      if (envSignature) {
        torranceSignatureUrl = envSignature;
      }
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
    const compensationRaw = appointment.compensation_structure ?? (appointment as any).compensation_structure;
    if (compensationRaw) {
      if (typeof compensationRaw === 'string') {
        try {
          compensationStructure = JSON.parse(compensationRaw);
        } catch (e) {
          console.warn('compensation_structure is not valid JSON, treating as text:', compensationRaw);
          compensationStructure = { description: compensationRaw };
        }
      } else {
        compensationStructure = compensationRaw as CompensationStructure;
      }
    }
    
    const equityDetailsRaw = appointment.equity_details ?? (appointment as any).equity_details;
    let equityDetails: EquityDetails = {};
    if (equityDetailsRaw) {
      if (typeof equityDetailsRaw === 'string') {
        try {
          equityDetails = JSON.parse(equityDetailsRaw);
        } catch (e) {
          equityDetails = { description: equityDetailsRaw };
        }
      } else {
        equityDetails = equityDetailsRaw as EquityDetails;
      }
    }

    // Map appointment data to template placeholders - supporting multiple formats
    const templateData: Record<string, any> = {
      // Name variations (all formats) - from exec_users/user_profiles when using new schema
      full_name: officerName,
      executive_name: officerName,
      officer_name: officerName,
      name: officerName,
      proposed_officer_name: officerName,
      EXECUTIVE_NAME: officerName,
      OFFICER_NAME: officerName,
      FULL_NAME: officerName,
      NAME: officerName,
      
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
      proposed_officer_email: officerEmail || '',
      email: officerEmail || '',
      EMAIL: officerEmail || '',
      'officer.email': officerEmail || '',
      proposed_officer_phone: (appointment as any).proposed_officer_phone || '',
      phone: (appointment as any).proposed_officer_phone || '',
      PHONE: (appointment as any).proposed_officer_phone || '',
      
      // Title variations (all formats) - position is the new-schema column
      role: officerTitle,
      position: officerTitle,
      title: officerTitle,
      position_title: officerTitle,
      executive_title: officerTitle,
      proposed_title: officerTitle,
      TITLE: officerTitle,
      ROLE: officerTitle,
      POSITION: officerTitle,
      'officer.title': officerTitle,
      
      // Company and dates (all formats)
      company_name: companyName,
      COMPANY_NAME: companyName,
      'company.legalName': companyName,
      ceoName: 'Torrance Stroman',
      CEO_NAME: 'Torrance Stroman',
      'officer.fullName': officerName,
      effective_date: appointment.effective_date,
      date: appointment.effective_date,
      appointment_date: appointment.effective_date,
      board_meeting_date: (appointment as any).board_meeting_date || appointment.effective_date,
      
      // Appointment details
      appointment_type: appointment.appointment_type || 'initial',
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
      shares_amount: equityDetails.share_count ? formatNumber(equityDetails.share_count) : '0', // stock certificate template uses {{shares_amount}}
      vesting_schedule: equityDetails.vesting_schedule || '',
      exercise_price: equityDetails.exercise_price || '',
      equity_included: (appointment.equity_included ?? (appointment as any).equity_included) ? 'Yes' : 'No',
      
      // Authority and terms
      authority_granted: (appointment as any).authority_granted || 'Standard executive authority',
      term_length_months: (appointment as any).term_length_months ? String((appointment as any).term_length_months) : 'N/A',
      term_end: (appointment as any).term_end || null,
      
      // Resolution details
      resolution_number: resolution?.resolution_number || 'TBD',
      resolution_date: resolution?.meeting_date || appointment.effective_date,
      
      // Stock Certificate specific fields
      certificate_number: `CERT-${appointment.id.substring(0, 8).toUpperCase()}`,
      share_class: 'Common',
      company_state: governingState,
      issue_date: appointment.effective_date,
      // URL only - for stock certificate img src (so we don't put HTML in src/alt)
      signature_url: torranceSignatureUrl || TORRANCE_SIG_URL,
      // Full img tag for templates that embed it inline; also used as printed name fallback
      company_signatory_name: `<img src="${torranceSignatureUrl || TORRANCE_SIG_URL}" alt="Torrance Stroman Signature" style="height:60px;object-fit:contain;" />`,
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
      templateData.officer_name = officerName || '';
      templateData.officer_role = officerTitle || '';
      templateData.board_meeting_date = (appointment as any).board_meeting_date 
        ? formatDate((appointment as any).board_meeting_date) 
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

    // Nuclear: cut the entire tail signature area and replace it with a
    // hardcoded block that uses the Torrance signature image ABOVE his name.
    html = forceSignatureSection(html, document_type, officerName || '', officerTitle || 'Executive', companyName);

    // Strip leftover underline / "By: ______" paragraphs
    html = stripCompanySignatureLines(html);

    // Secretary standalone lines -> Torrance image
    html = injectSecretarySignature(html, torranceSignatureUrl || TORRANCE_SIG_URL);

    // Catch any remaining Torrance name text without an image
    html = injectTorranceSignatureEverywhere(html, torranceSignatureUrl || TORRANCE_SIG_URL);

    // Stock certificate: signature areas must show only the image (sized to fit) and plain name
    if (document_type === 'certificate') {
      html = fixStockCertificateSignatures(html, torranceSignatureUrl || TORRANCE_SIG_URL);
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

