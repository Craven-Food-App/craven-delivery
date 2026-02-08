import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

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
    const { initiative_id, github_repo, github_owner } = body;

    console.log('🔄 Syncing GitHub data for roadmap...');

    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all initiatives with GitHub milestones
    const { data: initiatives, error: initError } = await supabaseAdmin
      .from('cto_roadmap_initiatives')
      .select('*')
      .eq('status', 'in-progress')
      .not('github_milestone_id', 'is', null);

    if (initError) throw initError;

    const syncResults = [];

    for (const initiative of initiatives || []) {
      if (!initiative.github_milestone_id) continue;

      try {
        // Fetch milestone data
        const milestoneUrl = `https://api.github.com/repos/${github_owner || 'cravenusa'}/${github_repo || 'craven-delivery'}/milestones/${initiative.github_milestone_id}`;
        const milestoneResponse = await fetch(milestoneUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (!milestoneResponse.ok) {
          console.warn(`Failed to fetch milestone ${initiative.github_milestone_id}`);
          continue;
        }

        const milestone = await milestoneResponse.json();

        // Fetch issues for this milestone
        const issuesUrl = `https://api.github.com/repos/${github_owner || 'cravenusa'}/${github_repo || 'craven-delivery'}/issues?milestone=${initiative.github_milestone_id}&state=all`;
        const issuesResponse = await fetch(issuesUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        const issues = issuesResponse.ok ? await issuesResponse.json() : [];
        const openIssues = issues.filter((i: any) => i.state === 'open');
        const closedIssues = issues.filter((i: any) => i.state === 'closed');

        // Fetch PRs (issues with pull_request field)
        const prs = issues.filter((i: any) => i.pull_request);
        const openPRs = prs.filter((p: any) => p.state === 'open');
        const mergedPRs = prs.filter((p: any) => p.state === 'closed' && p.pull_request.merged_at);

        // Calculate progress
        const totalIssues = issues.length;
        const completedIssues = closedIssues.length;
        const progressPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

        // Update initiative
        const { error: updateError } = await supabaseAdmin
          .from('cto_roadmap_initiatives')
          .update({
            github_issues_count: totalIssues,
            github_prs_count: prs.length,
            progress_percentage: progressPercentage,
            completed_milestones: completedIssues,
            total_milestones: totalIssues,
            last_github_sync_at: new Date().toISOString(),
            status: milestone.state === 'closed' ? 'completed' : 'in-progress',
          })
          .eq('id', initiative.id);

        if (updateError) throw updateError;

        // Log sync
        await supabaseAdmin
          .from('cto_github_sync_log')
          .insert({
            initiative_id: initiative.id,
            sync_type: 'full',
            github_id: milestone.id,
            github_url: milestone.html_url,
            data_synced: {
              milestone: milestone.title,
              open_issues: openIssues.length,
              closed_issues: closedIssues.length,
              open_prs: openPRs.length,
              merged_prs: mergedPRs.length,
              progress: progressPercentage,
            },
            sync_status: 'success',
          });

        syncResults.push({
          initiative_id: initiative.id,
          title: initiative.title,
          progress: progressPercentage,
          issues: totalIssues,
          prs: prs.length,
        });
      } catch (error: any) {
        console.error(`Error syncing initiative ${initiative.id}:`, error);
        await supabaseAdmin
          .from('cto_github_sync_log')
          .insert({
            initiative_id: initiative.id,
            sync_type: 'full',
            sync_status: 'failed',
            error_message: error.message,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncResults.length,
        results: syncResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error syncing GitHub roadmap:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


