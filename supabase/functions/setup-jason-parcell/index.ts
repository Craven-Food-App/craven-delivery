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

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const jasonUserId = '06847119-d5e5-44dc-a5f4-6b3b677d9423';
    const jasonEmail = 'jparcell2022@gmail.com';
    const password = 'CPart419!';
    const hubPin = '800133';

    console.log(`Setting up Jason Parcell account: ${jasonEmail}`);

    // Step 1: Set password
    console.log('Setting password...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(jasonUserId, {
      password: password,
      email_confirm: true,
    });

    if (updateError) {
      throw new Error(`Failed to set password: ${updateError.message}`);
    }
    console.log('✓ Password set successfully');

    // Step 2: Upsert Hub PIN into ceo_access_credentials
    console.log('Setting Hub PIN...');
    const { error: pinError } = await supabaseAdmin
      .from('ceo_access_credentials')
      .upsert(
        {
          user_email: jasonEmail,
          pin_hash: hubPin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email' }
      );

    if (pinError) {
      throw new Error(`Failed to set Hub PIN: ${pinError.message}`);
    }
    console.log('✓ Hub PIN set successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Jason Parcell credentials configured',
        details: {
          email: jasonEmail,
          userId: jasonUserId,
          passwordSet: true,
          hubPinSet: true,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in setup-jason-parcell:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
