// Edge Function: tester-activate
// Called when user creates account - links enrollment to user_id and generates referral code

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Generate short referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  // Get CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
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

    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'user_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find enrollment by email
    const { data: enrollment, error: findError } = await supabaseAdmin
      .from('android_tester_enrollments')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (findError || !enrollment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'enrollment_not_found',
          message: 'No enrollment found for this email'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('android_tester_enrollments')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      
      if (!existing) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    // Update enrollment
    const activatedAt = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('android_tester_enrollments')
      .update({
        user_id: user_id,
        status: 'activated',
        activated_at: activatedAt,
        deadline_at: deadlineAt,
        referral_code: referralCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Activation error:', updateError);
      return new Response(
        JSON.stringify({ error: 'failed to activate enrollment', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'activated',
        deadline_at: deadlineAt,
        referral_code: referralCode,
        message: 'Enrollment activated. Complete tasks to earn rewards.'
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

