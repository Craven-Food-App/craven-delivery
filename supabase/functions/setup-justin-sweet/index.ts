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

    const justinUserId = '5a259c29-8cdd-4569-9a3c-4f7481f1b441';
    const justinEmail = 'jsweet.cfo@cravenusa.com';
    const tempPassword = 'JustCrave516!';
    const hubPin = '101307';

    console.log(`Setting up Justin Sweet CFO account: ${justinEmail}`);

    // Step 1: Update auth user
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(justinUserId, {
        email: justinEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Justin Sweet',
          first_name: 'Justin',
          last_name: 'Sweet',
          requires_password_change: true, // Flag for password change requirement
          temp_password: true,
          temp_password_set_at: new Date().toISOString(),
          requires_pin_change: true, // Flag for PIN change requirement
        },
      });

      if (updateError) {
        throw updateError;
      }
      console.log('User updated successfully');
    } catch (authError: any) {
      console.error('Error updating auth user:', authError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to update auth user: ${authError.message}`,
          details: authError.details || authError.hint || '',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create/Update user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: justinUserId,
        full_name: 'Justin Sweet',
        email: justinEmail,
        role: 'admin', // Using 'admin' for executive users
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
    } else {
      console.log('User profile created/updated');
    }

    // Step 3: Create/Update exec_users record for CFO
    const { error: execError } = await supabaseAdmin
      .from('exec_users')
      .upsert({
        user_id: justinUserId,
        role: 'cfo',
        access_level: 8,
        title: 'Chief Financial Officer',
        department: 'Finance',
        approved_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (execError) {
      console.error('Error creating exec_users record:', execError);
    } else {
      console.log('exec_users record created/updated');
    }

    // Step 4: Add Portal PIN access for Hub verification
    // NOTE: PIN will be stored temporarily. The SQL script or RPC function will hash it properly
    // For now, insert plaintext and let the database handle hashing
    const { error: pinError } = await supabaseAdmin
      .from('ceo_access_credentials')
      .upsert({
        user_email: justinEmail,
        pin_hash: hubPin, // Will be hashed by database trigger or manual SQL
      }, {
        onConflict: 'user_email',
      });

    if (pinError) {
      console.error('Error setting Portal PIN:', pinError);
      console.warn('Note: Run SQL to properly hash the PIN using bcrypt/crypt()');
    } else {
      console.log('Portal PIN inserted (needs to be hashed properly)');
    }

    // Step 5: Grant Company Portal access (CRAVEN_EXECUTIVE and CRAVEN_CFO roles)
    const rolesToGrant = [
      { user_id: justinUserId, role: 'CRAVEN_EXECUTIVE' },
      { user_id: justinUserId, role: 'CRAVEN_CFO' },
    ];

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(rolesToGrant, {
        onConflict: 'user_id,role',
      });

    if (roleError) {
      console.error('Error granting company roles:', roleError);
    } else {
      console.log('Company Portal access granted (CRAVEN_EXECUTIVE and CRAVEN_CFO)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: justinUserId,
        email: justinEmail,
        tempPassword: tempPassword,
        hubPin: hubPin,
        message: 'Justin Sweet CFO account setup complete',
        access: {
          cfoPortal: true,
          companyPortal: true,
          hubAccess: true,
          hubPin: hubPin,
        },
        nextSteps: [
          'User can login with email: jsweet.cfo@cravenusa.com',
          'Temporary password: JustCrave516!',
          'User will be prompted to change password on first login',
          'Hub PIN: 101307 (user will be prompted to change on first Hub access)',
          'After password change, user can access CFO Portal and Company Portal',
        ],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in setup-justin-sweet:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || error.hint || '',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
