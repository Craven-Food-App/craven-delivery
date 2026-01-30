import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

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

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('executive_appointments')
      .select('id, status, board_resolution_id')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check resolution status
    let resolutionStatus = null;
    if (appointment.board_resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('status')
        .eq('id', appointment.board_resolution_id)
        .maybeSingle();
      resolutionStatus = resolution?.status;
    }

    // Check document signing status
    const { data: documents } = await supabaseAdmin
      .from('executive_documents')
      .select('signature_status')
      .eq('appointment_id', appointment_id);

    const totalDocs = documents?.length || 0;
    const signedDocs = documents?.filter(d => d.signature_status === 'signed').length || 0;
    const allSigned = totalDocs > 0 && signedDocs === totalDocs;
    const someSigned = signedDocs > 0;

    // Determine target status based on resolution and document status
    let targetStatus = appointment.status;
    const statusOrder = ['draft', 'selected', 'pending_comp_approval', 'ready_for_board_authorization', 'authorized_to_offer', 'pending_employment_agreement', 'pending_ip_confidentiality', 'pending_personal_governance', 'pending_fiduciary_binding', 'pending_conflict_clearance', 'pending_indemnification', 'pending_equity_authorization', 'shareholder_active', 'plan_active', 'equity_vesting_active', 'compensation_live', 'fully_appointed_active', 'rejected'];
    const currentIndex = statusOrder.indexOf(appointment.status);

    // If resolution is ADOPTED or EXECUTED, appointment should be authorized to offer
    if (resolutionStatus === 'ADOPTED' || resolutionStatus === 'EXECUTED') {
      // Once board adopts/executes resolution, appointment is authorized to offer
      targetStatus = 'authorized_to_offer';
    } else if (resolutionStatus === 'PENDING_VOTE' || resolutionStatus === 'REJECTED') {
      // Don't advance if resolution not adopted
      targetStatus = appointment.status;
    }

    // Only update if target status is ahead of current
    const targetIndex = statusOrder.indexOf(targetStatus);
    console.log('Status comparison:', { currentStatus: appointment.status, currentIndex, targetStatus, targetIndex });
    
    if (targetIndex > currentIndex || currentIndex === -1) {
      const { error: updateError } = await supabaseAdmin
        .from('executive_appointments')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to update status: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Appointment status updated from ${appointment.status} to ${targetStatus}`,
          appointment_id,
          previous_status: appointment.status,
          new_status: targetStatus,
          resolution_status: resolutionStatus,
          documents: {
            total: totalDocs,
            signed: signedDocs,
            all_signed: allSigned,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Appointment status is already at or beyond target. Current: ${appointment.status}, Target: ${targetStatus}`,
          appointment_id,
          current_status: appointment.status,
          target_status: targetStatus,
          resolution_status: resolutionStatus,
          documents: {
            total: totalDocs,
            signed: signedDocs,
            all_signed: allSigned,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in governance-update-appointment-status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

