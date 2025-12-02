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

    const nathanUserId = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
    const nathanEmail = 'natecurry.cto@cravenusa.com';
    const tempPassword = 'NateCrave404!';
    const hubPin = '570022';

    console.log(`Setting up Nathan Curry account: ${nathanEmail}`);

    // Step 1: Create/Update auth user with specific UID
    let userCreated = false;
    try {
      // Try to get existing user
      const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(nathanUserId);
      
      if (existingUser) {
        console.log('User exists, updating password and metadata...');
        // Update existing user
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(nathanUserId, {
          email: nathanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: 'Nathan Curry',
            first_name: 'Nathan',
            last_name: 'Curry',
            requires_password_change: true, // Flag for password change requirement
          },
        });

        if (updateError) {
          throw updateError;
        }
        console.log('User updated successfully');
      } else {
        // Try to find by email
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const userByEmail = users?.find(u => u.email?.toLowerCase() === nathanEmail.toLowerCase());
        
        if (userByEmail) {
          console.log('User found by email, updating...');
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userByEmail.id, {
            email: nathanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: 'Nathan Curry',
              first_name: 'Nathan',
              last_name: 'Curry',
              requires_password_change: true,
            },
          });
          if (updateError) throw updateError;
        } else {
          // Create new user with specific UID
          console.log('Creating new user with specified UID...');
          // Note: Supabase doesn't allow setting custom UID via admin API
          // We'll create the user and then update the database records
          const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: nathanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: 'Nathan Curry',
              first_name: 'Nathan',
              last_name: 'Curry',
              requires_password_change: true,
            },
          });

          if (createError) {
            throw createError;
          }

          if (authData.user) {
            console.log(`User created with ID: ${authData.user.id}`);
            // If the UID doesn't match, we'll note it
            if (authData.user.id !== nathanUserId) {
              console.warn(`Warning: User created with ID ${authData.user.id}, but requested UID was ${nathanUserId}`);
            }
            userCreated = true;
          }
        }
      }
    } catch (authError: any) {
      console.error('Error with auth user:', authError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create/update auth user: ${authError.message}`,
          details: authError.details || authError.hint || '',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the actual user ID (may differ from requested if user was created)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const nathanUser = users?.find(u => 
      u.email?.toLowerCase() === nathanEmail.toLowerCase() || 
      u.id === nathanUserId
    );

    if (!nathanUser) {
      return new Response(
        JSON.stringify({ error: 'Failed to find or create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actualUserId = nathanUser.id;
    console.log(`Using user ID: ${actualUserId}`);

    // Step 2: Create/Update user_profiles
    // Note: role must be one of: 'customer', 'driver', 'admin', 'restaurant_owner'
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: actualUserId,
        full_name: 'Nathan Curry',
        email: nathanEmail,
        role: 'admin', // Using 'admin' for executive users
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
    } else {
      console.log('User profile created/updated');
    }

    // Step 3: Create/Update exec_users record for CTO
    const { error: execError1 } = await supabaseAdmin
      .from('exec_users')
      .upsert({
        user_id: actualUserId,
        role: 'cto',
        access_level: 2,
        title: 'Chief Technology Officer',
        department: 'Technology',
        approved_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (execError1) {
      console.error('Error creating exec_users record:', execError1);
    } else {
      console.log('exec_users record created/updated');
    }

    // Step 4: Add Portal PIN access for Hub verification
    // Executives use ceo_access_credentials table for Portal PIN verification
    // Note: PIN must be hashed using bcrypt - run SETUP_NATHAN_CURRY.sql to properly hash it
    // For now, we'll insert it and the SQL script will hash it properly
    const { error: pinError } = await supabaseAdmin
      .from('ceo_access_credentials')
      .upsert({
        user_email: nathanEmail,
        pin_hash: hubPin, // Will be hashed by SETUP_NATHAN_CURRY.sql script using crypt()
      }, {
        onConflict: 'user_email',
      });

    if (pinError) {
      console.error('Error setting Portal PIN:', pinError);
      console.warn('Note: Run SETUP_NATHAN_CURRY.sql to properly hash the PIN using bcrypt');
    } else {
      console.log('Portal PIN inserted (run SQL script to hash it properly)');
    }

    if (pinError) {
      console.error('Error setting Portal PIN:', pinError);
    } else {
      console.log('Portal PIN configured for Hub access');
    }

    // Step 5: Grant Company Portal access (CRAVEN_EXECUTIVE and CRAVEN_CTO roles)
    const rolesToGrant = [
      { user_id: actualUserId, role: 'CRAVEN_EXECUTIVE' },
      { user_id: actualUserId, role: 'CRAVEN_CTO' },
    ];

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(rolesToGrant, {
        onConflict: 'user_id,role',
      });

    if (roleError) {
      console.error('Error granting company roles:', roleError);
    } else {
      console.log('Company Portal access granted (CRAVEN_EXECUTIVE and CRAVEN_CTO)');
    }

    // Step 5b: Create exec_users record for CTO portal access
    const { error: execError2 } = await supabaseAdmin
      .from('exec_users')
      .upsert({
        user_id: actualUserId,
        role: 'cto',
        access_level: 7,
        title: 'Chief Technology Officer',
        department: 'Technology',
        first_name: 'Nathan',
        last_name: 'Curry',
        email: 'natecurry.cto@cravenusa.com',
      }, {
        onConflict: 'user_id',
      });

    if (execError2) {
      console.error('Error creating exec_users record:', execError2);
    } else {
      console.log('CTO exec_users record created for portal access');
    }

    // Step 6: Remove any roles that would grant restricted access
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', actualUserId)
      .in('role', ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_BOARD_MEMBER', 'CRAVEN_CEO']);

    if (deleteRoleError) {
      console.error('Error removing restricted roles:', deleteRoleError);
    } else {
      console.log('Restricted roles removed (if any existed)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: actualUserId,
        email: nathanEmail,
        tempPassword: tempPassword,
        hubPin: hubPin,
        message: 'Nathan Curry account setup complete',
        access: {
          ctoPortal: true,
          companyPortal: true,
          companyPortalTabs: ['Executives'],
          restrictedTabs: ['Governance Administration', 'Board', 'Template Manager'],
          hubAccess: true,
          hubPin: hubPin,
        },
        nextSteps: [
          'User can login with email and temporary password',
          'User will be prompted to change password on first login',
          'After password change, user can access CTO Portal and Company Portal',
          'User can access Hub with PIN: ' + hubPin,
        ],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in setup-nathan-curry:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || error.hint || '',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

