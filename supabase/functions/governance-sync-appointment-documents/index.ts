import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const appointment_id = body.appointment_id;
    const user_email = body.user_email;

    let appointment: any = null;

    // If appointment_id provided, use it
    if (appointment_id) {
      const { data: appt, error: appointmentError } = await supabaseAdmin
        .from('executive_appointments')
        .select('*')
        .eq('id', appointment_id)
        .single();

      if (appointmentError || !appt) {
        return new Response(
          JSON.stringify({ error: 'Appointment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      appointment = appt;
    } 
    // If user_email provided, find appointment by email
    else if (user_email) {
      const { data: appointments, error: appointmentsError } = await supabaseAdmin
        .from('executive_appointments')
        .select('*')
        .ilike('proposed_officer_email', user_email)
        .in('status', ['APPROVED', 'SENT_TO_BOARD', 'ACTIVE', 'DRAFT', 'AWAITING_SIGNATURES', 'READY_FOR_SECRETARY_REVIEW', 'BOARD_ADOPTED'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (appointmentsError || !appointments || appointments.length === 0) {
        return new Response(
          JSON.stringify({ error: `No appointments found for email: ${user_email}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      appointment = appointments[0];
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id or user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointment_id_to_use = appointment.id;

    // Find executive user by email with improved logging
    let executiveId: string | null = null;
    if (appointment.proposed_officer_email) {
      console.log('[EXEC LOOKUP] Searching for executive with email:', appointment.proposed_officer_email);
      
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.find(u => u.email?.toLowerCase() === appointment.proposed_officer_email.toLowerCase());
      
      if (user) {
        console.log('[EXEC LOOKUP] Found auth user:', user.id, user.email);
        
        const { data: execUser, error: execUserError } = await supabaseAdmin
          .from('exec_users')
          .select('id, role, full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (execUserError) {
          console.error('[EXEC LOOKUP] Error querying exec_users:', execUserError);
        }
        
        if (execUser) {
          executiveId = execUser.id;
          console.log('[EXEC LOOKUP] Found exec_user:', {
            id: execUser.id,
            role: execUser.role,
            name: execUser.full_name
          });
        } else {
          console.warn('[EXEC LOOKUP] No exec_users record found for user_id:', user.id);
        }
      } else {
        console.warn('[EXEC LOOKUP] No auth user found with email:', appointment.proposed_officer_email);
      }
    }
    
    console.log('[EXEC LOOKUP] Final executiveId:', executiveId || 'NULL');

    // Document mapping - All 14 required documents per Fortune 500 Executive Appointment Workflow
    const documentFields = [
      { field: 'pre_incorporation_consent_url', type: 'pre_incorporation_consent' },
      { field: 'certificate_of_incorporation_url', type: 'certificate_of_incorporation' },
      { field: 'bylaws_url', type: 'company_bylaws' },
      { field: 'bylaws_acknowledgment_url', type: 'bylaws_acknowledgment' },
      { field: 'board_resolution_url', type: 'board_resolution' },
      { field: 'appointment_letter_url', type: 'appointment_letter' },
      { field: 'employment_agreement_url', type: 'employment_agreement' },
      { field: 'confidentiality_ip_url', type: 'confidentiality_ip' },
      { field: 'fiduciary_ethics_url', type: 'fiduciary_duty_ethics' },
      { field: 'conflict_disclosure_url', type: 'conflict_of_interest' },
      { field: 'stock_subscription_url', type: 'stock_subscription' },
      { field: 'equity_plan_url', type: 'equity_incentive_plan' },
      { field: 'option_rsu_award_url', type: 'option_rsu_award' },
      { field: 'deferred_compensation_url', type: 'deferred_compensation' },
      { field: 'officer_indemnification_url', type: 'officer_indemnification' },
    ];

    const syncedDocs: any[] = [];
    const errors: any[] = [];

    for (const { field, type } of documentFields) {
      const docUrl = appointment[field];
      if (!docUrl) continue;

      // Check if document already exists
      const { data: existingDoc } = await supabaseAdmin
        .from('executive_documents')
        .select('id, signature_token, signature_status, signed_file_url, file_url')
        .eq('appointment_id', appointment_id_to_use)
        .eq('type', type)
        .maybeSingle();

      if (existingDoc) {
        // Update existing document and generate token if missing
        const needsToken = !existingDoc.signature_token;
        const updateData: any = {
          file_url: docUrl,
        };

        if (type === 'equity_incentive_plan' && (existingDoc.signature_status === 'signed' || !!existingDoc.signed_file_url)) {
          updateData.signed_file_url = docUrl;
        }
        
        if (needsToken) {
          updateData.signature_token = crypto.randomUUID();
          updateData.signature_token_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        
        const { error: updateError } = await supabaseAdmin
          .from('executive_documents')
          .update(updateData)
          .eq('id', existingDoc.id);

        if (updateError) {
          errors.push({ type, error: updateError.message });
        } else {
          syncedDocs.push({ type, action: 'updated', token_generated: needsToken });
        }
      } else {
        // Create new document with signature token
        const signatureToken = crypto.randomUUID();
        const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        const { error: insertError } = await supabaseAdmin
          .from('executive_documents')
          .insert({
            type,
            officer_name: appointment.proposed_officer_name,
            role: appointment.proposed_title,
            executive_id: executiveId,
            file_url: docUrl,
            appointment_id: appointment_id_to_use,
            signature_status: 'pending',
            status: 'generated',
            signature_token: signatureToken,
            signature_token_expires_at: tokenExpiresAt.toISOString(),
          });

        if (insertError) {
          errors.push({ type, error: insertError.message });
        } else {
          syncedDocs.push({ type, action: 'created', signature_token: signatureToken });
        }
      }
    }

    // Update appointment status if resolution is ADOPTED and documents are synced
    if (syncedDocs.length > 0 && appointment.board_resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('status')
        .eq('id', appointment.board_resolution_id)
        .maybeSingle();

      if (resolution?.status === 'ADOPTED') {
        // Check if all documents are signed
        const { data: documents } = await supabaseAdmin
          .from('executive_documents')
          .select('signature_status')
          .eq('appointment_id', appointment_id_to_use);

        const allSigned = documents && documents.length > 0 && documents.every(d => d.signature_status === 'signed');
        const someSigned = documents && documents.some(d => d.signature_status === 'signed');

        let targetStatus = appointment.status;
        if (allSigned) {
          targetStatus = 'READY_FOR_SECRETARY_REVIEW';
        } else if (someSigned) {
          targetStatus = 'AWAITING_SIGNATURES';
        } else {
          targetStatus = 'BOARD_ADOPTED';
        }

        // Only update if status should change
        const statusOrder = ['DRAFT', 'SENT_TO_BOARD', 'BOARD_ADOPTED', 'AWAITING_SIGNATURES', 'READY_FOR_SECRETARY_REVIEW', 'SECRETARY_APPROVED', 'ACTIVATING', 'ACTIVE'];
        const currentIndex = statusOrder.indexOf(appointment.status);
        const targetIndex = statusOrder.indexOf(targetStatus);

        if (targetIndex > currentIndex) {
          await supabaseAdmin
            .from('executive_appointments')
            .update({
              status: targetStatus,
            })
            .eq('id', appointment_id_to_use);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment_id_to_use,
        documents_synced: syncedDocs.length,
        documents: syncedDocs,
        errors: errors.length > 0 ? errors : undefined,
        executive_id: executiveId,
        user_email: user_email || appointment.proposed_officer_email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-sync-appointment-documents:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
