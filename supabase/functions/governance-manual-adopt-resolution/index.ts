import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
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

    // If this is an appointment resolution and it was adopted, handle appointment workflow
    if (newStatus === 'ADOPTED' && resolution.type === 'EXECUTIVE_APPOINTMENT') {
      // Find the executive appointment linked to this resolution
      const { data: execAppointments, error: execApptError } = await supabaseAdmin
        .from('executive_appointments')
        .select('*')
        .eq('board_resolution_id', resolution_id)
        .maybeSingle();

      if (execAppointments) {
        console.log(`Updating executive appointment ${execAppointments.id} status after manual adoption`);
        
        // Create corporate_officers record first
        console.log('Creating corporate officer record...');
        const officerData = {
          full_name: execAppointments.appointee_name || execAppointments.proposed_officer_name,
          title: execAppointments.title || execAppointments.proposed_title,
          email: execAppointments.appointee_email || execAppointments.proposed_officer_email,
          effective_date: execAppointments.effective_date || new Date().toISOString().split('T')[0],
          status: 'ACTIVE',
          appointed_by: resolution_id,
          metadata: {
            appointment_id: execAppointments.id,
            appointment_type: execAppointments.appointment_type || 'NEW',
            authority_granted: execAppointments.authority_granted,
            compensation_structure: execAppointments.compensation_structure,
            equity_included: execAppointments.equity_included || false,
            equity_details: execAppointments.equity_details
          }
        };

        const { error: officerError } = await supabaseAdmin
          .from('corporate_officers')
          .upsert(officerData, { onConflict: 'email' });

        if (officerError) {
          console.error('Error creating corporate officer:', officerError);
        } else {
          console.log('Corporate officer created successfully for', execAppointments.appointee_name || execAppointments.proposed_officer_name);
        }
        
        // Step 1: Sync documents from appointment URLs to executive_documents FIRST
        console.log('Syncing documents to executive_documents before status update...');
        try {
          const syncResponse = await fetch(`${supabaseUrl}/functions/v1/governance-sync-appointment-documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ appointment_id: execAppointments.id }),
          });
          
          const syncData = await syncResponse.json();
          if (syncData?.documents_synced > 0) {
            console.log(`Synced ${syncData.documents_synced} documents for appointment ${execAppointments.id}`);
          }
        } catch (syncErr) {
          console.warn('Document sync had issues, but continuing:', syncErr);
        }
        
        // Step 2: Update status based on current state
        // Check if documents are signed (after syncing)
        const { data: documents } = await supabaseAdmin
          .from('executive_documents')
          .select('signature_status')
          .eq('appointment_id', execAppointments.id);
        
        const allSigned = documents && documents.length > 0 && documents.every(d => d.signature_status === 'signed');
        
        // Once board adopts resolution, appointment is ready for secretary review
        let newAppointmentStatus = 'READY_FOR_SECRETARY_REVIEW';
        if (allSigned && documents.length > 0) {
          newAppointmentStatus = 'READY_FOR_SECRETARY_REVIEW'; // Still needs validation even if signed
        }
        
        await supabaseAdmin
          .from('executive_appointments')
          .update({
            status: newAppointmentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', execAppointments.id);
        
        console.log(`Updated appointment ${execAppointments.id} to status ${newAppointmentStatus}`);

        // Step 3: Trigger resolution execution (this will send email with documents)
        // This happens AFTER status is updated
        console.log('Triggering resolution execution to send email...');
        try {
          const execResponse = await fetch(`${supabaseUrl}/functions/v1/governance-execute-resolution`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ resolution_id: resolution_id }),
          });
          
          const execResult = await execResponse.json();
          if (execResponse.ok) {
            console.log('Resolution executed successfully, email should be sent:', execResult);
          } else {
            console.error('Resolution execution failed:', execResult);
          }
        } catch (err) {
          console.error('Error executing resolution:', err);
          // Don't fail the manual adoption if execution fails
        }
      } else if (execApptError) {
        console.error('Error finding executive appointment:', execApptError);
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

