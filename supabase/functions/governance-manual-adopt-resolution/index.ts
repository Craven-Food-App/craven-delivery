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

    // Check if user has permission (Corporate Secretary, Founder, or CEO)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_FOUNDER', 'CRAVEN_CEO']);

    const { data: execUser } = await supabase
      .from('exec_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ceo')
      .single();

    const hasPermission = 
      (userRoles && userRoles.length > 0) || 
      execUser || 
      user.email === 'craven@usa.com';

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Only Corporate Secretary, Founder, or CEO can manually adopt resolutions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const resolution_id = body.resolution_id || body.resolutionId;
    const action = body.action || 'ADOPT'; // ADOPT or REJECT

    if (!resolution_id) {
      return new Response(
        JSON.stringify({ error: 'Missing resolution_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get resolution
    const { data: resolution, error: resolutionError } = await supabaseAdmin
      .from('governance_board_resolutions')
      .select('*')
      .eq('id', resolution_id)
      .single();

    if (resolutionError || !resolution) {
      return new Response(
        JSON.stringify({ error: 'Resolution not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = action === 'ADOPT' ? 'ADOPTED' : 'REJECTED';

    // Update resolution status
    const { data: updatedResolution, error: updateError } = await supabaseAdmin
      .from('governance_board_resolutions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolution_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating resolution:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin.from('governance_logs').insert({
      action: `RESOLUTION_MANUALLY_${newStatus}`,
      entity_type: 'board_resolution',
      entity_id: resolution_id,
      description: `Resolution manually ${newStatus.toLowerCase()} by ${user.email}`,
      actor_id: user.id,
      data: {
        action: action,
        manual: true,
      },
    });

    // If this is an appointment resolution and it was adopted, finalize the appointment
    if (newStatus === 'ADOPTED' && resolution.type === 'EXECUTIVE_APPOINTMENT' && resolution.metadata?.appointment_id) {
      const appointmentId = resolution.metadata.appointment_id;

      // Update appointment status to APPROVED
      await supabaseAdmin
        .from('executive_appointments')
        .update({
          status: 'APPROVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      // Create corporate officer record if appointment is approved
      const { data: appointment } = await supabaseAdmin
        .from('executive_appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointment) {
        // Check if officer already exists
        const { data: existingOfficer } = await supabaseAdmin
          .from('corporate_officers')
          .select('id')
          .eq('email', appointment.proposed_officer_email)
          .eq('status', 'ACTIVE')
          .single();

        if (!existingOfficer && appointment.proposed_officer_email) {
          // Calculate term end date if term_length_months is provided
          let termEnd = null;
          if (appointment.term_length_months && appointment.effective_date) {
            const effectiveDate = new Date(appointment.effective_date);
            effectiveDate.setMonth(effectiveDate.getMonth() + appointment.term_length_months);
            termEnd = effectiveDate.toISOString().split('T')[0];
          }

          // Create corporate officer record
          await supabaseAdmin.from('corporate_officers').insert({
            full_name: appointment.proposed_officer_name,
            email: appointment.proposed_officer_email,
            title: appointment.proposed_title,
            appointed_by: resolution_id,
            effective_date: appointment.effective_date,
            term_end: termEnd,
            status: 'ACTIVE',
            metadata: {
              appointment_id: appointmentId,
              appointment_type: appointment.appointment_type,
              authority_granted: appointment.authority_granted,
              compensation_structure: appointment.compensation_structure,
              equity_included: appointment.equity_included,
              equity_details: appointment.equity_details,
            },
          });

          // Log officer creation
          await supabaseAdmin.from('governance_logs').insert({
            action: 'OFFICER_APPOINTED',
            entity_type: 'corporate_officer',
            entity_id: appointmentId,
            description: `Corporate officer ${appointment.proposed_officer_name} appointed as ${appointment.proposed_title}`,
            data: {
              resolution_id: resolution_id,
              appointment_id: appointmentId,
            },
          });

          // Generate final documents (certificate and employment agreement)
          try {
            const generateDocUrl = `${supabaseUrl}/functions/v1/governance-generate-appointment-document`;
            
            // Generate certificate
            fetch(generateDocUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                appointment_id: appointmentId,
                document_type: 'certificate',
              }),
            }).catch(err => console.error('Error generating certificate:', err));

            // Generate employment agreement
            fetch(generateDocUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                appointment_id: appointmentId,
                document_type: 'employment_agreement',
              }),
            }).catch(err => console.error('Error generating employment agreement:', err));
          } catch (err) {
            console.error('Error calling document generation:', err);
            // Don't fail the request if document generation fails
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Resolution manually ${newStatus.toLowerCase()}`,
        resolution: updatedResolution,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-manual-adopt-resolution:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

