// Edge Function: check-driver-onboarding-completion
// Checks if driver onboarding is completed and updates tester_referrals

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = {
  ...getCorsHeaders(req.headers.get('origin')),
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

    // Check if driver application exists and onboarding is completed
    const { data: application } = await supabaseAdmin
      .from('craver_applications')
      .select('id, onboarding_completed_at, status')
      .eq('user_id', user_id)
      .not('onboarding_completed_at', 'is', null)
      .maybeSingle();

    if (!application || !application.onboarding_completed_at) {
      return new Response(
        JSON.stringify({
          completed: false,
          message: 'Driver onboarding not completed yet'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update tester_referrals status to completed
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('tester_referrals')
      .update({
        status: 'completed',
        completed_at: application.onboarding_completed_at,
        updated_at: new Date().toISOString()
      })
      .eq('referrer_user_id', user_id)
      .eq('referral_type', 'driver')
      .in('status', ['started', 'invited'])
      .select()
      .maybeSingle();

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('Referral update error:', referralError);
    }

    // Trigger evaluation to issue Tier C reward if referral was updated
    if (referral) {
      try {
        await supabaseAdmin.functions.invoke('tester-evaluate-and-issue', {
          body: { user_id: user_id }
        });
      } catch (evalError) {
        console.error('Evaluation error:', evalError);
        // Non-fatal, continue
      }
    }

    return new Response(
      JSON.stringify({
        completed: true,
        onboarding_completed_at: application.onboarding_completed_at,
        referral_updated: !!referral
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

