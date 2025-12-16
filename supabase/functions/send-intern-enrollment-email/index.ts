import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentEmailPayload {
  intern_email: string;
  intern_name: string;
  track: string;
  start_date: string;
  engagement_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: EnrollmentEmailPayload = await req.json();

    const { intern_email, intern_name, track, start_date, engagement_id } = payload;

    if (!intern_email || !intern_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: intern_email, intern_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get portal URL
    const portalUrl = Deno.env.get("PUBLIC_APP_URL") || "https://app.cravenusa.com";

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to the Intern Program</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff7a45 0%, #ff9a56 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to the Intern Program!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${intern_name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Congratulations! You have been successfully enrolled in the Crave'n Intern Program.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="font-size: 18px; margin-top: 0; color: #111827;">Your Program Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Track:</td>
                  <td style="padding: 8px 0; color: #111827;">${track}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Start Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${new Date(start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Engagement ID:</td>
                  <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 12px;">${engagement_id}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You now have access to the Intern Portal where you can:
            </p>
            
            <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
              <li>View your assigned test modules</li>
              <li>Track your progress toward promotion</li>
              <li>Access onboarding materials</li>
              <li>View your performance reviews</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}/intern" style="display: inline-block; background: #ff7a45; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Access Intern Portal
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If you have any questions, please contact your program manager or the Intern Program Admin.
            </p>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
              Welcome aboard!<br>
              The Crave'n Intern Program Team
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Supabase
    const { data, error } = await supabaseClient.functions.invoke("send-notification", {
      body: {
        to: intern_email,
        subject: "Welcome to the Crave'n Intern Program",
        html: emailHtml,
        type: "intern_enrollment",
      },
    });

    if (error) {
      console.error("Failed to send email:", error);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Enrollment email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending enrollment email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


