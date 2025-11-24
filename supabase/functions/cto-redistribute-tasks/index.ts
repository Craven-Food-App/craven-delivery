import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json().catch(() => ({}));
    const { suggestion_id, action } = body; // 'approve' or 'reject'

    console.log('🔄 Analyzing task redistribution...');

    // Get all developers with their current load
    const { data: developers, error: devError } = await supabaseAdmin
      .from('cto_developers')
      .select(`
        *,
        user_profiles:user_id (
          email,
          full_name
        )
      `);

    if (devError) throw devError;

    // Get active sprint tickets
    const { data: activeSprint } = await supabaseAdmin
      .from('cto_sprints')
      .select('id')
      .eq('status', 'active')
      .single();

    if (!activeSprint) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active sprint found', suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('cto_sprint_tickets')
      .select('*')
      .eq('sprint_id', activeSprint.id)
      .in('status', ['todo', 'in_progress', 'review', 'testing', 'blocked']);

    if (ticketsError) throw ticketsError;

    // Calculate load per developer
    const developerLoads = new Map<string, { count: number; points: number; tickets: any[] }>();

    for (const ticket of tickets || []) {
      if (!ticket.assigned_to) continue;
      const devId = ticket.assigned_to;
      if (!developerLoads.has(devId)) {
        developerLoads.set(devId, { count: 0, points: 0, tickets: [] });
      }
      const load = developerLoads.get(devId)!;
      load.count++;
      load.points += ticket.story_points || 0;
      load.tickets.push(ticket);
    }

    // Find overloaded developers (threshold: 5 tickets or 30 points)
    const overloadThreshold = 5;
    const pointThreshold = 30;
    const suggestions: any[] = [];

    for (const [devId, load] of developerLoads.entries()) {
      if (load.count > overloadThreshold || load.points > pointThreshold) {
        // Find a developer with lower load to reassign to
        let bestCandidate: { devId: string; load: number } | null = null;
        for (const [candidateId, candidateLoad] of developerLoads.entries()) {
          if (candidateId === devId) continue;
          if (candidateLoad.count < overloadThreshold && candidateLoad.points < pointThreshold) {
            const candidateTotalLoad = candidateLoad.count + candidateLoad.points;
            if (!bestCandidate || candidateTotalLoad < bestCandidate.load) {
              bestCandidate = { devId: candidateId, load: candidateTotalLoad };
            }
          }
        }

        // If no candidate found, find developer with lowest load
        if (!bestCandidate) {
          for (const [candidateId, candidateLoad] of developerLoads.entries()) {
            if (candidateId === devId) continue;
            const candidateTotalLoad = candidateLoad.count + candidateLoad.points;
            if (!bestCandidate || candidateTotalLoad < bestCandidate.load) {
              bestCandidate = { devId: candidateId, load: candidateTotalLoad };
            }
          }
        }

        // Create suggestions for each overloaded ticket
        for (const ticket of load.tickets.slice(0, Math.ceil(load.count / 2))) { // Suggest reassigning half
          if (bestCandidate) {
            suggestions.push({
              overloaded_developer_id: devId,
              suggested_reassign_to: bestCandidate.devId,
              ticket_id: ticket.id,
              reason: `Developer has ${load.count} active tickets (${load.points} points). Reassigning to balance workload.`,
              priority: load.count > overloadThreshold * 1.5 ? 'high' : 'medium',
            });
          }
        }
      }
    }

    // Handle approval/rejection if provided
    if (suggestion_id && action) {
      const { data: suggestion } = await supabaseAdmin
        .from('cto_redistribution_suggestions')
        .select('*')
        .eq('id', suggestion_id)
        .single();

      if (!suggestion) {
        return new Response(
          JSON.stringify({ error: 'Suggestion not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'approve') {
        // Reassign the ticket
        await supabaseAdmin
          .from('cto_sprint_tickets')
          .update({ assigned_to: suggestion.suggested_reassign_to })
          .eq('id', suggestion.ticket_id);

        // Update suggestion status
        await supabaseAdmin
          .from('cto_redistribution_suggestions')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString(),
          })
          .eq('id', suggestion_id);

        // Send notifications
        const { data: overloadedDev } = await supabaseAdmin
          .from('cto_developers')
          .select('user_profiles:user_id (email, full_name)')
          .eq('user_id', suggestion.overloaded_developer_id)
          .single();

        const { data: reassignDev } = await supabaseAdmin
          .from('cto_developers')
          .select('user_profiles:user_id (email, full_name)')
          .eq('user_id', suggestion.suggested_reassign_to)
          .single();

        const { data: cto } = await supabaseAdmin
          .from('exec_users')
          .select('user_profiles:user_id (email)')
          .eq('role', 'cto')
          .single();

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          const emails = [];
          if (overloadedDev?.user_profiles?.email) emails.push(overloadedDev.user_profiles.email);
          if (reassignDev?.user_profiles?.email) emails.push(reassignDev.user_profiles.email);
          if (cto?.user_profiles?.email) emails.push(cto.user_profiles.email);

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'CTO Portal <noreply@cravenusa.com>',
              to: emails,
              subject: '✅ Task Reassigned: Workload Balanced',
              html: `
                <h2>Task Redistribution</h2>
                <p>A ticket has been reassigned to balance team workload.</p>
                <p><strong>Reason:</strong> ${suggestion.reason}</p>
                <p>Please check your sprint board for updates.</p>
              `,
            }),
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Task reassigned successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'reject') {
        await supabaseAdmin
          .from('cto_redistribution_suggestions')
          .update({ status: 'rejected' })
          .eq('id', suggestion_id);

        return new Response(
          JSON.stringify({ success: true, message: 'Suggestion rejected' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert new suggestions (avoid duplicates)
    const insertedSuggestions: any[] = [];
    for (const suggestion of suggestions) {
      const { data: existing } = await supabaseAdmin
        .from('cto_redistribution_suggestions')
        .select('id')
        .eq('ticket_id', suggestion.ticket_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!existing) {
        const { data: newSuggestion, error: insertError } = await supabaseAdmin
          .from('cto_redistribution_suggestions')
          .insert({
            ...suggestion,
            suggestion_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (!insertError && newSuggestion) {
          insertedSuggestions.push(newSuggestion);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions_created: insertedSuggestions.length,
        suggestions: insertedSuggestions,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in task redistribution:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


