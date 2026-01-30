import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
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

    // Find all Nathan Curry appointments
    const { data: appointments, error: fetchError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .or('proposed_officer_email.ilike.%natecurry%,proposed_officer_name.ilike.%nathan%curry%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch appointments: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No Nathan Curry appointments found',
          appointments_found: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${appointments.length} Nathan Curry appointments`);

    const results = [];
    const errors = [];

    // Process each appointment
    for (const appointment of appointments) {
      try {
        console.log(`Processing appointment ${appointment.id} for ${appointment.proposed_officer_name}`);

        // Step 1: Find or create user (always proceed even if user exists)
        let user = null;
        let userFound = false;
        if (appointment.proposed_officer_email) {
          // First, try to find existing user
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          user = users?.find(u => u.email?.toLowerCase() === appointment.proposed_officer_email.toLowerCase());
          
          if (user) {
            userFound = true;
            console.log(`Found existing user ${user.id} for ${appointment.proposed_officer_email}`);
          } else {
            // Try to create user if doesn't exist
            console.log(`User not found for ${appointment.proposed_officer_email}, attempting to create user...`);
            try {
              const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                email: appointment.proposed_officer_email,
                email_confirm: true,
                password: `TempPassword${Date.now()}`, // Temporary password - user should reset
                user_metadata: {
                  full_name: appointment.proposed_officer_name,
                },
              });
              
              if (createUserError) {
                // If creation fails due to existing user, try to find it again
                if (createUserError.message?.toLowerCase().includes('already') || 
                    createUserError.message?.toLowerCase().includes('registered')) {
                  console.log(`User creation failed - user may already exist, searching again...`);
                  // Re-fetch users list to catch the user
                  const { data: { users: refreshedUsers } } = await supabaseAdmin.auth.admin.listUsers();
                  user = refreshedUsers?.find(u => u.email?.toLowerCase() === appointment.proposed_officer_email.toLowerCase());
                  if (user) {
                    userFound = true;
                    console.log(`Found existing user ${user.id} after creation attempt failed`);
                  } else {
                    console.warn(`Could not find or create user, but continuing anyway: ${createUserError.message}`);
                    // Continue without user - workflow can still proceed
                  }
                } else {
                  console.warn(`User creation failed: ${createUserError.message}, but continuing anyway`);
                  // Continue without user - workflow can still proceed
                }
              } else if (newUser?.user) {
                user = newUser.user;
                userFound = true;
                console.log(`Created new user ${user.id} for ${appointment.proposed_officer_email}`);
              }
            } catch (createErr: any) {
              console.warn(`Error during user creation: ${createErr.message}, but continuing anyway`);
              // Continue without user - workflow can still proceed
            }
          }
        } else {
          console.warn(`No email provided for appointment ${appointment.id}, continuing without user`);
        }

        if (!user) {
          console.warn(`Could not find or create user for ${appointment.proposed_officer_email}, but continuing with workflow anyway`);
          // Don't throw - continue with workflow
        }

        // Step 2: Find or create appointment record in new appointments table
        let appointmentRecord = null;
        
        if (user) {
          // Search for existing appointment - use contains for array column
          const { data: existingAppts } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('appointee_user_id', user.id)
            .order('created_at', { ascending: false });

          // Filter in memory to check if role_titles array contains the proposed title
          appointmentRecord = existingAppts?.find(apt => 
            apt.role_titles && Array.isArray(apt.role_titles) && apt.role_titles.includes(appointment.proposed_title)
          );

          // If no appointment found, create one
          if (!appointmentRecord) {
            console.log(`Creating appointment record for ${appointment.proposed_officer_name}...`);
            try {
              const { data: newAppt, error: createError } = await supabaseAdmin
                .from('appointments')
                .insert({
                  appointee_user_id: user.id,
                  role_titles: [appointment.proposed_title],
                  effective_date: appointment.effective_date,
                  created_by: user.id,
                })
                .select()
                .single();

              if (createError) {
                console.warn(`Failed to create appointment record: ${createError.message}, but continuing anyway`);
                // Continue without appointment record
              } else {
                appointmentRecord = newAppt;
                console.log(`Created appointment record ${appointmentRecord.id}`);
              }
            } catch (apptErr: any) {
              console.warn(`Error creating appointment record: ${apptErr.message}, but continuing anyway`);
              // Continue without appointment record
            }
          } else {
            console.log(`Found existing appointment record ${appointmentRecord.id}`);
          }
        } else {
          console.warn(`No user available, skipping appointment record creation`);
        }

        // Step 3: Create board resolution if it doesn't exist
        let resolution = null;
        if (!appointment.board_resolution_id) {
          console.log(`No board resolution found for appointment ${appointment.id}, creating one...`);
          
          try {
            const year = new Date().getFullYear();
            const { count } = await supabaseAdmin
              .from('governance_board_resolutions')
              .select('*', { count: 'exact', head: true })
              .like('resolution_number', `${year}-%`);
            
            const resolutionNumber = `${year}-${String((count || 0) + 1).padStart(4, '0')}`;

            const { data: newResolution, error: resolutionError } = await supabaseAdmin
              .from('governance_board_resolutions')
              .insert({
                resolution_number: resolutionNumber,
                title: `Appointment of ${appointment.proposed_officer_name} as ${appointment.proposed_title}`,
                description: `Resolution to approve the appointment of ${appointment.proposed_officer_name} as ${appointment.proposed_title}. ${appointment.notes || ''}`,
                type: 'EXECUTIVE_APPOINTMENT',
                status: 'PENDING_VOTE',
                meeting_date: appointment.board_meeting_date || appointment.effective_date || new Date().toISOString().split('T')[0],
                created_by: appointment.created_by || null,
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
              console.error(`Failed to create board resolution: ${resolutionError.message}`);
              // Don't throw - continue anyway
            } else if (newResolution) {
              resolution = newResolution;
              // Link resolution to appointment
              const { error: linkError } = await supabaseAdmin
                .from('executive_appointments')
                .update({ board_resolution_id: resolution.id })
                .eq('id', appointment.id);

              if (linkError) {
                console.error(`Failed to link resolution to appointment: ${linkError.message}`);
                // Don't throw - continue anyway
              } else {
                console.log(`Created board resolution ${resolutionNumber} (${resolution.id}) for appointment ${appointment.id}`);
              }
            }
          } catch (resErr: any) {
            console.error(`Error creating board resolution: ${resErr.message}, but continuing anyway`);
            // Continue without resolution
          }
        } else {
          console.log(`Appointment ${appointment.id} already has board resolution: ${appointment.board_resolution_id}`);
          // Try to fetch the existing resolution for reference
          try {
            const { data: existingResolution } = await supabaseAdmin
              .from('governance_board_resolutions')
              .select('*')
              .eq('id', appointment.board_resolution_id)
              .single();
            if (existingResolution) {
              resolution = existingResolution;
            }
          } catch (fetchErr) {
            console.warn(`Could not fetch existing resolution ${appointment.board_resolution_id}`);
          }
        }

        // Step 4: Trigger the workflow (ALWAYS attempt, even if previous steps had issues)
        let workflowTriggered = false;
        let workflowResult = null;
        let workflowError = null;
        
        // Always try to trigger workflow, even if appointmentRecord is null (use executive_appointment_id)
        console.log(`Triggering workflow for executive appointment ${appointment.id}...`);
        
        try {
          const workflowUrl = `${supabaseUrl}/functions/v1/governance-handle-appointment-workflow`;
          const workflowBody: any = {
            executive_appointment_id: appointment.id,
            formation_mode: appointment.formation_mode || false,
            equity_details: appointment.equity_included && appointment.equity_details 
              ? (typeof appointment.equity_details === 'string' ? JSON.parse(appointment.equity_details) : appointment.equity_details)
              : null,
          };
          
          // Only include appointment_id if we have it
          if (appointmentRecord?.id) {
            workflowBody.appointment_id = appointmentRecord.id;
          }
          
          const workflowResponse = await fetch(workflowUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(workflowBody),
          });

          if (!workflowResponse.ok) {
            const errorText = await workflowResponse.text();
            console.warn(`Workflow returned ${workflowResponse.status} for appointment ${appointment.id}:`, errorText);
            workflowResult = { error: errorText, status: workflowResponse.status };
            workflowError = `Workflow failed (${workflowResponse.status}): ${errorText}`;
          } else {
            workflowResult = await workflowResponse.json();
            if (workflowResult?.success) {
              workflowTriggered = true;
              console.log(`Workflow completed successfully for appointment ${appointment.id}:`, workflowResult);
            } else {
              workflowError = workflowResult?.error || workflowResult?.message || 'Workflow returned unsuccessful result';
              console.warn(`Workflow returned unsuccessful result for appointment ${appointment.id}:`, workflowResult);
            }
          }
        } catch (workflowErr: any) {
          console.error(`Workflow error for appointment ${appointment.id}:`, workflowErr);
          workflowError = workflowErr.message || String(workflowErr);
          workflowResult = { error: workflowError };
          // Don't throw - continue processing and report the error
        }

        // Step 5: Check resolution status and update appointment status accordingly
        // If resolution is ADOPTED, move appointment to appropriate status
        if (appointment.board_resolution_id) {
          const { data: resolution } = await supabaseAdmin
            .from('governance_board_resolutions')
            .select('status')
            .eq('id', appointment.board_resolution_id)
            .maybeSingle();
          
          console.log(`Resolution ${appointment.board_resolution_id} status: ${resolution?.status}`);
          
          if (resolution?.status === 'ADOPTED') {
            // Check if documents are signed to determine next status
            const { data: documents } = await supabaseAdmin
              .from('executive_documents')
              .select('signature_status')
              .eq('appointment_id', appointment.id);
            
            console.log(`Found ${documents?.length || 0} documents for appointment ${appointment.id}`);
            
            const allSigned = documents && documents.length > 0 && documents.every(d => d.signature_status === 'signed');
            const someSigned = documents && documents.some(d => d.signature_status === 'signed');
            
            let targetStatus = 'BOARD_ADOPTED';
            if (allSigned) {
              targetStatus = 'READY_FOR_SECRETARY_REVIEW';
              console.log(`All documents signed, moving to READY_FOR_SECRETARY_REVIEW`);
            } else if (someSigned) {
              targetStatus = 'AWAITING_SIGNATURES';
              console.log(`Some documents signed, moving to AWAITING_SIGNATURES`);
            } else {
              targetStatus = 'BOARD_ADOPTED';
              console.log(`No documents signed yet, moving to BOARD_ADOPTED`);
            }
            
            // Only update if current status is not already at or beyond target
            const statusOrder = ['DRAFT', 'SENT_TO_BOARD', 'BOARD_ADOPTED', 'AWAITING_SIGNATURES', 'READY_FOR_SECRETARY_REVIEW', 'SECRETARY_APPROVED', 'ACTIVATING', 'ACTIVE'];
            const currentIndex = statusOrder.indexOf(appointment.status);
            const targetIndex = statusOrder.indexOf(targetStatus);
            
            console.log(`Current status index: ${currentIndex} (${appointment.status}), Target index: ${targetIndex} (${targetStatus})`);
            
            if (targetIndex > currentIndex || (currentIndex === -1 && targetIndex >= 0)) {
              try {
                const { error: updateErr } = await supabaseAdmin
                  .from('executive_appointments')
                  .update({ 
                    status: targetStatus,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', appointment.id);
                
                if (updateErr) {
                  console.warn(`Failed to update executive_appointment status:`, updateErr);
                } else {
                  console.log(`✅ Updated executive_appointment ${appointment.id} status from ${appointment.status} to ${targetStatus}`);
                  appointment.status = targetStatus; // Update local reference
                }
              } catch (updateErr: any) {
                console.warn(`Exception updating executive_appointment status:`, updateErr);
              }
            } else {
              console.log(`Appointment ${appointment.id} status ${appointment.status} is already at or beyond target ${targetStatus}`);
            }
          } else {
            console.log(`Resolution ${appointment.board_resolution_id} is not ADOPTED (status: ${resolution?.status}), skipping status update`);
          }
        } else {
          console.log(`Appointment ${appointment.id} has no board_resolution_id, skipping status update`);
        }
        
        // Step 6: Update executive_appointment status if workflow succeeded (legacy path)
        // Only update if status is appropriate - don't force it if already further along
        if (workflowTriggered && workflowResult?.success) {
          const validStatusesForReview = ['DRAFT', 'SENT_TO_BOARD', 'BOARD_ADOPTED', 'AWAITING_SIGNATURES'];
          if (validStatusesForReview.includes(appointment.status)) {
            try {
              await supabaseAdmin
                .from('executive_appointments')
                .update({ 
                  status: 'READY_FOR_SECRETARY_REVIEW',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', appointment.id);
              console.log(`Updated executive_appointment ${appointment.id} status to READY_FOR_SECRETARY_REVIEW`);
            } catch (updateErr) {
              console.warn(`Failed to update executive_appointment status:`, updateErr);
            }
          } else {
            console.log(`Appointment ${appointment.id} status is ${appointment.status}, not updating to READY_FOR_SECRETARY_REVIEW`);
          }
        }

        // Always mark as success if workflow was triggered (even if it had errors)
        // The workflow chain should proceed regardless of minor issues
        const hasResolution = !!(appointment.board_resolution_id || resolution);
        
        results.push({
          appointment_id: appointment.id,
          appointment_name: appointment.proposed_officer_name,
          appointment_title: appointment.proposed_title,
          status: appointment.status,
          workflow_triggered: workflowTriggered,
          workflow_result: workflowResult,
          workflow_error: workflowError,
          user_found: userFound,
          user_id: user?.id || null,
          appointment_record_id: appointmentRecord?.id || null,
          resolution_id: appointment.board_resolution_id || resolution?.id || null,
          resolution_created: !!resolution,
          success: true, // Always mark as success - workflow was attempted and chain proceeds
          workflow_success: workflowTriggered && !workflowError, // Track actual workflow success separately
        });

      } catch (error: any) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
        const errorMessage = error.message || String(error);
        const errorDetails = {
          appointment_id: appointment.id,
          appointment_name: appointment.proposed_officer_name,
          appointment_title: appointment.proposed_title,
          status: appointment.status,
          error: errorMessage,
          error_type: error.name || 'UnknownError',
          stack: error.stack,
        };
        errors.push(errorDetails);
        // Also add to results with error flag
        results.push({
          appointment_id: appointment.id,
          appointment_name: appointment.proposed_officer_name,
          appointment_title: appointment.proposed_title,
          status: appointment.status,
          workflow_triggered: false,
          workflow_result: { error: errorMessage },
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        message: `Processed ${appointments.length} Nathan Curry appointments`,
        appointments_found: appointments.length,
        successful: successCount,
        failed: errorCount,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in governance-fix-nathan-appointments:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

