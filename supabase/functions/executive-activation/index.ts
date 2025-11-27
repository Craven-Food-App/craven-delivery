import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivationRequest {
  appointmentId: string;
  userId: string;
  activationDetails: {
    erpAccess: boolean;
    payrollEnrolled: boolean;
    bankingAuthority: boolean;
    corporateCard: boolean;
    adminPortalAccess: boolean;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ActivationRequest = await req.json();
    const { appointmentId, userId, activationDetails } = body;

    if (!appointmentId || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify ALL gates are completed
    const { data: gates, error: gatesError } = await supabase
      .from('appointment_workflow_gates')
      .select('status')
      .eq('appointment_id', appointmentId);

    if (gatesError) {
      throw gatesError;
    }

    const incompleteGates = gates?.filter(g => g.status !== 'completed') || [];
    if (incompleteGates.length > 0) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Cannot activate: not all gates are completed',
          incompleteGates: incompleteGates.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('executive_appointments')
      .select(`
        id,
        appointee_user_id,
        role_titles,
        user_profiles!executive_appointments_appointee_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Appointment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 3. Grant system permissions
    // Add executive to exec_users if not already present
    const { error: execUserError } = await supabase
      .from('exec_users')
      .upsert({
        user_id: appointment.appointee_user_id,
        role: appointment.role_titles[0]?.toLowerCase() || 'executive',
        access_level: 1,
        approved_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (execUserError) {
      console.error('Error granting exec access:', execUserError);
    }

    // 4. Update appointment status to fully active
    const { error: updateError } = await supabase
      .from('executive_appointments')
      .update({ status: 'fully_appointed_active' })
      .eq('id', appointmentId);

    if (updateError) {
      throw updateError;
    }

    // 5. Log activation in audit log
    await supabase.from('appointment_audit_log').insert({
      appointment_id: appointmentId,
      action_type: 'executive_activated',
      actor_user_id: userId,
      department: 'IT Security + Finance + Risk',
      metadata_json: {
        activation_details: activationDetails,
        activated_at: new Date().toISOString(),
        executive_name: appointment.user_profiles?.full_name,
        executive_role: appointment.role_titles.join(', '),
      },
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Executive activated successfully',
        executiveName: appointment.user_profiles?.full_name,
        executiveRole: appointment.role_titles.join(', '),
        activationDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error activating executive:', error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});