import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';

import { getCorsHeaders } from '../_shared/cors.ts';
import { validateRequest, phoneSchema, emailSchema } from '../_shared/validation.ts';
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  // Default allowed origins
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

const handler = async (req: Request): Promise<Response> => {
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
    // Validate request with Zod schema
    const phoneVerificationSchema = z.object({
      phone: z.string().min(10, "Phone number must be at least 10 digits"),
      email: emailSchema,
    });

    const validation = await validateRequest(phoneVerificationSchema, req);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: validation.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, email } = validation.data;

    // Supabase client already initialized for rate limiting above

    // Extract last 4 digits of phone number
    const phoneDigits = phone.replace(/\D/g, '');
    const last4Digits = phoneDigits.slice(-4);

    console.log(`Processing phone verification for ${email}`);
    console.log(`Phone: ${phone}, Phone digits: ${phoneDigits}, Last 4 digits: ${last4Digits}`);
    
    if (!last4Digits || last4Digits.length !== 4) {
      throw new Error(`Invalid phone number format. Could not extract 4 digits from: ${phone}`);
    }

    // Clean up old verifications for this phone/email or expired ones
    const now = new Date().toISOString();
    await supabase
      .from("phone_verifications")
      .delete()
      .or(`phone.eq.${phone},expires_at.lt.${now}`);

    // Insert verification record with last 4 digits as the code for step 1
    // Try with step column first, fallback to without if column doesn't exist
    let insertData: any = {
      phone,
      email,
      code: last4Digits,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    };

    // Try to add step column (may not exist if migration hasn't run)
    try {
      insertData.step = 1;
    } catch (e) {
      // Step column doesn't exist, continue without it
    }

    const { error: insertError } = await supabase
      .from("phone_verifications")
      .insert(insertData);

    if (insertError) {
      console.error("Database insert error:", insertError);
      // If step column error, try without it
      if (insertError.message?.includes("step") || insertError.code === "42703") {
        console.log("Step column not found, inserting without step field");
        const { error: retryError } = await supabase
          .from("phone_verifications")
          .insert({
            phone,
            email,
            code: last4Digits,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });
        if (retryError) {
          throw retryError;
        }
      } else {
        throw insertError;
      }
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";

    console.log(`Sending step 1 verification email to ${email} from ${fromEmail}`);

    const emailHtml = `
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
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Verify Your Phone Number</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      To complete your signup, please enter the verification code below in the verification modal.
                    </p>
                    
                    <div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 30px; margin: 30px 0; border-radius: 4px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                        Your verification code:
                      </p>
                      <div style="background-color: #ffffff; border: 2px solid #ff6b00; border-radius: 8px; padding: 20px; margin: 15px 0; display: inline-block;">
                        <p style="margin: 0; color: #ff6b00; font-size: 48px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; line-height: 1.2;">
                          ${last4Digits}
                        </p>
                      </div>
                      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                        (Last 4 digits of your phone number)
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                      Return to the verification page and enter this code to proceed to the next step.
                    </p>
                    
                    <p style="margin: 30px 0 0 0; color: #898989; font-size: 12px; line-height: 1.6;">
                      This verification code expires in 10 minutes. If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; color: #898989; font-size: 12px;">
                      © ${new Date().getFullYear()} Crave'N. All rights reserved.
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

    console.log(`Sending email with code: ${last4Digits}`);
    console.log(`Email HTML preview (first 500 chars): ${emailHtml.substring(0, 500)}`);

    // Verify the code is in the HTML before sending
    if (!emailHtml.includes(last4Digits)) {
      console.error(`ERROR: Code ${last4Digits} not found in email HTML!`);
      throw new Error(`Failed to include verification code in email template`);
    }

    let emailResponse;
    try {
      emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Your Phone Verification Code: ${last4Digits} - Crave'N`,
        html: emailHtml,
      });

      console.log("Step 1 verification email sent successfully:", emailResponse);
      console.log(`Email sent to ${email} with verification code: ${last4Digits}`);

      if (emailResponse.error) {
        console.error("Resend API error:", emailResponse.error);
        throw new Error(`Failed to send email: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
      }
    } catch (resendError: any) {
      console.error("Error calling Resend API:", resendError);
      throw new Error(`Failed to send verification email: ${resendError.message || resendError}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent. Please check your email and enter the code.",
        step: 1
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
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
