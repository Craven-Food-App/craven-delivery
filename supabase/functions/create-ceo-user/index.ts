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

    const ceoEmail = 'tstroman.ceo@cravenusa.com';
    const ceoPassword = Deno.env.get('CEO_DEFAULT_PASSWORD') || 'TempPassword123!';
    const ceoFirstName = 'Torrance';
    const ceoLastName = 'Stroman';
    const ceoFullName = `${ceoFirstName} ${ceoLastName}`;

    console.log(`Creating CEO user: ${ceoEmail}`);

    // Check if user already exists - try multiple methods
    let userId: string | null = null;
    let userCreated = false;
    
    // Method 1: Try listUsers to find user
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users) {
        const foundUser = users.find(u => u.email?.toLowerCase() === ceoEmail.toLowerCase());
        if (foundUser) {
          userId = foundUser.id;
          console.log(`CEO user found via listUsers: ${userId}`);
        }
      }
    } catch (err: any) {
      console.log('listUsers failed, will try to create user');
    }
    
    // Method 2: If not found, search in listUsers
    if (!userId) {
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users) {
          const foundUser = users.find(u => u.email?.toLowerCase() === ceoEmail.toLowerCase());
          if (foundUser) {
            userId = foundUser.id;
            console.log(`CEO user found via listUsers: ${userId}`);
          }
        }
      } catch (err: any) {
        console.error('Error listing users:', err);
      }
    }

    // Method 3: If still not found, try to create user
    if (!userId) {
      console.log('User not found, creating new user...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: ceoEmail,
        password: ceoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: ceoFullName,
          first_name: ceoFirstName,
          last_name: ceoLastName,
        },
      });

      if (authError) {
        // If user already exists error, search again
        if (authError.message?.includes('already registered') || 
            authError.message?.includes('already exists') ||
            authError.message?.includes('User already registered')) {
          console.log('User creation failed - already exists, searching for user...');
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const foundUser = users?.find(u => u.email?.toLowerCase() === ceoEmail.toLowerCase());
          
          if (foundUser) {
            userId = foundUser.id;
            console.log(`Found existing CEO user after creation attempt: ${userId}`);
          } else {
            console.error('Error: User creation failed and user not found in list');
            return new Response(
              JSON.stringify({ error: `Failed to create or find CEO user: ${authError.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('Error creating CEO user:', authError);
          return new Response(
            JSON.stringify({ error: `Failed to create CEO user: ${authError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        userId = authData.user.id;
        userCreated = true;
        console.log(`CEO user created successfully: ${userId}`);
      }
    } else {
      // User exists, update password and metadata
      console.log(`Updating existing CEO user: ${userId}`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: ceoPassword,
        user_metadata: {
          full_name: ceoFullName,
          first_name: ceoFirstName,
          last_name: ceoLastName,
        },
      });
      
      if (updateError) {
        console.error('Error updating CEO user:', updateError);
        // Continue anyway - user exists, just couldn't update password
      } else {
        console.log('CEO user password and metadata updated');
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Could not find or create CEO user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure user_profiles record exists
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        full_name: ceoFullName,
        email: ceoEmail,
        role: 'admin',
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error upserting user_profiles:', profileError);
    } else {
      console.log('User profile created/updated');
    }

    // Ensure exec_users record exists
    const { error: execError } = await supabaseAdmin
      .from('exec_users')
      .upsert({
        user_id: userId,
        role: 'ceo',
        access_level: 1,
        title: 'Founder & Chief Executive Officer',
        department: 'Executive',
        approved_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (execError) {
      console.error('Error upserting exec_users:', execError);
    } else {
      console.log('Executive user record created/updated');
    }

    // Ensure user_roles record exists for company portal
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'executive',
      }, {
        onConflict: 'user_id,role',
      });

    if (roleError) {
      console.error('Error upserting user_roles:', roleError);
    } else {
      console.log('User role created/updated');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: userCreated ? 'CEO user created successfully' : 'CEO user already exists, updated',
        userId: userId,
        email: ceoEmail,
        password: ceoPassword,
        userCreated: userCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-ceo-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

