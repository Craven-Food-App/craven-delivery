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

    console.log('🔗 Checking initiative dependencies...');

    // Get all dependencies with blocking enabled
    const { data: dependencies, error: depError } = await supabaseAdmin
      .from('cto_roadmap_dependencies')
      .select(`
        *,
        dependent:cto_roadmap_initiatives!dependent_initiative_id(*),
        depends_on:cto_roadmap_initiatives!depends_on_initiative_id(*)
      `)
      .eq('is_blocking', true)
      .eq('auto_block_enabled', true);

    if (depError) throw depError;

    const blockedInitiatives: any[] = [];
    const unblockedInitiatives: any[] = [];

    for (const dep of dependencies || []) {
      const dependent = Array.isArray(dep.dependent) ? dep.dependent[0] : dep.dependent;
      const dependsOn = Array.isArray(dep.depends_on) ? dep.depends_on[0] : dep.depends_on;

      if (!dependent || !dependsOn) continue;

      // Check if dependency is met
      let dependencyMet = false;

      if (dep.required_milestone) {
        // Check if specific milestone is completed
        const { data: milestone } = await supabaseAdmin
          .from('cto_roadmap_milestones')
          .select('*')
          .eq('initiative_id', dependsOn.id)
          .eq('title', dep.required_milestone)
          .eq('status', 'completed')
          .maybeSingle();

        dependencyMet = !!milestone;
      } else {
        // Check if entire initiative is completed
        dependencyMet = dependsOn.status === 'completed';
      }

      // Block or unblock dependent initiative
      if (!dependencyMet && dependent.status !== 'blocked') {
        // Block the dependent initiative
        await supabaseAdmin
          .from('cto_roadmap_initiatives')
          .update({
            status: 'blocked',
            health_score: 'blocked',
          })
          .eq('id', dependent.id);

        await supabaseAdmin
          .from('cto_roadmap_dependencies')
          .update({
            blocked_at: new Date().toISOString(),
          })
          .eq('id', dep.id);

        blockedInitiatives.push({
          initiative_id: dependent.id,
          title: dependent.title,
          blocked_by: dependsOn.title,
          reason: dep.required_milestone 
            ? `Waiting for milestone "${dep.required_milestone}" in "${dependsOn.title}"`
            : `Waiting for "${dependsOn.title}" to complete`,
        });
      } else if (dependencyMet && dependent.status === 'blocked') {
        // Unblock the dependent initiative
        await supabaseAdmin
          .from('cto_roadmap_initiatives')
          .update({
            status: 'in-progress',
            health_score: 'on_track',
          })
          .eq('id', dependent.id);

        await supabaseAdmin
          .from('cto_roadmap_dependencies')
          .update({
            unblocked_at: new Date().toISOString(),
          })
          .eq('id', dep.id);

        unblockedInitiatives.push({
          initiative_id: dependent.id,
          title: dependent.title,
          unblocked_by: dependsOn.title,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocked: blockedInitiatives.length,
        unblocked: unblockedInitiatives.length,
        blocked_initiatives: blockedInitiatives,
        unblocked_initiatives: unblockedInitiatives,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error checking dependencies:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

