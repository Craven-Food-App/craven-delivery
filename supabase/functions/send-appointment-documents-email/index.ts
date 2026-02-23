import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SendAppointmentDocumentsEmailRequest {
  appointmentId: string;
  documentIds?: string[]; // Optional: specific document IDs to include
  temporaryPassword?: string; // Optional: temporary password if user was just created
  userCreated?: boolean; // Optional: whether user was just created
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, documentIds, temporaryPassword, userCreated }: SendAppointmentDocumentsEmailRequest = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing appointmentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get appointment details - try executive_appointments first (new system)
    let execAppointment: any = null;
    let appointment: any = null;
    
    const { data: execApptData, error: execApptError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    if (execApptError) {
      console.error('Error fetching from executive_appointments:', execApptError);
    } else if (execApptData) {
      execAppointment = execApptData;
      console.log(`Found appointment in executive_appointments: ${appointmentId}`);
    } else {
      // Try old appointments table as fallback
      const { data: apptData, error: apptError } = await supabaseAdmin
        .from('appointments')
        .select('*, appointee_user_id')
        .eq('id', appointmentId)
        .maybeSingle();

      if (apptError) {
        console.error('Error fetching from appointments:', apptError);
      } else if (apptData) {
        appointment = apptData;
        console.log(`Found appointment in appointments table: ${appointmentId}`);
      }
    }

    if (!execAppointment && !appointment) {
      return new Response(
        JSON.stringify({ 
          error: 'Appointment not found',
          details: `No appointment found with ID: ${appointmentId}`,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle executive_appointments (new system)
    if (execAppointment) {

      // Use executive_appointments data
      const appointeeEmail = execAppointment.proposed_officer_email;
      const appointeeName = execAppointment.proposed_officer_name;

      if (!appointeeEmail) {
        return new Response(
          JSON.stringify({ error: 'Appointee email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get documents for this appointment - try board_documents first, then executive_documents
      let documents: any[] = [];
      
      if (documentIds && documentIds.length > 0) {
        const { data: docs } = await supabaseAdmin
          .from('board_documents')
          .select('id, title, type, pdf_url, html_template')
          .in('id', documentIds)
          .eq('signing_status', 'pending');
        documents = docs || [];
      } else {
        // Get all pending documents for this appointment from board_documents
        const { data: docs } = await supabaseAdmin
          .from('board_documents')
          .select('id, title, type, pdf_url, html_template')
          .eq('related_appointment_id', appointmentId)
          .eq('signing_status', 'pending');
        documents = docs || [];
      }

      // If no documents in board_documents, try executive_documents
      if (documents.length === 0) {
        console.log(`No documents found in board_documents for appointment ${appointmentId}, checking executive_documents...`);
        
        const { data: execDocs } = await supabaseAdmin
          .from('executive_documents')
          .select('id, type, file_url, signature_status')
          .eq('appointment_id', appointmentId)
          .in('signature_status', ['pending', 'sent']);

        if (execDocs && execDocs.length > 0) {
          // Map executive_documents to the format expected by the email function
          const documentTypeNames: Record<string, string> = {
            'pre_incorporation_consent': 'Pre-Incorporation Consent',
            'certificate_of_incorporation': 'Certificate of Incorporation',
            'bylaws': 'Bylaws of Crave\'N Inc.',
            'bylaws_acknowledgment': 'Bylaws Acknowledgment & Consent',
            'board_resolution': 'Board Resolution (Appointment)',
            'appointment_letter': 'Appointment Letter',
            'employment_agreement': 'Employment Agreement',
            'confidentiality_ip': 'Confidentiality & IP Assignment Agreement',
            'fiduciary_duty_ethics': 'Fiduciary Duty & Ethics Acknowledgment',
            'conflict_of_interest': 'Conflict of Interest Disclosure',
            'officer_indemnification': 'Officer Indemnification Agreement',
            'stock_subscription': 'Stock Subscription Agreement',
            'equity_incentive_plan': 'Equity Incentive Plan',
            'option_rsu_award': 'Option/RSU Award Agreement',
            'deferred_compensation': 'Deferred Compensation Agreement',
            'certificate': 'Stock Certificate',
          };

          documents = execDocs.map(doc => ({
            id: doc.id,
            title: documentTypeNames[doc.type] || doc.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            type: doc.type,
            pdf_url: doc.file_url,
            file_url: doc.file_url,
          }));

          console.log(`Found ${documents.length} documents in executive_documents for appointment ${appointmentId}`);
        }
      }

      if (documents.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No documents found for this appointment in board_documents or executive_documents' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get signature token from first document
      const { data: execDoc } = await supabaseAdmin
        .from('executive_documents')
        .select('signature_token')
        .eq('appointment_id', appointmentId)
        .not('signature_token', 'is', null)
        .limit(1)
        .maybeSingle();

      const signatureToken = execDoc?.signature_token || null;

      // Build document list for email (handle both board_documents and executive_documents formats)
      const documentList = documents.map(doc => ({
        title: doc.title,
        url: doc.pdf_url || doc.file_url || '',
        id: doc.id,
      }));

      // Send email directly using Resend (avoiding JWT validation issues with function-to-function calls)
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'n HR <hr@craven.com>";
      const companyWebsiteUrl = Deno.env.get('COMPANY_WEBSITE_URL') || 'https://cravenusa.com';
      
      // Build email content
      const documentTitle = `${documents.length} Document${documents.length > 1 ? 's' : ''} Ready for Signature`;
      const documentLinks = documentList.map(doc => 
        `<li style="margin: 6px 0; color: #4a4a4a;">${doc.title}</li>`
      ).join('');
      
      // Build login credentials section if user was just created
      let loginCredentialsHtml = '';
      if (userCreated && temporaryPassword) {
        loginCredentialsHtml = `
<div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0; border-radius: 6px;">
  <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px;">🔐 Your Account Has Been Created</h3>
  <p style="margin: 0 0 15px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
    Your executive portal account has been set up. Use these credentials to log in:
  </p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; margin: 15px 0;">
    <p style="margin: 5px 0; color: #1a1a1a; font-size: 14px;"><strong>Email:</strong> ${appointeeEmail}</p>
    <p style="margin: 5px 0; color: #1a1a1a; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${temporaryPassword}</code></p>
  </div>
  <p style="margin: 15px 0 0 0; color: #ff6b00; font-size: 14px; font-weight: bold;">
    ⚠️ Important: Please change your password after your first login for security.
  </p>
</div>`;
      }
      
      const portalUrl = signatureToken 
        ? `${companyWebsiteUrl}/executive/sign?token=${signatureToken}`
        : `${companyWebsiteUrl}/executive/sign`;
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ff7a45 0%, #ff8c00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 28px;">Executive Appointment Documents</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1a1a1a; font-size: 24px;">Hello ${appointeeName},</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Your executive appointment documents are ready for review and signature. Please use the button below to access the secure signing portal where you can review and sign all documents.
      </p>
      ${loginCredentialsHtml}
      <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">Documents Awaiting Your Signature</h3>
        <ul style="margin: 0; padding-left: 18px; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          ${documentLinks}
        </ul>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 13px; font-style: italic;">
          All documents are accessible through the signing portal below.
        </p>
      </div>
      <div style="text-align: center; margin: 40px 0 30px 0;">
        <a href="${portalUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #ff7a45 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 122, 69, 0.3);">
          Access Signing Portal
        </a>
      </div>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">
        If you have any questions, please contact executive@cravenusa.com
      </p>
    </div>
  </div>
</body>
</html>`;

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [appointeeEmail],
        subject: documentTitle,
        html: emailHtml,
      });

      if (emailResult.error) {
        throw new Error(`Failed to send email: ${emailResult.error.message || JSON.stringify(emailResult.error)}`);
      }

      console.log(`Email sent successfully to ${appointeeEmail}, Resend ID: ${emailResult.data?.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully',
          documentsCount: documents.length,
          recipient: appointeeEmail,
          emailId: emailResult.data?.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle appointments table (governance system)
    const appointeeUserId = appointment.appointee_user_id;

    // Get appointee email from auth.users
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(appointeeUserId);
    
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Appointee email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appointee name
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', appointeeUserId)
      .maybeSingle();

    const appointeeName = profile?.full_name || user.email?.split('@')[0] || 'Appointee';

    // Get documents for this appointment
    let documents: any[] = [];
    
    if (documentIds && documentIds.length > 0) {
      const { data: docs } = await supabaseAdmin
        .from('board_documents')
        .select('id, title, type, pdf_url, html_template')
        .in('id', documentIds)
        .eq('signing_status', 'pending');
      documents = docs || [];
    } else {
      // Get all pending documents linked to this appointment
      const { data: appointmentDocs } = await supabaseAdmin
        .from('appointment_documents')
        .select('governance_document_id, board_documents(*)')
        .eq('appointment_id', appointmentId);

      if (appointmentDocs) {
        documents = appointmentDocs
          .map(ad => ad.board_documents)
          .filter((doc: any) => doc && doc.signing_status === 'pending')
          .map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            type: doc.type,
            pdf_url: doc.pdf_url,
            html_template: doc.html_template,
          }));
      }
    }

    if (documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents found for this appointment' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature token from board_documents
    const firstDoc = documents[0];
    const signatureToken = firstDoc.signature_token || null;

    // Build document list for email
    const documentList = documents.map(doc => ({
      title: doc.title,
      url: doc.pdf_url || '',
      id: doc.id,
    }));

    // Call the existing send-executive-document-email function
    // For internal function-to-function calls, use service role key in both Authorization and apikey headers
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-executive-document-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        executiveName: appointeeName,
        documentTitle: `${documents.length} Document${documents.length > 1 ? 's' : ''} Ready for Signature`,
        documents: documentList,
        executiveId: null,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        documentsCount: documents.length,
        recipient: user.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error sending appointment documents email:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        details: error.details || error.hint || '',
        code: error.code || '',
        name: error.name || 'Error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

