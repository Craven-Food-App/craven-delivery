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

    if (resolution.status !== 'PENDING_VOTE') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Resolution is already ${resolution.status}`,
          resolution 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count total active board members (use status='Active' not is_active)
    const { count: totalBoardMembers } = await supabaseAdmin
      .from('board_members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');

    if (!totalBoardMembers || totalBoardMembers === 0) {
      return new Response(
        JSON.stringify({ error: 'No active board members found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all votes for this resolution
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('board_resolution_votes')
      .select('vote')
      .eq('resolution_id', resolution_id);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch votes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voteCounts = {
      YES: votes?.filter((v) => v.vote === 'YES').length || 0,
      NO: votes?.filter((v) => v.vote === 'NO').length || 0,
      ABSTAIN: votes?.filter((v) => v.vote === 'ABSTAIN').length || 0,
    };

    const totalVotes = voteCounts.YES + voteCounts.NO + voteCounts.ABSTAIN;
    const majorityThreshold = 1; // Quorum requirement: only 1 vote needed
    const votingMajority = Math.floor(totalVotes / 2) + 1;

    let newStatus = resolution.status;
    let action = '';

    // Check if majority YES votes reached
    if (voteCounts.YES >= majorityThreshold) {
      newStatus = 'ADOPTED';
      action = 'ADOPTED';
    }
    // Check if majority NO votes reached (only if we have enough votes)
    else if (voteCounts.NO >= majorityThreshold) {
      newStatus = 'REJECTED';
      action = 'REJECTED';
    }
    // Check if majority of voting members voted YES (even if not all have voted)
    else if (totalVotes >= votingMajority && voteCounts.YES > voteCounts.NO) {
      newStatus = 'ADOPTED';
      action = 'ADOPTED';
    }
    // Check if majority of voting members voted NO
    else if (totalVotes >= votingMajority && voteCounts.NO > voteCounts.YES) {
      newStatus = 'REJECTED';
      action = 'REJECTED';
    }

    // Only update if status changed
    if (newStatus !== resolution.status) {
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
      await supabaseAdmin.rpc('log_governance_action', {
        p_action_type: `resolution_${action.toLowerCase()}`,
        p_action_category: 'board',
        p_target_type: 'resolution',
        p_target_id: resolution_id,
        p_target_name: resolution.title,
        p_description: `Resolution ${action.toLowerCase()} with ${voteCounts.YES} YES, ${voteCounts.NO} NO, ${voteCounts.ABSTAIN} ABSTAIN votes (${totalVotes}/${totalBoardMembers} board members voted)`,
        p_metadata: {
          vote_counts: voteCounts,
          total_board_members: totalBoardMembers,
          total_votes: totalVotes,
          majority_threshold: majorityThreshold,
        },
      });

      // If this is an appointment resolution and it was adopted, update appointment status
      if (newStatus === 'ADOPTED' && resolution.type === 'EXECUTIVE_APPOINTMENT') {
        // Find the executive appointment linked to this resolution
        const { data: execAppointments, error: execApptError } = await supabaseAdmin
          .from('executive_appointments')
          .select('id, status')
          .eq('board_resolution_id', resolution_id)
          .maybeSingle();

        if (execAppointments) {
          console.log(`Updating executive appointment ${execAppointments.id} status after resolution adoption`);
          
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
          
          // Step 2: Update status based on current state - flow should be:
          // BOARD_ADOPTED → AWAITING_SIGNATURES → READY_FOR_SECRETARY_REVIEW
          // If documents are already signed, go straight to READY_FOR_SECRETARY_REVIEW
          // Otherwise, go to AWAITING_SIGNATURES or BOARD_ADOPTED
          
          // Check if documents are signed (after syncing)
          const { data: documents } = await supabaseAdmin
            .from('executive_documents')
            .select('signature_status')
            .eq('appointment_id', execAppointments.id);
          
          const allSigned = documents && documents.length > 0 && documents.every(d => d.signature_status === 'signed');
          const someSigned = documents && documents.some(d => d.signature_status === 'signed');
          
          let newAppointmentStatus = 'BOARD_ADOPTED';
          if (allSigned) {
            newAppointmentStatus = 'READY_FOR_SECRETARY_REVIEW';
          } else if (someSigned) {
            newAppointmentStatus = 'AWAITING_SIGNATURES';
          } else {
            newAppointmentStatus = 'BOARD_ADOPTED';
          }
          
          await supabaseAdmin
            .from('executive_appointments')
            .update({
              status: newAppointmentStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', execAppointments.id);
          
          console.log(`Updated appointment ${execAppointments.id} to status ${newAppointmentStatus}`);
        } else if (execApptError) {
          console.error('Error finding executive appointment:', execApptError);
        }

        // Step 3: Trigger resolution execution (this will send email with documents)
        // This happens AFTER status is updated to BOARD_ADOPTED
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
          // Don't fail the finalization if execution fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Resolution ${action.toLowerCase()}`,
          resolution: updatedResolution,
          vote_counts: voteCounts,
          total_board_members: totalBoardMembers,
          total_votes: totalVotes,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Status didn't change - not enough votes yet
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resolution still pending - not enough votes for majority',
        resolution,
        vote_counts: voteCounts,
        total_board_members: totalBoardMembers,
        total_votes: totalVotes,
        majority_threshold: majorityThreshold,
        needs_more_votes: majorityThreshold - totalVotes,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-finalize-resolution:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

