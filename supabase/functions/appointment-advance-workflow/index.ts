import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdvanceWorkflowRequest {
  appointmentId: string;
  gateNumber: number;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AdvanceWorkflowRequest = await req.json();
    const { appointmentId, gateNumber, userId } = body;

    if (!appointmentId || !gateNumber) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if all blocking gates are completed
    const { data: currentGate, error: gateError } = await supabase
      .from('appointment_workflow_gates')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('gate_number', gateNumber)
      .single();

    if (gateError || !currentGate) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Gate not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if gate is already completed
    if (currentGate.status === 'completed') {
      return new Response(
        JSON.stringify({ ok: true, message: 'Gate already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Mark gate as completed
    const { error: updateError } = await supabase
      .from('appointment_workflow_gates')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
      })
      .eq('id', currentGate.id);

    if (updateError) {
      throw updateError;
    }

    // 3. Check if we should advance appointment status
    const { data: allGates } = await supabase
      .from('appointment_workflow_gates')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('gate_number', { ascending: true });

    // Determine next status based on completed gates
    let newStatus = 'draft';
    const completedGates = (allGates || []).filter(g => g.status === 'completed').length;

    if (completedGates >= 2) newStatus = 'ready_for_board_authorization';
    if (completedGates >= 6) newStatus = 'authorized_to_offer';
    if (completedGates >= 9) newStatus = 'pending_personal_governance';
    if (completedGates >= 12) newStatus = 'pending_indemnification';
    if (completedGates >= 13) newStatus = 'pending_equity_authorization';
    if (completedGates >= 15) newStatus = 'shareholder_active';
    if (completedGates >= 19) newStatus = 'compensation_live';
    if (completedGates === (allGates || []).length) newStatus = 'fully_appointed_active';

    // Update appointment status
    const { error: statusError } = await supabase
      .from('executive_appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (statusError) {
      console.error('Error updating appointment status:', statusError);
    }

    // 4. Log the advancement in audit log
    await supabase.from('appointment_audit_log').insert({
      appointment_id: appointmentId,
      action_type: 'gate_completed',
      actor_user_id: userId,
      department: currentGate.department_owner,
      metadata_json: {
        gate_number: gateNumber,
        gate_name: currentGate.gate_name,
        new_status: newStatus,
      },
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Workflow advanced successfully',
        newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error advancing workflow:', error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});