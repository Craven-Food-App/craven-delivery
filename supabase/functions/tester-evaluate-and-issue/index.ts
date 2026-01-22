// Edge Function: tester-evaluate-and-issue
// Service role function - evaluates eligibility and issues credits

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('android_tester_enrollments')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (enrollError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'enrollment_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issuedTiers: string[] = [];
    const issuedCredits: any[] = [];

    // ============================================================================
    // TIER A EVALUATION
    // ============================================================================
    const { data: tierAExists } = await supabaseAdmin
      .from('tester_reward_issuances')
      .select('id')
      .eq('user_id', user_id)
      .eq('tier', 'tier_a')
      .maybeSingle();

    if (!tierAExists) {
      // Count activity days within deadline
      const { data: activityDays } = await supabaseAdmin
        .from('tester_activity_days')
        .select('activity_date')
        .eq('user_id', user_id)
        .gte('activity_date', enrollment.activated_at ? new Date(enrollment.activated_at).toISOString().split('T')[0] : '')
        .lte('activity_date', enrollment.deadline_at ? new Date(enrollment.deadline_at).toISOString().split('T')[0] : '');

      const distinctDays = new Set(activityDays?.map(d => d.activity_date) || []).size;

      // Count feedback events
      const { data: feedbackEvents } = await supabaseAdmin
        .from('tester_feedback_events')
        .select('prompt_key')
        .eq('user_id', user_id);

      const feedbackCount = new Set(feedbackEvents?.map(f => f.prompt_key) || []).size;

      // Check deadline
      const deadlinePassed = enrollment.deadline_at ? new Date(enrollment.deadline_at) < new Date() : false;

      // Tier A eligible?
      if (enrollment.status === 'activated' && distinctDays >= 3 && feedbackCount >= 2 && !deadlinePassed) {
        // Issue Tier A credit ($25 = 2500 cents)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

        const { data: creditGrant, error: grantError } = await supabaseAdmin
          .from('tester_credit_grants')
          .insert({
            user_id: user_id,
            enrollment_id: enrollment.id,
            grant_type: 'tier_a',
            credit_cents: 2500,
            expires_at: expiresAt
          })
          .select()
          .single();

        if (!grantError && creditGrant) {
          // Record issuance
          await supabaseAdmin
            .from('tester_reward_issuances')
            .insert({
              user_id: user_id,
              tier: 'tier_a',
              credit_grant_id: creditGrant.id
            });

          // Update enrollment status
          await supabaseAdmin
            .from('android_tester_enrollments')
            .update({ status: 'issued', updated_at: new Date().toISOString() })
            .eq('id', enrollment.id);

          issuedTiers.push('tier_a');
          issuedCredits.push({ tier: 'tier_a', amount_cents: 2500 });
        }
      }
    } else {
      issuedTiers.push('tier_a'); // Already issued
    }

    // ============================================================================
    // TIER B EVALUATION (requires Tier A + selected)
    // ============================================================================
    const { data: tierBExists } = await supabaseAdmin
      .from('tester_reward_issuances')
      .select('id')
      .eq('user_id', user_id)
      .eq('tier', 'tier_b')
      .maybeSingle();

    if (!tierBExists && issuedTiers.includes('tier_a') && enrollment.is_selected_tester) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: creditGrant, error: grantError } = await supabaseAdmin
        .from('tester_credit_grants')
        .insert({
          user_id: user_id,
          enrollment_id: enrollment.id,
          grant_type: 'tier_b',
          credit_cents: 5000, // $50
          expires_at: expiresAt
        })
        .select()
        .single();

      if (!grantError && creditGrant) {
        await supabaseAdmin
          .from('tester_reward_issuances')
          .insert({
            user_id: user_id,
            tier: 'tier_b',
            credit_grant_id: creditGrant.id
          });

        issuedTiers.push('tier_b');
        issuedCredits.push({ tier: 'tier_b', amount_cents: 5000 });
      }
    }

    // ============================================================================
    // TIER C EVALUATION (Option 2: driver OR merchant OR 2 customers)
    // ============================================================================
    const { data: tierCExists } = await supabaseAdmin
      .from('tester_reward_issuances')
      .select('id')
      .eq('user_id', user_id)
      .eq('tier', 'tier_c')
      .maybeSingle();

    if (!tierCExists && issuedTiers.includes('tier_a')) {
      // Check referrals
      const { data: referrals } = await supabaseAdmin
        .from('tester_referrals')
        .select('referral_type, status')
        .eq('referrer_user_id', user_id)
        .eq('status', 'completed');

      const driverCompleted = referrals?.some(r => r.referral_type === 'driver') || false;
      const merchantCompleted = referrals?.some(r => r.referral_type === 'merchant') || false;
      const customerCompleted = (referrals?.filter(r => r.referral_type === 'customer').length || 0) >= 2;

      if (driverCompleted || merchantCompleted || customerCompleted) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: creditGrant, error: grantError } = await supabaseAdmin
          .from('tester_credit_grants')
          .insert({
            user_id: user_id,
            enrollment_id: enrollment.id,
            grant_type: 'tier_c',
            credit_cents: 2500, // $25
            expires_at: expiresAt
          })
          .select()
          .single();

        if (!grantError && creditGrant) {
          await supabaseAdmin
            .from('tester_reward_issuances')
            .insert({
              user_id: user_id,
              tier: 'tier_c',
              credit_grant_id: creditGrant.id
            });

          issuedTiers.push('tier_c');
          issuedCredits.push({ tier: 'tier_c', amount_cents: 2500 });
        }
      }
    }

    // Get current progress for response
    const { data: progress } = await supabaseAdmin.rpc('get_tester_progress', { p_user_id: user_id });

    return new Response(
      JSON.stringify({
        success: true,
        issued_tiers: issuedTiers,
        issued_credits: issuedCredits,
        total_issued_cents: issuedCredits.reduce((sum, c) => sum + c.amount_cents, 0),
        progress: progress
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

