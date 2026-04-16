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
    const resolution_id = body.resolution_id || body.resolutionId;
    const vote = body.vote;
    const comment = body.comment;

    if (!resolution_id || !vote) {
      return new Response(
        JSON.stringify({ error: 'Missing resolution_id or vote' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['YES', 'NO', 'ABSTAIN'].includes(vote)) {
      return new Response(
        JSON.stringify({ error: 'Invalid vote. Must be YES, NO, or ABSTAIN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get board member for this user
    // IMPORTANT: avoid PostgREST single()/maybeSingle() here, because they throw when 0 or >1 rows.
    let boardMember: { id: string } | null = null;
    const { data: boardRows, error: boardError } = await supabaseAdmin
      .from('board_members')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (boardError) {
      console.error('Error checking board member:', boardError);
      return new Response(
        JSON.stringify({ error: `Failed to check board member status: ${boardError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (boardRows && boardRows.length > 0) {
      // Use the most recently created active board member row
      boardMember = { id: boardRows[0].id };
    }

    if (!boardMember) {
      // Check if user has board member role
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['CRAVEN_BOARD_MEMBER', 'CRAVEN_FOUNDER']);

      // Also check exec_users for board_member role
      const { data: execUser, error: execUserError } = await supabaseAdmin
        .from('exec_users')
        .select('role, email, full_name')
        .eq('user_id', user.id)
        .eq('role', 'board_member')
        .maybeSingle(); // Use maybeSingle() to avoid error on not found
      
      // Log exec user check result (non-blocking)
      if (execUserError && execUserError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
        console.warn('Error checking exec_users (non-blocking):', execUserError);
      }

      const hasBoardRole = (userRoles && userRoles.length > 0) || execUser || user.email === 'craven@usa.com';

      if (hasBoardRole) {
        // Get user email and name
        const userEmail = user.email || '';
        const userName = execUser?.full_name || userEmail.split('@')[0] || 'Board Member';

        // Create board member record
        // The board_members table uses 'status' and 'role_title' columns
        const { data: newBoardMember, error: createError } = await supabaseAdmin
          .from('board_members')
          .insert({
            user_id: user.id,
            full_name: userName,
            email: userEmail,
            role_title: execUser?.role === 'board_member' ? 'Director' : 'Board Chair',
            status: 'Active',
          })
          .select('id')
          .single();

        if (createError || !newBoardMember) {
          console.error('Error creating board member:', createError);
          return new Response(
            JSON.stringify({ error: `Failed to create board member record: ${createError?.message || 'Unknown error'}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        boardMember = newBoardMember;
      } else {
        return new Response(
          JSON.stringify({ error: 'User is not an active board member' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if vote already exists
    const { data: existingVote, error: voteCheckError } = await supabaseAdmin
      .from('board_resolution_votes')
      .select('id')
      .eq('resolution_id', resolution_id)
      .eq('board_member_id', boardMember.id)
      .maybeSingle(); // Use maybeSingle() to avoid error on not found

    if (voteCheckError && voteCheckError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
      console.error('Error checking existing vote:', voteCheckError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing vote: ${voteCheckError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let voteData;
    if (existingVote) {
      // Update existing vote
      console.log(`Updating existing vote ${existingVote.id} for board member ${boardMember.id}`);
      const { data, error } = await supabaseAdmin
        .from('board_resolution_votes')
        .update({
          vote,
          comment: comment || null,
        })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vote:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return new Response(
          JSON.stringify({ 
            error: `Failed to update vote: ${error.message}`,
            details: error.details || error.hint || error.code,
            code: error.code,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      voteData = data;
      console.log('Vote updated successfully:', voteData);
    } else {
      // Create new vote
      console.log(`Creating new vote for resolution ${resolution_id}, board member ${boardMember.id}, vote: ${vote}`);
      const votePayload = {
        resolution_id,
        board_member_id: boardMember.id,
        vote,
        comment: comment || null,
      };
      console.log('Vote payload:', JSON.stringify(votePayload, null, 2));
      
      const { data, error } = await supabaseAdmin
        .from('board_resolution_votes')
        .insert(votePayload)
        .select()
        .single();

      if (error) {
        console.error('Error creating vote:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Resolution ID:', resolution_id);
        console.error('Board Member ID:', boardMember.id);
        console.error('Vote:', vote);
        
        // Check if it's a unique constraint violation (already voted)
        if (error.code === '23505') {
          // Try to fetch and update the existing vote
          console.log('Unique constraint violation - vote already exists, attempting to update...');
          const { data: existingVoteData, error: fetchError } = await supabaseAdmin
            .from('board_resolution_votes')
            .select('id')
            .eq('resolution_id', resolution_id)
            .eq('board_member_id', boardMember.id)
            .maybeSingle();
          
          if (!fetchError && existingVoteData) {
            const { data: updatedData, error: updateError } = await supabaseAdmin
              .from('board_resolution_votes')
              .update({
                vote,
                comment: comment || null,
              })
              .eq('id', existingVoteData.id)
              .select()
              .single();
            
            if (updateError) {
              return new Response(
                JSON.stringify({ 
                  error: `Failed to update existing vote: ${updateError.message}`,
                  details: updateError.details || updateError.hint || updateError.code,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            voteData = updatedData;
            console.log('Vote updated after constraint violation:', voteData);
          } else {
            return new Response(
              JSON.stringify({ 
                error: `Failed to create vote: ${error.message}`,
                details: error.details || error.hint || error.code,
                code: error.code,
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ 
              error: `Failed to create vote: ${error.message}`,
              details: error.details || error.hint || error.code,
              code: error.code,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        voteData = data;
        console.log('Vote created successfully:', voteData);
      }
    }

    // Log the action (non-blocking - don't fail if logging fails)
    try {
      await supabaseAdmin.rpc('log_governance_action', {
        p_action_type: 'vote_cast',
        p_action_category: 'board',
        p_target_type: 'resolution',
        p_target_id: resolution_id,
        p_target_name: `Resolution ${resolution_id}`,
        p_description: `Cast ${vote} vote on resolution`,
        p_metadata: {
          vote,
          comment: comment || null,
          board_member_id: boardMember.id,
        },
      });
    } catch (logError) {
      console.warn('Failed to log governance action (non-blocking):', logError);
      // Continue - logging failure shouldn't prevent vote from being cast
    }

    // Check if resolution should be finalized (adopted/rejected)
    try {
      const finalizeUrl = `${supabaseUrl}/functions/v1/governance-finalize-resolution`;
      await fetch(finalizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ resolution_id }),
      });
    } catch (finalizeError) {
      // Don't fail the vote if finalization check fails
      console.error('Error checking resolution finalization:', finalizeError);
    }

    return new Response(
      JSON.stringify({ success: true, data: voteData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-cast-vote:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error type:', typeof error);
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Internal server error');
    const errorDetails = error instanceof Error && error.stack ? { stack: error.stack } : {};
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        type: typeof error,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

