import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface CreateExecutiveUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  role: 'ceo' | 'cfo' | 'coo' | 'cto' | 'board_member';
  password?: string; // Optional - will generate if not provided
  employeeId?: string; // Optional - employee ID to link after creation
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Service role key for admin operations
    );

    const requestBody: CreateExecutiveUserRequest = await req.json();
    const { firstName, lastName, email, position, department, role, password, employeeId } = requestBody;

    // Generate a temporary password if not provided
    const tempPassword = password || (Math.random().toString(36).slice(2, 10) + 'A1!' + Math.random().toString(36).slice(2, 6).toUpperCase());

    // Create auth user
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for executives
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        position: position,
        department: department
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    // Create exec_users record
    const { data: execUser, error: execError } = await supabaseClient
      .from('exec_users')
      .insert({
        user_id: authData.user.id,
        role: role,
        access_level: 2, // Executive level
        title: position,
        department: department,
        approved_by: null, // CEO/board approved
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) {
      console.error('Error creating exec_users:', execError);
      // Clean up auth user if exec_users creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw execError;
    }

    // Link employee record if employee_id is provided
    // This allows the function to be used for existing employees
    if (employeeId) {
      const { error: linkError } = await supabaseClient
        .from('employees')
        .update({ user_id: authData.user.id })
        .eq('id', employeeId);
      
      if (linkError) {
        console.error('Error linking employee:', linkError);
        // Don't fail - employee can be linked manually
      }
    }

    console.log("Executive user created successfully:", execUser);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        execUserId: execUser.id,
        tempPassword: tempPassword // Send password for emailing
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating executive user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

