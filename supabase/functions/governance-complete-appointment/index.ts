import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const appointment_id = body.appointment_id || body.appointmentId;

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get onboarding record
    const { data: onboarding, error: onboardingError } = await supabaseAdmin
      .from('executive_onboarding')
      .select('*')
      .eq('appointment_id', appointment_id)
      .single();

    if (onboardingError || !onboarding) {
      return new Response(
        JSON.stringify({ error: 'Onboarding record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure executive identity (SSN / tax info) has been provided before completing appointment
    // This protects against accidentally finalizing an executive without required tax/identity data.
    try {
      const { data: execUser } = await supabaseAdmin
        .from('exec_users')
        .select('id')
        .eq('user_id', appointment.appointee_user_id)
        .maybeSingle();

      if (execUser?.id) {
        const { data: execIdentity } = await supabaseAdmin
          .from('executive_identity_admin')
          .select('id, ssn_last4, w9_storage_path')
          .eq('executive_id', execUser.id)
          .maybeSingle();

        const hasIdentity = !!execIdentity?.id;
        const hasLast4 = !!execIdentity?.ssn_last4;
        const hasW9 = !!execIdentity?.w9_storage_path;

        if (!hasIdentity || !hasLast4 || !hasW9) {
          return new Response(
            JSON.stringify({
              error: 'Executive tax and identity information is incomplete. Please collect SSN (last 4) and W‑9 before completing this appointment.',
              missing: {
                identity_record: !hasIdentity,
                ssn_last4: !hasLast4,
                w9: !hasW9,
              },
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // If there is no exec_users row yet, we allow completion but log for follow‑up
        console.warn(
          'governance-complete-appointment: No exec_users record found for appointee_user_id; skipping executive_identity check.',
          appointment.appointee_user_id,
        );
      }
    } catch (identityCheckError) {
      console.error('Error checking executive_identity before appointment completion:', identityCheckError);
      // Fail safe: do not block completion if the identity check itself fails; only block on explicit "missing" above
    }

    // Check if all documents are signed
    const { data: documents } = await supabaseAdmin
      .from('board_documents')
      .select('id, signing_status')
      .eq('related_appointment_id', appointment_id);

    const allSigned = documents?.every(doc => doc.signing_status === 'completed') || false;

    if (!allSigned) {
      return new Response(
        JSON.stringify({ error: 'Not all documents have been signed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update onboarding status
    await supabaseAdmin
      .from('executive_onboarding')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', onboarding.id);

    // Add/Update corporate officer
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', appointment.appointee_user_id)
      .maybeSingle();

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(appointment.appointee_user_id);

    const officerName = profile?.full_name || user?.email?.split('@')[0] || 'Officer';
    const officerEmail = profile?.email || user?.email || '';

    // Check if officer already exists
    const { data: existingOfficer } = await supabaseAdmin
      .from('corporate_officers')
      .select('id')
      .eq('email', officerEmail)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (existingOfficer) {
      // Update existing officer
      await supabaseAdmin
        .from('corporate_officers')
        .update({
          title: appointment.role_titles.join(', '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOfficer.id);
    } else {
      // Create new officer
      await supabaseAdmin
        .from('corporate_officers')
        .insert({
          full_name: officerName,
          email: officerEmail,
          title: appointment.role_titles.join(', '),
          effective_date: appointment.effective_date,
          status: 'ACTIVE',
          metadata: {
            appointment_id: appointment_id,
            role_titles: appointment.role_titles,
          },
        });
    }

    // Assign permissions/roles
    for (const roleTitle of appointment.role_titles) {
      // Map role titles to user roles
      const roleMap: Record<string, string> = {
        'CEO': 'CRAVEN_CEO',
        'CFO': 'CRAVEN_CFO',
        'CTO': 'CRAVEN_CTO',
        'COO': 'CRAVEN_COO',
        'Secretary': 'CRAVEN_CORPORATE_SECRETARY',
      };

      const role = roleMap[roleTitle] || `CRAVEN_${roleTitle.toUpperCase().replace(/\s+/g, '_')}`;

      // Check if role already exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', appointment.appointee_user_id)
        .eq('role', role)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: appointment.appointee_user_id,
            role: role,
            granted_by: appointment.created_by,
            granted_at: new Date().toISOString(),
          });
      }
    }

    // If equity is included, issue shares
    // Get resolution linked to this appointment
    const { data: resolution } = await supabaseAdmin
      .from('governance_board_resolutions')
      .select('id, metadata')
      .eq('metadata->>appointment_id', appointment_id)
      .maybeSingle();

    // Get equity details from resolution metadata (preferred) or executive_appointments
    let equityDetails = null;
    
    // First check resolution metadata (this is where it's stored in the new flow)
    if (resolution?.metadata) {
      equityDetails = (resolution.metadata as any)?.equity_grant_details || null;
    }
    
    // Fallback to executive_appointments if not in resolution metadata
    if (!equityDetails && resolution?.metadata) {
      const execAppointmentId = (resolution.metadata as any)?.executive_appointment_id || null;
      if (execAppointmentId) {
        const { data: execAppointment } = await supabaseAdmin
          .from('executive_appointments')
          .select('equity_included, equity_details')
          .eq('id', execAppointmentId)
          .maybeSingle();
        
        if (execAppointment?.equity_included && execAppointment?.equity_details) {
          try {
            equityDetails = typeof execAppointment.equity_details === 'string' 
              ? JSON.parse(execAppointment.equity_details)
              : execAppointment.equity_details;
          } catch {
            equityDetails = execAppointment.equity_details;
          }
        }
      }
    }

    if (equityDetails && equityDetails.shares_amount) {
      try {
        // First grant equity
        await fetch(`${supabaseUrl}/functions/v1/governance-grant-equity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            recipient_user_id: appointment.appointee_user_id,
            shares_amount: equityDetails.shares_amount,
            share_class: equityDetails.share_class || 'Common',
            vesting_type: equityDetails.vesting_type || 'graded',
            vesting_period_months: equityDetails.vesting_period_months || 48,
            cliff_months: equityDetails.cliff_months || 12,
            resolution_id: resolution?.id,
            appointment_id: appointment_id,
          }),
        });

        // Then issue shares and generate certificate
        await fetch(`${supabaseUrl}/functions/v1/governance-issue-shares`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            recipient_user_id: appointment.appointee_user_id,
            shares_amount: equityDetails.shares_amount,
            share_class: equityDetails.share_class || 'Common',
            resolution_id: resolution?.id,
            appointment_id: appointment_id,
          }),
        });
      } catch (err) {
        console.error('Error issuing equity:', err);
        // Don't fail the appointment completion if equity issuance fails
      }
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'appointment_completed',
      p_action_category: 'executive',
      p_target_type: 'appointment',
      p_target_id: appointment_id,
      p_target_name: officerName,
      p_description: `Appointment completed: ${officerName} as ${appointment.role_titles.join(', ')}`,
      p_metadata: {
        role_titles: appointment.role_titles,
        equity_included: !!equityDetails,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment completed successfully',
        appointment_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-complete-appointment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

