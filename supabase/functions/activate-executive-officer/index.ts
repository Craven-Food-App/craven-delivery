import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function to format dates
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

// Step 1: Generate Appointment Certificate
async function generateAppointmentCertificate(
  appointment: any,
  supabaseAdmin: any
): Promise<string> {
  try {
    // Fetch resolution details if available
    let resolutionNumber = 'N/A';
    if (appointment.board_resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('resolution_number')
        .eq('id', appointment.board_resolution_id)
        .single();
      
      if (resolution) {
        resolutionNumber = resolution.resolution_number;
      }
    }

    // Fetch company settings
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['company_name', 'state', 'registered_office']);

    const settings: Record<string, string> = {};
    companySettings?.forEach((s: any) => {
      settings[s.setting_key] = s.setting_value || '';
    });

    const companyName = settings.company_name || 'Crave\'n USA, Inc.';
    const state = settings.state || 'Delaware';
    const effectiveDate = formatDate(appointment.effective_date);

    // Generate certificate HTML
    const certificateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Certificate - ${appointment.proposed_officer_name}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      margin: 0;
      padding: 60px;
      background: white;
      color: #000;
    }
    .certificate {
      border: 8px solid #1a1a1a;
      padding: 60px;
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    h1 {
      text-align: center;
      font-size: 36px;
      margin-bottom: 40px;
      font-weight: bold;
      letter-spacing: 2px;
    }
    .content {
      text-align: center;
      font-size: 18px;
      line-height: 1.8;
      margin: 40px 0;
    }
    .name {
      font-size: 28px;
      font-weight: bold;
      margin: 30px 0;
      text-decoration: underline;
    }
    .title {
      font-size: 22px;
      font-style: italic;
      margin: 20px 0;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      font-size: 14px;
    }
    .signature-line {
      margin-top: 80px;
      border-top: 2px solid #000;
      width: 300px;
      margin-left: auto;
      margin-right: auto;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>CERTIFICATE OF APPOINTMENT</h1>
    
    <div class="content">
      <p>This is to certify that</p>
      <div class="name">${appointment.proposed_officer_name}</div>
      <p>has been duly appointed as</p>
      <div class="title">${appointment.proposed_title}</div>
      <p>of</p>
      <p><strong>${companyName}</strong></p>
      <p>a ${state} corporation,</p>
      <p>effective ${effectiveDate}.</p>
      
      <p style="margin-top: 40px;">
        This appointment is made pursuant to Board Resolution ${resolutionNumber}.
      </p>
    </div>
    
    <div class="footer">
      <div class="signature-line">
        Corporate Secretary
      </div>
      <p style="margin-top: 20px;">
        ${formatDate(new Date().toISOString())}
      </p>
    </div>
  </div>
</body>
</html>`;

    // Upload certificate to storage
    const fileName = `certificates/appointment_${appointment.id}_${Date.now()}.html`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('governance-documents')
      .upload(fileName, certificateHtml, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('governance-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error: any) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

// Step 2: Insert into Officer Ledger
async function insertOfficerLedger(
  appointment: any,
  certificateUrl: string,
  supabaseAdmin: any
): Promise<void> {
  let resolutionNumber = null;
  if (appointment.board_resolution_id) {
    const { data: resolution } = await supabaseAdmin
      .from('governance_board_resolutions')
      .select('resolution_number')
      .eq('id', appointment.board_resolution_id)
      .single();
    
    if (resolution) {
      resolutionNumber = resolution.resolution_number;
    }
  }

  const { error } = await supabaseAdmin
    .from('officer_ledger')
    .insert({
      appointment_id: appointment.id,
      name: appointment.proposed_officer_name,
      title: appointment.proposed_title,
      effective_date: appointment.effective_date,
      certificate_url: certificateUrl,
      resolution_id: appointment.board_resolution_id,
      resolution_number: resolutionNumber,
      status: 'ACTIVE',
    });

  if (error) {
    throw new Error(`Failed to insert into officer ledger: ${error.message}`);
  }
}

// Step 3: Create Corporate Officer Record
async function createCorporateOfficerRecord(
  appointment: any,
  certificateUrl: string,
  supabaseAdmin: any
): Promise<string> {
  // Check if officer already exists
  const { data: existingOfficer } = await supabaseAdmin
    .from('corporate_officers')
    .select('id')
    .eq('email', appointment.proposed_officer_email)
    .maybeSingle();

  if (existingOfficer) {
    // Update existing record
    const { error } = await supabaseAdmin
      .from('corporate_officers')
      .update({
        full_name: appointment.proposed_officer_name,
        title: appointment.proposed_title,
        effective_date: appointment.effective_date,
        certificate_url: certificateUrl,
        appointed_by: appointment.board_resolution_id,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingOfficer.id);

    if (error) {
      throw new Error(`Failed to update corporate officer: ${error.message}`);
    }

    return existingOfficer.id;
  } else {
    // Create new record
    const { data: newOfficer, error } = await supabaseAdmin
      .from('corporate_officers')
      .insert({
        full_name: appointment.proposed_officer_name,
        email: appointment.proposed_officer_email,
        title: appointment.proposed_title,
        effective_date: appointment.effective_date,
        certificate_url: certificateUrl,
        appointed_by: appointment.board_resolution_id,
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (error || !newOfficer) {
      throw new Error(`Failed to create corporate officer: ${error?.message || 'Unknown error'}`);
    }

    return newOfficer.id;
  }
}

// Step 4: Assign System Roles
async function assignSystemRoles(
  appointment: any,
  supabaseAdmin: any
): Promise<void> {
  // Get user_id from email
  const { data: user } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = user?.users.find((u: any) => 
    u.email?.toLowerCase() === appointment.proposed_officer_email?.toLowerCase()
  );

  if (!targetUser) {
    console.warn(`User not found for email: ${appointment.proposed_officer_email}`);
    return;
  }

  // Map title to role
  const titleToRole: Record<string, string> = {
    'CEO': 'CRAVEN_CEO',
    'CFO': 'CRAVEN_CFO',
    'CTO': 'CRAVEN_CTO',
    'COO': 'CRAVEN_COO',
    'CXO': 'CRAVEN_EXECUTIVE',
  };

  const role = titleToRole[appointment.proposed_title.toUpperCase()] || 'CRAVEN_EXECUTIVE';

  // Assign roles
  const rolesToAssign = ['CRAVEN_EXECUTIVE', role];

  for (const roleName of rolesToAssign) {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: targetUser.id,
        role: roleName,
      }, {
        onConflict: 'user_id,role',
      });

    if (error) {
      console.error(`Failed to assign role ${roleName}:`, error);
    }
  }
}

// Step 5: IT Access Provisioning
async function provisionITAccess(
  appointment: any,
  supabaseAdmin: any
): Promise<void> {
  // Get user_id from email
  const { data: user } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = user?.users.find((u: any) => 
    u.email?.toLowerCase() === appointment.proposed_officer_email?.toLowerCase()
  );

  if (!targetUser) {
    console.warn(`User not found for email: ${appointment.proposed_officer_email}`);
    return;
  }

  // Ensure exec_users record exists
  const { data: existingExec } = await supabaseAdmin
    .from('exec_users')
    .select('id')
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (!existingExec) {
    const roleMap: Record<string, string> = {
      'CEO': 'ceo',
      'CFO': 'cfo',
      'CTO': 'cto',
      'COO': 'coo',
    };

    const execRole = roleMap[appointment.proposed_title.toUpperCase()] || 'executive';

    await supabaseAdmin
      .from('exec_users')
      .insert({
        user_id: targetUser.id,
        role: execRole,
        access_level: 1,
        title: appointment.proposed_title,
        department: 'Executive',
      });
  }
}

// Step 6: Equity Activation
async function activateEquity(
  appointment: any,
  supabaseAdmin: any
): Promise<void> {
  if (!appointment.equity_included) {
    return;
  }

  // Get user_id from email
  const { data: user } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = user?.users.find((u: any) => 
    u.email?.toLowerCase() === appointment.proposed_officer_email?.toLowerCase()
  );

  if (!targetUser) {
    console.warn(`User not found for email: ${appointment.proposed_officer_email}`);
    return;
  }

  // Parse equity details
  const equityMatch = appointment.equity_details?.match(/(\d+(?:\.\d+)?)/);
  const sharesGranted = equityMatch ? parseFloat(equityMatch[1]) : 0;

  if (sharesGranted > 0) {
    await supabaseAdmin
      .from('cap_table_entries')
      .insert({
        holder_id: targetUser.id,
        appointment_id: appointment.id,
        shares_granted: sharesGranted,
        vesting_start_date: appointment.effective_date,
        vesting_months: appointment.term_length_months || 48,
        is_deferred: false,
      });
  }
}

// Step 7: Compensation Activation
async function activateCompensation(
  appointment: any,
  supabaseAdmin: any
): Promise<void> {
  // Get user_id from email
  const { data: user } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = user?.users.find((u: any) => 
    u.email?.toLowerCase() === appointment.proposed_officer_email?.toLowerCase()
  );

  if (!targetUser) {
    console.warn(`User not found for email: ${appointment.proposed_officer_email}`);
    return;
  }

  // Parse compensation structure
  const compMatch = appointment.compensation_structure?.match(/\$?(\d+(?:,\d+)*(?:\.\d+)?)/);
  const baseSalary = compMatch ? parseFloat(compMatch[1].replace(/,/g, '')) : null;

  if (baseSalary) {
    // Determine if deferred based on compensation structure text
    const isDeferred = appointment.compensation_structure?.toLowerCase().includes('deferred') || false;
    const activationTrigger = isDeferred ? 'MRR_100K' : 'IMMEDIATE';

    await supabaseAdmin
      .from('executive_compensation')
      .insert({
        user_id: targetUser.id,
        appointment_id: appointment.id,
        base_salary: baseSalary,
        is_deferred: isDeferred,
        activation_trigger: activationTrigger,
        trigger_status: isDeferred ? 'PENDING' : 'ACTIVE',
        activated_at: isDeferred ? null : new Date().toISOString(),
      });
  }
}

// Step 8: Banking Authority Preparation
async function prepareBankingAuthority(
  appointment: any,
  officerId: string,
  supabaseAdmin: any
): Promise<void> {
  // Determine banking permissions based on title
  const title = appointment.proposed_title.toUpperCase();
  const canSignWires = ['CEO', 'CFO'].includes(title);
  const canSignChecks = ['CEO', 'CFO', 'COO'].includes(title);
  const canAccessTreasury = ['CEO', 'CFO'].includes(title);

  await supabaseAdmin
    .from('executive_banking_authority')
    .insert({
      officer_id: officerId,
      appointment_id: appointment.id,
      role: appointment.proposed_title,
      can_sign_wires: canSignWires,
      can_sign_checks: canSignChecks,
      can_access_treasury_portal: canAccessTreasury,
      status: 'PENDING_BANK_UPLOAD',
    });
}

// Step 9: Compliance Activation
async function activateCompliance(
  appointment: any,
  supabaseAdmin: any
): Promise<void> {
  // Get user_id from email
  const { data: user } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = user?.users.find((u: any) => 
    u.email?.toLowerCase() === appointment.proposed_officer_email?.toLowerCase()
  );

  if (!targetUser) {
    console.warn(`User not found for email: ${appointment.proposed_officer_email}`);
    return;
  }

  // Check if documents are signed
  const { data: documents } = await supabaseAdmin
    .from('executive_documents')
    .select('type, signature_status')
    .eq('appointment_id', appointment.id);

  const ndaSigned = documents?.some((d: any) => 
    d.type === 'confidentiality_ip' && d.signature_status === 'signed'
  ) || false;

  const conflictFormSigned = documents?.some((d: any) => 
    d.type === 'conflict_of_interest' && d.signature_status === 'signed'
  ) || false;

  await supabaseAdmin
    .from('executive_compliance_records')
    .insert({
      user_id: targetUser.id,
      appointment_id: appointment.id,
      nda_signed: ndaSigned,
      conflict_form_signed: conflictFormSigned,
      identity_verified: true, // Assumed verified by secretary
      background_verified: true, // Assumed verified by secretary
      added_to_do_insurance: false, // Manual toggle
    });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing appointment_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Supabase environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Appointment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Update status to ACTIVATING
    await supabaseAdmin
      .from('executive_appointments')
      .update({ status: 'ACTIVATING' })
      .eq('id', appointment_id);

    // Log timeline event
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'ACTIVATION_STARTED',
      event_description: 'Executive activation workflow started',
      metadata: { started_at: new Date().toISOString() },
    });

    // Step 1: Generate Appointment Certificate
    const certificateUrl = await generateAppointmentCertificate(appointment, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'CERTIFICATE_GENERATED',
      event_description: 'Appointment certificate generated',
      metadata: { certificate_url: certificateUrl },
    });

    // Step 2: Insert into Officer Ledger
    await insertOfficerLedger(appointment, certificateUrl, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'LEDGER_UPDATED',
      event_description: 'Officer added to official ledger',
    });

    // Step 3: Create Corporate Officer Record
    const officerId = await createCorporateOfficerRecord(appointment, certificateUrl, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'OFFICER_RECORD_CREATED',
      event_description: 'Corporate officer record created',
      metadata: { officer_id: officerId },
    });

    // Step 4: Assign System Roles
    await assignSystemRoles(appointment, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'ROLES_ASSIGNED',
      event_description: 'System roles assigned',
    });

    // Step 5: IT Access Provisioning
    await provisionITAccess(appointment, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'IT_ACCESS_PROVISIONED',
      event_description: 'IT access and permissions granted',
    });

    // Step 6: Equity Activation
    if (appointment.equity_included) {
      await activateEquity(appointment, supabaseAdmin);
      await supabaseAdmin.from('officer_activation_timeline').insert({
        appointment_id,
        event_type: 'EQUITY_ACTIVATED',
        event_description: 'Equity grants activated',
      });
    }

    // Step 7: Compensation Activation
    await activateCompensation(appointment, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'COMPENSATION_ADDED',
      event_description: 'Compensation record created',
    });

    // Step 8: Banking Authority Preparation
    await prepareBankingAuthority(appointment, officerId, supabaseAdmin);
    
    // Generate banking authorization packet
    try {
      const packetResponse = await fetch(`${supabaseUrl}/functions/v1/generate-banking-authorization-packet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
        body: JSON.stringify({ appointment_id }),
      });
      
      if (packetResponse.ok) {
        const packetData = await packetResponse.json();
        await supabaseAdmin.from('officer_activation_timeline').insert({
          appointment_id,
          event_type: 'BANKING_AUTHORITY_PREPARED',
          event_description: 'Banking authorization packet generated',
          metadata: { packet_url: packetData.packet_url },
        });
      }
    } catch (packetError) {
      console.error('Error generating banking packet:', packetError);
      // Don't fail activation if packet generation fails
      await supabaseAdmin.from('officer_activation_timeline').insert({
        appointment_id,
        event_type: 'BANKING_AUTHORITY_PREPARED',
        event_description: 'Banking authorization packet preparation attempted',
        metadata: { error: 'Packet generation failed, can be retried manually' },
      });
    }

    // Step 9: Compliance Activation
    await activateCompliance(appointment, supabaseAdmin);
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'COMPLIANCE_ACTIVATED',
      event_description: 'Compliance records created',
    });

    // Step 10: Update Status to ACTIVE
    await supabaseAdmin
      .from('executive_appointments')
      .update({
        status: 'ACTIVE',
        activation_date: new Date().toISOString(),
      })
      .eq('id', appointment_id);

    // Log final activation
    await supabaseAdmin.from('officer_activation_timeline').insert({
      appointment_id,
      event_type: 'OFFICER_ACTIVATED',
      event_description: 'Officer activation workflow completed successfully',
      metadata: { activation_date: new Date().toISOString() },
    });

    // Create governance log entry
    await supabaseAdmin.from('governance_logs').insert({
      action: 'OFFICER_ACTIVATED',
      actor_id: null, // System action
      entity_type: 'APPOINTMENT',
      entity_id: appointment_id,
      description: `Executive ${appointment.proposed_officer_name} activated as ${appointment.proposed_title}`,
      data: {
        officer_name: appointment.proposed_officer_name,
        title: appointment.proposed_title,
        activation_date: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Officer activated successfully',
        activation_date: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Activation error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Activation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

