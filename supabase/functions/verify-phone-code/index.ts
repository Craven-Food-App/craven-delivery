import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';

import { getCorsHeaders } from '../_shared/cors.ts';
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:5173",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Rate limiting for phone verification (3 per hour)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.PHONE_VERIFY);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: rateLimitResult.message || 'Too many verification attempts',
        resetIn: rateLimitResult.resetIn 
      }),
      { 
        status: 429, 
        headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
      }
    );
  }

  try {
    const { phone, code, email, step } = await req.json();

    if (!phone || !code || !email) {
      return new Response(
        JSON.stringify({ error: "Phone, code, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase client already initialized for rate limiting above

    // Step 1: Verify last 4 digits of phone number
    if (!step || step === 1) {
      const phoneDigits = phone.replace(/\D/g, '');
      const last4Digits = phoneDigits.slice(-4);

      // Verify the code matches the last 4 digits
      if (code !== last4Digits) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            step: 1,
            error: "Invalid verification code. Please enter the code from your email." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the verification record for step 1
      // Try with step column first, fallback to without if column doesn't exist
      let { data: verification, error: findError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("email", email)
        .eq("code", last4Digits)
        .eq("step", 1)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // If step column doesn't exist, retry without it
      if (findError && (findError.message?.includes("step") || findError.code === "42703" || findError.code === "PGRST116")) {
        console.log("Step column not found, querying without step filter");
        const retryResult = await supabase
          .from("phone_verifications")
          .select("*")
          .eq("phone", phone)
          .eq("email", email)
          .eq("code", last4Digits)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        verification = retryResult.data;
        findError = retryResult.error;
      }

      if (findError || !verification) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            step: 1,
            error: "Invalid or expired verification code" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark step 1 as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      // Generate 6-digit code for step 2
      const sixDigitCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Insert step 2 verification record
      let step2InsertData: any = {
        phone,
        email,
        code: sixDigitCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      };

      // Try to add step column (may not exist if migration hasn't run)
      step2InsertData.step = 2;

      let { error: step2Error } = await supabase
        .from("phone_verifications")
        .insert(step2InsertData);

      // If step column error, try without it
      if (step2Error && (step2Error.message?.includes("step") || step2Error.code === "42703")) {
        console.log("Step column not found, inserting without step field");
        const retryResult = await supabase
          .from("phone_verifications")
          .insert({
            phone,
            email,
            code: sixDigitCode,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });
        step2Error = retryResult.error;
      }

      if (step2Error) {
        console.error("Error creating step 2 verification:", step2Error);
        throw step2Error;
      }

      // Send step 2 email with 6-digit code
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'n <onboarding@resend.dev>";

      const step2EmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Final Verification Code</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Great! You've verified your phone number. Now enter this final verification code to complete your signup.
                      </p>
                      
                      <div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 30px; margin: 30px 0; border-radius: 4px; text-align: center;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                          Your 6-digit verification code:
                        </p>
                        <div style="background-color: #ffffff; border: 2px solid #ff6b00; border-radius: 8px; padding: 20px; margin: 15px 0; display: inline-block;">
                          <p style="margin: 0; color: #ff6b00; font-size: 48px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; line-height: 1.2;">
                            ${sixDigitCode}
                          </p>
                        </div>
                      </div>
                      
                      <p style="margin: 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                        Return to the verification page and enter this 6-digit code to complete your signup.
                      </p>
                      
                      <p style="margin: 30px 0 0 0; color: #898989; font-size: 12px; line-height: 1.6;">
                        This code expires in 10 minutes. If you didn't request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0; color: #898989; font-size: 12px;">
                        © ${new Date().getFullYear()} Crave'n. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: `Your Final Verification Code: ${sixDigitCode} - Crave'n`,
          html: step2EmailHtml,
        });

        console.log(`Step 2 verification email sent to ${email} with code ${sixDigitCode}`);

        return new Response(
          JSON.stringify({ 
            verified: true, 
            step: 1,
            nextStep: 2,
            message: "Phone number verified! Check your email for the 6-digit code." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailError: any) {
        console.error("Error sending step 2 email:", emailError);
        // Still return success for step 1, but log the error
        return new Response(
          JSON.stringify({ 
            verified: true, 
            step: 1,
            nextStep: 2,
            message: "Phone number verified! Check your email for the 6-digit code.",
            warning: "Email may have failed to send. Please check logs."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Verify 6-digit code
    if (step === 2) {
      // Find the verification record for step 2
      let { data: verification, error: findError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("email", email)
        .eq("code", code)
        .eq("step", 2)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // If step column doesn't exist, retry without it
      if (findError && (findError.message?.includes("step") || findError.code === "42703" || findError.code === "PGRST116")) {
        console.log("Step column not found, querying without step filter");
        const retryResult = await supabase
          .from("phone_verifications")
          .select("*")
          .eq("phone", phone)
          .eq("email", email)
          .eq("code", code)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        verification = retryResult.data;
        findError = retryResult.error;
      }

      if (findError || !verification) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            step: 2,
            error: "Invalid or expired verification code. Please enter the 6-digit code from your email." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark step 2 as verified
      const { error: updateError } = await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          verified: true, 
          step: 2,
          message: "Phone number verified successfully!" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ verified: false, error: "Invalid step parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error verifying code:", error);
    return new Response(
      JSON.stringify({ verified: false, error: error.message || "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
