import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const resolution_id = body.resolution_id || body.resolutionId;

    if (!resolution_id) {
      return new Response(
        JSON.stringify({ error: 'Missing resolution_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (resolution.status !== 'ADOPTED') {
      return new Response(
        JSON.stringify({ error: 'Resolution must be ADOPTED before execution' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolutionType = resolution.type;
    const metadata = resolution.metadata || {};

    // Execute based on resolution type
    let executionResult: any = {};

    if (resolutionType === 'EXECUTIVE_APPOINTMENT') {
      // Find executive appointment linked to this resolution
      const { data: execAppointment } = await supabaseAdmin
        .from('executive_appointments')
        .select('*')
        .eq('board_resolution_id', resolution_id)
        .maybeSingle();

      if (execAppointment) {
        console.log(`Executing resolution for executive appointment ${execAppointment.id}`);
        const appointmentId = execAppointment.id;

        // Step 1: Ensure user account exists (create if needed with temporary password)
        let user = null;
        let tempPassword: string | null = null;
        
        if (execAppointment.proposed_officer_email) {
          console.log(`Ensuring user account exists for ${execAppointment.proposed_officer_email}...`);
          
          // First, try to find existing user
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          user = users?.find(u => u.email?.toLowerCase() === execAppointment.proposed_officer_email.toLowerCase());
          
          if (!user) {
            // Create user with temporary password
            tempPassword = `Temp${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
            console.log(`Creating new user account with temporary password...`);
            
            try {
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: execAppointment.proposed_officer_email,
                email_confirm: true,
                password: tempPassword,
                user_metadata: {
                  full_name: execAppointment.proposed_officer_name,
                },
              });
              
              if (createError) {
                // If user already exists, try to find it
                if (createError.message?.toLowerCase().includes('already') || 
                    createError.message?.toLowerCase().includes('registered')) {
                  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                  const foundUser = users?.find(u => u.email?.toLowerCase() === execAppointment.proposed_officer_email.toLowerCase());
                  if (foundUser) {
                    user = foundUser;
                    console.log(`Found existing user ${user.id} after creation attempt`);
                  }
                } else {
                  console.warn(`User creation failed: ${createError.message}`);
                }
              } else if (newUser?.user) {
                user = newUser.user;
                console.log(`Created new user ${user.id} for ${execAppointment.proposed_officer_email}`);
              }
            } catch (userErr: any) {
              console.warn(`Error creating user: ${userErr.message}`);
            }
          } else {
            console.log(`Found existing user ${user.id} for ${execAppointment.proposed_officer_email}`);
          }
        }

        // Step 2: Sync documents from appointment URLs to executive_documents if needed
        console.log('Syncing documents to executive_documents...');
        const { data: syncData, error: syncDocError } = await fetch(`${supabaseUrl}/functions/v1/governance-sync-appointment-documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ appointment_id: appointmentId }),
        }).then(r => r.json()).catch(err => {
          console.error('Error syncing documents:', err);
          return { error: err.message };
        });

        if (syncDocError) {
          console.warn('Document sync had issues, but continuing:', syncDocError);
        } else {
          console.log(`Synced ${syncData?.documents_synced || 0} documents for appointment ${appointmentId}`);
        }

        // Step 3: Send email notification to appointee with documents and login credentials
        // This happens AFTER resolution is ADOPTED (Step 4)
        console.log('Sending email to executive with appointment documents and login credentials...');
        try {
          const emailBody: any = { 
            appointmentId: appointmentId,
          };
          
          // Include temporary password if user was just created
          if (tempPassword && user) {
            emailBody.temporaryPassword = tempPassword;
            emailBody.userCreated = true;
          }
          
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-appointment-documents-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(emailBody),
          });

          const emailResult = await emailResponse.json();
          if (!emailResponse.ok) {
            console.error('Email sending failed:', emailResult);
          } else {
            console.log(`Email sent successfully to ${execAppointment.proposed_officer_email}:`, emailResult);
          }
        } catch (err) {
          console.error('Error sending appointment email:', err);
        }

        executionResult = { 
          appointment_id: appointmentId,
          executive_name: execAppointment.proposed_officer_name,
          executive_email: execAppointment.proposed_officer_email,
          user_created: !!tempPassword,
          user_id: user?.id || null,
          documents_synced: syncData?.documents_synced || 0,
          email_sent: true,
        };
      } else {
        // Fallback: Try old appointments table
        const appointmentId = metadata.appointment_id;
        
        if (appointmentId) {
          const { data: appointment } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .maybeSingle();

          if (appointment && appointment.appointee_user_id) {
            // Get existing documents for this appointment (already generated)
            const { data: existingDocuments } = await supabaseAdmin
              .from('board_documents')
              .select('id, type, title')
              .eq('related_appointment_id', appointmentId);

            const documentIds = existingDocuments?.map(d => d.id) || [];

            // Update onboarding status to documents_sent
            const { data: onboarding } = await supabaseAdmin
              .from('executive_onboarding')
              .update({
                status: 'documents_sent',
                updated_at: new Date().toISOString(),
              })
              .eq('appointment_id', appointmentId)
              .eq('user_id', appointment.appointee_user_id)
              .select()
              .maybeSingle();

            // Send email notification to appointee with documents
            if (documentIds.length > 0) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-appointment-documents-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ 
                    appointmentId: appointmentId,
                    documentIds: documentIds,
                  }),
                });
              } catch (err) {
                console.error('Error sending appointment email:', err);
              }
            }

            executionResult = { 
              onboarding_updated: true, 
              onboarding_id: onboarding?.id,
              documents_sent: documentIds.length,
              status: 'documents_sent',
            };
          }
        }
      }
    } else if (resolutionType === 'EQUITY_GRANT' && metadata.grant_details) {
      // Execute equity grant
      try {
        const grantResponse = await fetch(`${supabaseUrl}/functions/v1/governance-grant-equity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            resolution_id: resolution_id,
            ...metadata.grant_details,
          }),
        });
        executionResult = await grantResponse.json();
      } catch (err) {
        console.error('Error granting equity:', err);
        executionResult = { error: 'Failed to grant equity' };
      }
    }

    // Update resolution status to EXECUTED
    const { data: updatedResolution } = await supabaseAdmin
      .from('governance_board_resolutions')
      .update({
        status: 'EXECUTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolution_id)
      .select()
      .single();

    // Log execution
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'resolution_executed',
      p_action_category: 'board',
      p_target_type: 'resolution',
      p_target_id: resolution_id,
      p_target_name: resolution.title,
      p_description: `Resolution executed: ${resolution.title}`,
      p_metadata: { execution_result: executionResult },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resolution executed successfully',
        resolution: updatedResolution,
        execution_result: executionResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-execute-resolution:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

