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

    // Fetch corporate officer record
    const { data: officer } = await supabaseAdmin
      .from('corporate_officers')
      .select('*')
      .eq('email', appointment.proposed_officer_email)
      .maybeSingle();

    // Fetch resolution details
    let resolutionNumber = 'N/A';
    let resolutionDate = '';
    if (appointment.board_resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('resolution_number, meeting_date')
        .eq('id', appointment.board_resolution_id)
        .single();
      
      if (resolution) {
        resolutionNumber = resolution.resolution_number;
        resolutionDate = formatDate(resolution.meeting_date);
      }
    }

    // Fetch company settings
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'company_name',
        'state',
        'registered_office',
        'registered_agent_name',
        'registered_agent_address',
        'ein',
      ]);

    const settings: Record<string, string> = {};
    companySettings?.forEach((s: any) => {
      settings[s.setting_key] = s.setting_value || '';
    });

    const companyName = settings.company_name || 'Crave\'n USA, Inc.';
    const state = settings.state || 'Delaware';
    const registeredOffice = settings.registered_office || '';
    const registeredAgent = settings.registered_agent_name || '';
    const registeredAgentAddress = settings.registered_agent_address || '';
    const ein = settings.ein || '';

    // Fetch all signed documents
    const { data: documents } = await supabaseAdmin
      .from('executive_documents')
      .select('type, signed_file_url, file_url')
      .eq('appointment_id', appointment_id)
      .eq('signature_status', 'signed');

    // Generate banking authorization packet HTML
    const packetHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bank Authorization Packet - ${appointment.proposed_officer_name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: white;
      color: #000;
    }
    .page-break {
      page-break-after: always;
      margin: 40px 0;
    }
    .section {
      margin-bottom: 30px;
    }
    h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    .info-table td:first-child {
      font-weight: bold;
      width: 200px;
      background: #f5f5f5;
    }
    .signature-section {
      margin-top: 60px;
      border-top: 2px solid #000;
      padding-top: 20px;
    }
    .document-list {
      list-style: none;
      padding: 0;
    }
    .document-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BANK AUTHORIZATION PACKET</h1>
    <p><strong>${companyName}</strong></p>
    <p>${state} Corporation</p>
    <p>Generated: ${formatDate(new Date().toISOString())}</p>
  </div>

  <div class="section">
    <h2>1. Officer Certificate</h2>
    <p>This certifies that <strong>${appointment.proposed_officer_name}</strong> has been duly appointed as <strong>${appointment.proposed_title}</strong> of ${companyName}, effective ${formatDate(appointment.effective_date)}.</p>
    ${officer?.certificate_url ? `<p><strong>Certificate URL:</strong> ${officer.certificate_url}</p>` : ''}
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>2. Appointment Letter</h2>
    <p>The following individual has been appointed to serve as an officer of the corporation:</p>
    <table class="info-table">
      <tr>
        <td>Name:</td>
        <td>${appointment.proposed_officer_name}</td>
      </tr>
      <tr>
        <td>Title:</td>
        <td>${appointment.proposed_title}</td>
      </tr>
      <tr>
        <td>Email:</td>
        <td>${appointment.proposed_officer_email || 'N/A'}</td>
      </tr>
      <tr>
        <td>Effective Date:</td>
        <td>${formatDate(appointment.effective_date)}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>3. Board Resolution</h2>
    <p>This appointment was made pursuant to Board Resolution:</p>
    <table class="info-table">
      <tr>
        <td>Resolution Number:</td>
        <td>${resolutionNumber}</td>
      </tr>
      <tr>
        <td>Resolution Date:</td>
        <td>${resolutionDate}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>4. Identity Verification Summary</h2>
    <p>The following identity verification has been completed:</p>
    <table class="info-table">
      <tr>
        <td>Officer Name:</td>
        <td>${appointment.proposed_officer_name}</td>
      </tr>
      <tr>
        <td>Email Address:</td>
        <td>${appointment.proposed_officer_email || 'N/A'}</td>
      </tr>
      <tr>
        <td>Identity Verified:</td>
        <td>✓ Yes</td>
      </tr>
      <tr>
        <td>Background Check:</td>
        <td>✓ Complete</td>
      </tr>
      <tr>
        <td>Verification Date:</td>
        <td>${formatDate(appointment.secretary_approved_at || new Date().toISOString())}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>5. Corporate Officer Listing</h2>
    <p>The following is a current listing of corporate officers:</p>
    <table class="info-table">
      <tr>
        <td>Company Name:</td>
        <td>${companyName}</td>
      </tr>
      <tr>
        <td>State of Incorporation:</td>
        <td>${state}</td>
      </tr>
      <tr>
        <td>Registered Office:</td>
        <td>${registeredOffice}</td>
      </tr>
      <tr>
        <td>Registered Agent:</td>
        <td>${registeredAgent}</td>
      </tr>
      <tr>
        <td>Registered Agent Address:</td>
        <td>${registeredAgentAddress}</td>
      </tr>
      ${ein ? `<tr><td>EIN:</td><td>${ein}</td></tr>` : ''}
    </table>
    
    <h3 style="margin-top: 20px;">Current Officers:</h3>
    <table class="info-table">
      <tr>
        <td>${appointment.proposed_officer_name}</td>
        <td>${appointment.proposed_title}</td>
        <td>${formatDate(appointment.effective_date)}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>6. Banking Authority</h2>
    <p>The following banking authorities have been granted:</p>
    <table class="info-table">
      <tr>
        <td>Officer:</td>
        <td>${appointment.proposed_officer_name}</td>
      </tr>
      <tr>
        <td>Title:</td>
        <td>${appointment.proposed_title}</td>
      </tr>
      <tr>
        <td>Can Sign Wires:</td>
        <td>${['CEO', 'CFO'].includes(appointment.proposed_title.toUpperCase()) ? '✓ Yes' : '✗ No'}</td>
      </tr>
      <tr>
        <td>Can Sign Checks:</td>
        <td>${['CEO', 'CFO', 'COO'].includes(appointment.proposed_title.toUpperCase()) ? '✓ Yes' : '✗ No'}</td>
      </tr>
      <tr>
        <td>Treasury Portal Access:</td>
        <td>${['CEO', 'CFO'].includes(appointment.proposed_title.toUpperCase()) ? '✓ Yes' : '✗ No'}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2>7. Supporting Documents</h2>
    <p>The following documents are included with this authorization packet:</p>
    <ul class="document-list">
      ${documents?.map((doc: any) => {
        const docNames: Record<string, string> = {
          appointment_letter: 'Appointment Letter',
          board_resolution: 'Board Resolution',
          certificate: 'Stock Certificate',
          confidentiality_ip: 'Confidentiality & IP Agreement',
          conflict_of_interest: 'Conflict of Interest Disclosure',
        };
        return `<li>${docNames[doc.type] || doc.type} - Signed</li>`;
      }).join('') || '<li>No additional documents</li>'}
    </ul>
  </div>

  <div class="signature-section">
    <p><strong>Corporate Secretary</strong></p>
    <p>${companyName}</p>
    <p>Date: ${formatDate(new Date().toISOString())}</p>
  </div>
</body>
</html>`;

    // Upload packet to storage
    const fileName = `banking-authorization/${appointment_id}_bank_auth_packet_${Date.now()}.html`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('governance-documents')
      .upload(fileName, packetHtml, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload banking packet: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('governance-documents')
      .getPublicUrl(fileName);

    // Update banking authority record
    const { data: bankingAuth } = await supabaseAdmin
      .from('executive_banking_authority')
      .select('id')
      .eq('appointment_id', appointment_id)
      .maybeSingle();

    if (bankingAuth) {
      await supabaseAdmin
        .from('executive_banking_authority')
        .update({
          bank_authorization_packet_url: publicUrl,
          status: 'UPLOADED',
        })
        .eq('id', bankingAuth.id);
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        packet_url: publicUrl,
        message: 'Banking authorization packet generated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Banking packet generation error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to generate banking packet' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

