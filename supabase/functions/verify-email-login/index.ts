import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, code } = await req.json();

    console.log(`[verify-email-login] Received request for email: ${email}, code: ${code}`);

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the 6-digit code from phone_verifications table
    // Try with step column first (matches what send-email-verification-code creates)
    let verification: any = null;
    let findError: any = null;
    
    // First try with step = 2 filter
    const resultWithStep = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("step", 2)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    verification = resultWithStep.data;
    findError = resultWithStep.error;

    console.log(`[verify-email-login] Step 2 query result:`, { verification: !!verification, error: findError?.code });

    // If step column doesn't exist (PGRST116 is no rows, 42703 is column not found), retry without step filter
    if (findError && (findError.code === "42703" || findError.message?.includes("step"))) {
      console.log("[verify-email-login] Step column not found, querying without step filter");
      const retryResult = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      verification = retryResult.data;
      findError = retryResult.error;
      console.log(`[verify-email-login] Retry query result:`, { verification: !!verification, error: findError?.code });
    }

    // PGRST116 means no rows found - that's a valid "not found" case
    if (findError && findError.code !== "PGRST116") {
      console.error("[verify-email-login] Database error:", findError);
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: "Error verifying code. Please try again." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verification) {
      console.log("[verify-email-login] No valid verification found");
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: "Invalid or expired verification code. Please enter the 6-digit code from your email." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-email-login] Found verification record: ${verification.id}`);

    // Mark verification as used
    const { error: updateError } = await supabase
      .from("phone_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    if (updateError) {
      console.error("[verify-email-login] Error updating verification:", updateError);
      // Continue anyway - verification was valid
    }

    // Get user by email using listUsers
    console.log("[verify-email-login] Looking up user by email...");
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("[verify-email-login] Error listing users:", usersError);
      return new Response(
        JSON.stringify({ error: "Error finding user. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const user = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log("[verify-email-login] User not found for email:", email);
      return new Response(
        JSON.stringify({ error: "No account found with this email. Please apply to become a feeder first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-email-login] Found user: ${user.id}`);

    // Generate sign-in link
    const redirectUrl = `${origin || 'https://cravenusa.com'}/mobile`;
    console.log(`[verify-email-login] Generating magic link with redirect: ${redirectUrl}`);
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("[verify-email-login] Error generating sign-in link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to create session. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signInLink = linkData?.properties?.action_link;
    
    if (!signInLink) {
      console.error("[verify-email-login] No action_link in linkData:", JSON.stringify(linkData));
      return new Response(
        JSON.stringify({ error: "Failed to generate sign-in link. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-email-login] Successfully generated sign-in link");

    return new Response(
      JSON.stringify({ 
        verified: true,
        signInLink: signInLink,
        user: { id: user.id, email: user.email },
        message: "Code verified successfully. Signing you in..."
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("[verify-email-login] Unhandled error:", error);
    console.error("[verify-email-login] Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error.message || "Failed to verify code"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
