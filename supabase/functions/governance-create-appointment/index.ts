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
    const requiredFields = ['proposed_officer_name', 'proposed_officer_email', 'proposed_title', 'effective_date'];
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

    // --- Resolve or create auth user and user_profiles for the appointee ---
    let appointeeUserId: string | null = null;
    if (body.proposed_officer_email) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const foundUser = existingUser?.users.find((u: { email?: string }) => u.email === body.proposed_officer_email);
      if (foundUser) {
        appointeeUserId = foundUser.id;
      } else {
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: body.proposed_officer_email,
          email_confirm: true,
          user_metadata: { full_name: body.proposed_officer_name },
        });
        if (!createUserError && newUser?.user) {
          appointeeUserId = newUser.user.id;
          await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: newUser.user.id,
              full_name: body.proposed_officer_name,
              email: body.proposed_officer_email,
            }, { onConflict: 'user_id' });
        }
      }
    }

    // --- Resolve or create exec_users; get executive_id ---
    function titleToRole(title: string): string {
      const t = (title || '').toLowerCase();

      // Core C-suite
      if (t.includes('ceo') || t.includes('chief executive')) return 'ceo';
      if (t.includes('cfo') || t.includes('chief financial')) return 'cfo';
      if (t.includes('coo') || t.includes('chief operating')) return 'coo';
      if (t.includes('cto') || t.includes('chief technology')) return 'cto';

      // Extended C-suite (mapping by function)
      if (t.includes('chief partnership') || t.includes('cpo')) return 'cpo';
      if (t.includes('chief marketing') || t.includes('cmo')) return 'cmo';
      if (t.includes('chief revenue') || t.includes('cro')) return 'cro';
      if (t.includes('chief legal') || t.includes('clo')) return 'clo';
      if (t.includes('chief information security') || t.includes('ciso')) return 'ciso';
      if (t.includes('chief information') || t.includes('cio')) return 'cio';
      if (t.includes('chief data') || t.includes('cdo')) return 'cdo';
      if (t.includes('chief administrative') || t.includes('cao')) return 'cao';
      if (t.includes('chief strategy') || t.includes('cso')) return 'cso';
      if (t.includes('chief compliance') || t.includes('cco')) return 'cco';
      if (t.includes('chief brand') || t.includes('cbo')) return 'cbo';
      if (t.includes('chief experience') || t.includes('cxo')) return 'cxo';
      if (t.includes('chief people') || t.includes('chief human resources') || t.includes('chro')) return 'chro';

      // Governance roles
      if (t.includes('advisor')) return 'advisor';
      if (t.includes('board')) return 'board_member';

      // Default to board_member so constraint is always satisfied
      return 'board_member';
    }

    let executiveId: string;
    if (appointeeUserId) {
      const { data: existingExec } = await supabaseAdmin
        .from('exec_users')
        .select('id')
        .eq('user_id', appointeeUserId)
        .maybeSingle();
      if (existingExec) {
        executiveId = existingExec.id;
        await supabaseAdmin
          .from('exec_users')
          .update({
            title: body.proposed_title,
            name: body.proposed_officer_name,
            email: body.proposed_officer_email || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', executiveId);
      } else {
        const { data: newExec, error: execInsertErr } = await supabaseAdmin
          .from('exec_users')
          .insert({
            user_id: appointeeUserId,
            role: titleToRole(body.proposed_title),
            title: body.proposed_title,
            name: body.proposed_officer_name,
            email: body.proposed_officer_email || null,
          })
          .select('id')
          .single();
        if (execInsertErr || !newExec) {
          console.error('Error creating exec_users row:', execInsertErr);
          return new Response(
            JSON.stringify({ error: 'Could not create executive record. Email may be required.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        executiveId = newExec.id;
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Proposed officer email is required to create an appointment.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Current user display name for appointed_by ---
    const { data: creatorProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();
    const appointedBy = creatorProfile?.full_name || user.email || user.id;

    // --- Create board resolution first (we need resolution_id for executive_appointments) ---
    let resolutionId: string | null = null;
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
            proposed_officer_name: body.proposed_officer_name,
            proposed_officer_email: body.proposed_officer_email,
            proposed_title: body.proposed_title,
          },
        })
        .select()
        .single();
      if (!resolutionError && resolution) {
        resolutionId = resolution.id;
      }
    } catch (err) {
      console.error('Error creating board resolution:', err);
    }

    // --- Map appointment_type to new schema enum ---
    const appointmentTypeMap: Record<string, string> = {
      NEW: 'initial',
      initial: 'initial',
      reappointment: 'reappointment',
      promotion: 'promotion',
      lateral: 'lateral',
    };
    const appointmentType = appointmentTypeMap[body.appointment_type] || 'initial';

    const equityDetails = body.equity_details != null
      ? (typeof body.equity_details === 'string' ? (() => { try { return JSON.parse(body.equity_details); } catch { return body.equity_details; } })() : body.equity_details)
      : null;

    // --- Insert executive_appointments (new schema: executive_id, position, resolution_id, etc.) ---
    const { data: appointment, error: insertError } = await supabaseAdmin
      .from('executive_appointments')
      .insert({
        executive_id: executiveId,
        position: body.proposed_title,
        appointment_type: appointmentType,
        effective_date: body.effective_date,
        appointed_by: appointedBy,
        resolution_id: resolutionId,
        status: 'pending',
        notes: body.notes || null,
        equity_included: body.equity_included || false,
        compensation_structure: body.compensation_structure || null,
        equity_details: equityDetails,
        formation_mode: body.formation_mode || false,
        board_meeting_date: body.board_meeting_date || null,
        term_length_months: body.term_length_months ? parseInt(body.term_length_months, 10) : null,
        authority_granted: body.authority_granted || null,
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

    // --- Create row in appointments table (for workflow and cap table) ---
    let newAppointmentId: string | null = null;
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
        resolution_id: resolutionId,
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

