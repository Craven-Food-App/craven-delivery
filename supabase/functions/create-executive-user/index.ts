import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateExecutiveUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  role: 'ceo' | 'cfo' | 'coo' | 'cto' | 'board_member';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Service role key for admin operations
    );

    const { firstName, lastName, email, position, department, role }: CreateExecutiveUserRequest = await req.json();

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!';

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

