import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate required fields
    const requiredFields = ['proposed_officer_name', 'proposed_title', 'effective_date'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create service role client for inserting
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Insert appointment
    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('executive_appointments')
      .insert({
        proposed_officer_name: body.proposed_officer_name,
        proposed_officer_email: body.proposed_officer_email || null,
        proposed_title: body.proposed_title,
        appointment_type: body.appointment_type || 'NEW',
        board_meeting_date: body.board_meeting_date || null,
        effective_date: body.effective_date,
        term_length_months: body.term_length_months ? parseInt(body.term_length_months) : null,
        authority_granted: body.authority_granted || null,
        compensation_structure: body.compensation_structure || null,
        equity_included: body.equity_included || false,
        equity_details: body.equity_details || null,
        notes: body.notes || null,
        formation_mode: body.formation_mode || false,
        status: 'DRAFT',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating appointment:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user for the appointee
    let appointeeUserId: string | null = null;
    if (body.proposed_officer_email) {
      // Try to find existing user by email
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const foundUser = existingUser?.users.find(u => u.email === body.proposed_officer_email);
      
      if (foundUser) {
        appointeeUserId = foundUser.id;
      } else {
        // Create new user for the appointee
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: body.proposed_officer_email,
          email_confirm: true,
          user_metadata: {
            full_name: body.proposed_officer_name,
          },
        });
        
        if (!createUserError && newUser?.user) {
          appointeeUserId = newUser.user.id;
          
          // Create user profile
          await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: newUser.user.id,
              full_name: body.proposed_officer_name,
              email: body.proposed_officer_email,
            }, {
              onConflict: 'user_id',
            });
        }
      }
    }

    // Create appointment in new appointments table (for governance system)
    let newAppointmentId: string | null = null;
    if (appointeeUserId) {
      const { data: newAppt, error: newApptError } = await supabaseAdmin
        .from('appointments')
        .insert({
          appointee_user_id: appointeeUserId,
          role_titles: [body.proposed_title],
          effective_date: body.effective_date,
          created_by: user.id,
        })
        .select()
        .single();

      if (!newApptError && newAppt) {
        newAppointmentId = newAppt.id;
      }
    }

    // Create board resolution for this appointment (as per user requirements)
    let boardResolutionId: string | null = null;
    try {
      const year = new Date().getFullYear();
      const { count } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('*', { count: 'exact', head: true })
        .like('resolution_number', `${year}-%`);
      
      const resolutionNumber = `${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: resolution, error: resolutionError } = await supabaseAdmin
        .from('governance_board_resolutions')
        .insert({
          resolution_number: resolutionNumber,
          title: `Appointment of ${body.proposed_officer_name} as ${body.proposed_title}`,
          description: `Resolution to approve the appointment of ${body.proposed_officer_name} as ${body.proposed_title}. ${body.notes || ''}`,
          type: 'EXECUTIVE_APPOINTMENT',
          status: 'PENDING_VOTE',
          meeting_date: body.board_meeting_date || body.effective_date || new Date().toISOString().split('T')[0],
          created_by: user.id,
          metadata: {
            appointment_id: appointment.id,
            proposed_officer_name: body.proposed_officer_name,
            proposed_officer_email: body.proposed_officer_email,
            proposed_title: body.proposed_title,
          },
        })
        .select()
        .single();

      if (resolutionError) {
        console.error('Error creating board resolution:', resolutionError);
        // Don't fail the appointment creation if resolution creation fails
      } else if (resolution) {
        boardResolutionId = resolution.id;
        console.log(`Created board resolution ${resolutionNumber} (${resolution.id}) for appointment ${appointment.id}`);
        
        // Link resolution to appointment
        await supabaseAdmin
          .from('executive_appointments')
          .update({ board_resolution_id: resolution.id })
          .eq('id', appointment.id);
      }
    } catch (err) {
      console.error('Error creating board resolution:', err);
      // Don't fail the appointment creation if resolution creation fails
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'appointment_created',
      p_action_category: 'executive',
      p_target_type: 'appointment',
      p_target_id: appointment.id,
      p_target_name: body.proposed_officer_name,
      p_description: `Created appointment draft for ${body.proposed_officer_name} as ${body.proposed_title}`,
      p_metadata: {
        appointment_type: body.appointment_type,
        effective_date: body.effective_date,
        title: body.proposed_title,
        new_appointment_id: newAppointmentId,
        board_resolution_id: boardResolutionId,
      },
    });

    // Automatically generate ALL documents for the appointment (as per user requirements)
    // This happens immediately when appointment is created, regardless of status
    try {
      const backfillUrl = `${supabaseUrl}/functions/v1/governance-backfill-appointment-documents`;
      console.log('Triggering automatic document generation for appointment:', appointment.id);
      
      // Call backfill function to generate all documents
      const backfillResponse = await fetch(backfillUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          appointment_id: appointment.id,
          force_regenerate: false, // Only generate missing documents
        }),
      });

      if (!backfillResponse.ok) {
        const errorText = await backfillResponse.text();
        console.error('Document generation returned error:', backfillResponse.status, errorText);
        // Log but don't fail - documents can be regenerated manually
      } else {
        const backfillResult = await backfillResponse.json();
        console.log('Documents generated successfully:', backfillResult);
      }
    } catch (err) {
      console.error('Error calling document generation:', err);
      // Don't fail the request if document generation fails - can be retried manually
    }

    // Trigger full appointment workflow if we have the new appointment ID
    if (newAppointmentId) {
      try {
        // Call handleOfficerAppointment workflow via edge function
        const workflowUrl = `${supabaseUrl}/functions/v1/governance-handle-appointment-workflow`;
        console.log('Triggering appointment workflow for appointment_id:', newAppointmentId);
        
        const workflowResponse = await fetch(workflowUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            appointment_id: newAppointmentId,
            executive_appointment_id: appointment.id, // Link to legacy table
            formation_mode: body.formation_mode || false,
            equity_details: body.equity_included && body.equity_details 
              ? (typeof body.equity_details === 'string' ? JSON.parse(body.equity_details) : body.equity_details)
              : null,
          }),
        });

        if (!workflowResponse.ok) {
          const errorText = await workflowResponse.text();
          console.error('Workflow function returned error:', workflowResponse.status, errorText);
          // Log but don't fail the appointment creation - workflow can be retried
        } else {
          const workflowResult = await workflowResponse.json();
          console.log('Workflow triggered successfully:', workflowResult);
        }
      } catch (err) {
        console.error('Error calling appointment workflow:', err);
        // Don't fail the request if workflow trigger fails - can be retried manually
      }
    } else {
      console.warn('No appointeeUserId - cannot trigger workflow. Email may be missing or user creation failed.');
      console.warn('Appointment created in executive_appointments but workflow will not run.');
    }

    return new Response(
      JSON.stringify({ success: true, data: appointment }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-create-appointment:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

