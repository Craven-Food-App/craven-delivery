// Edge Function: tester-activate-test-user
// Admin function to create test user and activate enrollment for testing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate short referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
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

    const { enrollment_id, email } = await req.json();

    if (!enrollment_id || !email) {
      return new Response(
        JSON.stringify({ error: 'enrollment_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find enrollment
    const { data: enrollment, error: findError } = await supabaseAdmin
      .from('android_tester_enrollments')
      .select('*')
      .eq('id', enrollment_id)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (findError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'enrollment_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (enrollment.user_id) {
      return new Response(
        JSON.stringify({
          success: true,
          user_id: enrollment.user_id,
          message: 'Already activated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = users?.find(u => u.email === email.trim().toLowerCase());

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create test user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: enrollment.full_name,
          test_user: true
        }
      });

      if (createError) throw createError;
      userId = newUser.user.id;
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
    const deadlineAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('android_tester_enrollments')
      .update({
        user_id: userId,
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
        user_id: userId,
        status: 'activated',
        deadline_at: deadlineAt,
        referral_code: referralCode,
        message: 'Test user created and enrollment activated'
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

