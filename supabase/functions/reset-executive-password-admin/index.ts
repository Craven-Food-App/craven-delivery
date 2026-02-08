import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

interface ResetPasswordRequest {
  email: string;
  resetBy?: string; // Email of the person resetting (CEO)
}

// Generate a random temporary password
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each required type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special char
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetBy }: ResetPasswordRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    console.log(`Resetting password for ${email}...`);

    // Find the user by email
    let userFound = null;
    let page = 0;
    const pageSize = 1000;

    while (!userFound) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });

      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      if (!users || users.users.length === 0) {
        break; // No more users
      }

      userFound = users.users.find(u => u.email === email);

      if (userFound) {
        break;
      }

      // If we got fewer users than pageSize, we've reached the end
      if (users.users.length < pageSize) {
        break;
      }

      page++;
    }

    if (!userFound) {
      return new Response(
        JSON.stringify({ error: `User with email ${email} not found` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a password recovery link pointing to production executive profile
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://cravenusa.com';
    const redirectUrl = `${baseUrl}/executive-profile?reset=true`;
    
    const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (recoveryError) {
      throw new Error(`Failed to generate recovery link: ${recoveryError.message}`);
    }

    // Update user metadata to track the reset
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userFound.id,
      {
        user_metadata: {
          ...userFound.user_metadata,
          temp_password: true,
          temp_password_set_at: new Date().toISOString(),
          temp_password_reset_by: resetBy || 'admin',
        }
      }
    );

    if (updateError) {
      console.warn(`Failed to update user metadata: ${updateError.message}`);
    }

    console.log(`Recovery link generated for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email,
        recoveryLink: recoveryData.properties.action_link,
        message: "Password recovery link generated. Email will be sent automatically.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

