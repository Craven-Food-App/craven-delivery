import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const appointment_id = body.appointment_id || body.appointmentId;

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get appointment details
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (fetchError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (appointment.status !== 'DRAFT') {
      return new Response(
        JSON.stringify({ error: 'Appointment is not in DRAFT status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique resolution number
    const year = new Date().getFullYear();
    const { count } = await supabaseAdmin
      .from('governance_board_resolutions')
      .select('*', { count: 'exact', head: true })
      .like('resolution_number', `${year}-%`);
    
    const resolutionNumber = `${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Create board resolution for this appointment
    const { data: resolution, error: resolutionError } = await supabaseAdmin
      .from('governance_board_resolutions')
      .insert({
        resolution_number: resolutionNumber,
        title: `Appointment of ${appointment.proposed_officer_name} as ${appointment.proposed_title}`,
        description: `Resolution to approve the appointment of ${appointment.proposed_officer_name} as ${appointment.proposed_title}. ${appointment.notes || ''}`,
        type: 'EXECUTIVE_APPOINTMENT',
        status: 'PENDING_VOTE',
        meeting_date: appointment.board_meeting_date || new Date().toISOString().split('T')[0],
        created_by: user.id,
        metadata: {
          appointment_id: appointment.id,
          proposed_officer_name: appointment.proposed_officer_name,
          proposed_officer_email: appointment.proposed_officer_email,
          proposed_title: appointment.proposed_title,
        },
      })
      .select()
      .single();

    if (resolutionError) {
      console.error('Error creating resolution:', resolutionError);
      return new Response(
        JSON.stringify({ error: resolutionError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update appointment status
    const { error: updateError } = await supabaseAdmin
      .from('executive_appointments')
      .update({ status: 'SENT_TO_BOARD', board_resolution_id: resolution.id })
      .eq('id', appointment_id);

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin.from('governance_logs').insert({
      action: 'SEND_APPOINTMENT_TO_BOARD',
      entity_type: 'executive_appointment',
      entity_id: appointment_id,
      description: `Sent appointment for ${appointment.proposed_officer_name} to board for voting`,
      actor_id: user.id,
      data: {
        resolution_id: resolution.id,
      },
    });

    // Generate board resolution document (async, don't wait)
    try {
      const generateDocUrl = `${supabaseUrl}/functions/v1/governance-generate-appointment-document`;
      fetch(generateDocUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          appointment_id: appointment_id,
          document_type: 'board_resolution',
        }),
      }).catch(err => console.error('Error generating board resolution:', err));
    } catch (err) {
      console.error('Error calling document generation:', err);
      // Don't fail the request if document generation fails
    }

    return new Response(
      JSON.stringify({ success: true, data: { appointment, resolution } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-send-appointment-to-board:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

