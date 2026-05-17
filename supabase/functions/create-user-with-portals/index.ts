import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  portals: {
    executive: boolean;
    board: boolean;
    hub: boolean;
    company: boolean;
  };
  executiveRole?: 'ceo' | 'cfo' | 'coo' | 'cto' | 'board_member' | 'advisor';
  executiveTitle?: string;
  executiveDepartment?: string;
  hubPin?: string;
  hubAccess?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const gate = await requireAdmin(req, ["admin", "ceo", "coo", "chro"]);
  if (!gate.ok) {
    return new Response(JSON.stringify({ error: gate.error }), {
      status: gate.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('create-user-with-portals function called');
  
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

    let body: CreateUserRequest;
    try {
      body = await req.json();
      console.log('Request body received:', { 
        email: body.email, 
        firstName: body.firstName, 
        lastName: body.lastName,
        executiveRole: body.executiveRole,
        portals: body.portals 
      });
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      email,
      firstName,
      lastName,
      password,
      portals,
      executiveRole,
      executiveTitle,
      executiveDepartment,
      hubPin,
      hubAccess,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      const missing = [];
      if (!email) missing.push('email');
      if (!firstName) missing.push('firstName');
      if (!lastName) missing.push('lastName');
      if (!password) missing.push('password');
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullName = `${firstName} ${lastName}`;

    // Step 1: Create auth user
    console.log(`Creating auth user for ${email}...`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm for admin-created accounts
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    let userId: string;
    let userWasExisting = false;
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      // Check if user already exists
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists') || authError.message?.includes('User already registered')) {
        // Try to get existing user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          userId = existingUser.id;
          userWasExisting = true;
          console.log(`User already exists, resetting password for existing user: ${userId}`);
          
          // Reset password for existing user
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            user_metadata: {
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
            },
          });
          
          if (updateError) {
            console.error('Error updating existing user password:', updateError);
            return new Response(
              JSON.stringify({ error: `Failed to update password for existing user: ${updateError.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.log(`Password reset successfully for existing user ${userId}`);
        } else {
          return new Response(
            JSON.stringify({ error: `User with email ${email} already exists but could not be retrieved. Please use a different email or update the existing user.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (authData?.user) {
      userId = authData.user.id;
      console.log(`Auth user created: ${userId}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user: no user returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create user profile
    console.log(`Creating user profile for ${userId}...`);
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        full_name: fullName,
        email: email,
        role: 'user', // Executive users are regular users with exec_users records
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't fail - profile might already exist
    }

    // Step 3: Create exec_users record (required for executive/board/company portal access)
    // All company portal users need an exec_users record
    if (!executiveRole) {
      return new Response(
        JSON.stringify({ error: 'executiveRole is required for company portal access' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating exec_users record for ${userId} with role ${executiveRole}...`);
    
    // Use SQL function for reliable insert/update (bypasses RLS with SECURITY DEFINER)
    try {
      const { data: execUserId, error: rpcError } = await supabaseAdmin.rpc('create_executive_user', {
        p_user_id: userId,
        p_role: executiveRole,
        p_title: executiveTitle || `${firstName} ${lastName}`,
        p_department: executiveDepartment || 'Executive',
        p_access_level: 2,
      });

      if (rpcError) {
        console.error('Error calling create_executive_user function:', rpcError);
        // Fallback to direct insert if function doesn't exist
        console.log('Falling back to direct insert...');
        const { error: insertError } = await supabaseAdmin
          .from('exec_users')
          .upsert({
            user_id: userId,
            role: executiveRole,
            access_level: 2,
            title: executiveTitle || `${firstName} ${lastName}`,
            department: executiveDepartment || 'Executive',
            approved_by: null,
            approved_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (insertError) {
          console.error('Error with direct insert:', insertError);
          return new Response(
            JSON.stringify({ 
              error: `Failed to create executive user record: ${insertError.message}`,
              details: insertError.details || insertError.hint || '',
              code: insertError.code || '',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log(`Successfully created/updated exec_users record: ${execUserId}`);
      }
    } catch (rpcErr: any) {
      console.error('Error in exec_users creation:', rpcErr);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create executive user record: ${rpcErr.message || String(rpcErr)}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create/update employees record if hub access
    if (portals.hub || hubAccess) {
      console.log(`Creating/updating employees record for ${userId}...`);
      
      // Check if employee record exists
      const { data: existingEmployee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({
            portal_access_granted: true,
            portal_pin: hubPin || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEmployee.id);

        if (updateError) {
          console.error('Error updating employee record:', updateError);
        }
      } else {
        // Create new employee record
        const { error: employeeError } = await supabaseAdmin
          .from('employees')
          .insert({
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            position: executiveTitle || 'Employee',
            department: executiveDepartment || 'General',
            portal_access_granted: true,
            portal_pin: hubPin || null,
            employment_status: 'active',
          });

        if (employeeError) {
          console.error('Error creating employee record:', employeeError);
          // Don't fail - employee record might not be required
        }
      }
    }

    // Step 5: Grant company portal access if needed
    if (portals.company) {
      console.log(`Granting company portal access to ${userId}...`);
      // Add company role (adjust based on your role naming convention)
      const { error: companyRoleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'CRAVEN_EXECUTIVE', // Adjust based on your role system
        }, {
          onConflict: 'user_id,role',
        });

      if (companyRoleError) {
        console.error('Error granting company role:', companyRoleError);
      }
    }

    console.log(`User creation completed successfully for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        email: email,
        message: 'User created. Send credentials via secure email; passwords are no longer returned in responses.',
        portals: portals,
        message: userWasExisting ? 'Existing user password updated successfully' : 'User account created successfully',
        userWasExisting: userWasExisting,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-user-with-portals:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    // Return detailed error information
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.details || error.hint || '',
        code: error.code || '',
        name: error.name || 'Error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

