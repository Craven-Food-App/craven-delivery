import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectDocumentRequest {
  appointmentId: string;
  gateNumber: number;
  rejectionReason: string;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RejectDocumentRequest = await req.json();
    const { appointmentId, gateNumber, rejectionReason, userId } = body;

    if (!appointmentId || !gateNumber || !rejectionReason) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find the gate
    const { data: gate, error: gateError } = await supabase
      .from('appointment_workflow_gates')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('gate_number', gateNumber)
      .single();

    if (gateError || !gate) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Gate not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Mark gate as rejected
    const { error: updateGateError } = await supabase
      .from('appointment_workflow_gates')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
      })
      .eq('id', gate.id);

    if (updateGateError) {
      throw updateGateError;
    }

    // 3. Mark appointment as rejected (workflow halt)
    const { error: updateAppointmentError } = await supabase
      .from('executive_appointments')
      .update({ status: 'rejected' })
      .eq('id', appointmentId);

    if (updateAppointmentError) {
      throw updateAppointmentError;
    }

    // 4. Log the rejection in audit log
    await supabase.from('appointment_audit_log').insert({
      appointment_id: appointmentId,
      action_type: 'document_rejected',
      actor_user_id: userId,
      department: gate.department_owner,
      metadata_json: {
        gate_number: gateNumber,
        gate_name: gate.gate_name,
        rejection_reason: rejectionReason,
      },
    });

    // 5. Get appointee info for notification
    const { data: appointment } = await supabase
      .from('executive_appointments')
      .select(`
        appointee_user_id,
        user_profiles!executive_appointments_appointee_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', appointmentId)
      .single();

    const profile = Array.isArray(appointment?.user_profiles) ? appointment.user_profiles[0] : appointment?.user_profiles;
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Document rejected and workflow halted',
        appointeeName: profile?.full_name,
        appointeeEmail: profile?.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error rejecting document:', error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});