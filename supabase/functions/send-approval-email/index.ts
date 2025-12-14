import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

interface ApprovalEmailRequest {
  driverName: string;
  driverEmail: string;
  applicationId: string;
  presetPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverName, driverEmail, applicationId, presetPassword }: ApprovalEmailRequest = await req.json();

    console.log(`Sending approval email to ${driverEmail} for application ${applicationId}`);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";

    // Password section for email
    const passwordSection = presetPassword ? `
      <div style="background-color: #fff5ec; border: 2px solid #ff6b00; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 20px; font-weight: bold;">🔐 Your Login Credentials</h3>
        <p style="margin: 0 0 15px 0; color: #4a4a4a; font-size: 15px; line-height: 1.6;">
          Use these credentials to log in to your account:
        </p>
        <div style="background-color: #ffffff; border: 1px solid #ff6b00; border-radius: 6px; padding: 15px; margin: 15px 0;">
          <p style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">Email:</p>
          <p style="margin: 0 0 15px 0; color: #ff6b00; font-size: 16px; font-weight: bold; word-break: break-all;">${driverEmail}</p>
          <p style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">Temporary Password:</p>
          <p style="margin: 0; color: #ff6b00; font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px;">${presetPassword}</p>
        </div>
        <p style="margin: 15px 0 0 0; color: #d32f2f; font-size: 14px; font-weight: 600;">
          ⚠️ Important: You will be required to change this password when you log in for the first time.
        </p>
      </div>
    ` : '';

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [driverEmail],
      subject: "🎉 Your Crave'N Driver Application has been Approved!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header with Orange Banner -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Congratulations!</h1>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Welcome to the Crave'N Driver Team, ${driverName}!</h2>
                        
                        <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                          We're excited to inform you that your driver application has been <strong style="color: #ff6b00;">approved</strong>! You're now ready to start delivering with Crave'N.
                        </p>
                        
                        ${passwordSection}
                        
                        <div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px;">Next Steps:</h3>
                          <ol style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            <li>Log in to your Crave'N driver account</li>
                            <li>Complete your profile setup if needed</li>
                            <li>Review the driver guidelines and safety protocols</li>
                            <li>Go online and start accepting delivery requests!</li>
                          </ol>
                        </div>
                        
                        <div style="text-align: center; margin: 40px 0 30px 0;">
                          <a href="https://www.cravenusa.com/mobile" 
                             style="display: inline-block; background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);">
                            Access Driver Portal
                          </a>
                        </div>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">📱 Download the Crave'N Driver App</h3>
                          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            For the best experience, download our mobile app to manage deliveries on the go.
                          </p>
                        </div>
                        
                        <p style="margin: 30px 0 0 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                          If you have any questions or need assistance, our support team is here to help at <a href="mailto:support@craven.com" style="color: #ff6b00; text-decoration: none;">support@craven.com</a>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">Happy Delivering! 🚗💨</p>
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
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
