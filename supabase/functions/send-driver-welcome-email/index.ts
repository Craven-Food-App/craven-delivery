import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

import { getCorsHeaders } from '../_shared/cors.ts';
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface DriverWelcomeEmailRequest {
  driverName: string;
  driverEmail: string;
  isBackgroundCheckApproval?: boolean;
  presetPassword?: string;
  isNewSignup?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverName, driverEmail, isBackgroundCheckApproval, presetPassword, isNewSignup }: DriverWelcomeEmailRequest = await req.json();

    console.log(`Sending driver ${isBackgroundCheckApproval ? 'background check approval' : isNewSignup ? 'new signup welcome' : 'welcome'} email to ${driverEmail}`);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'n <onboarding@resend.dev>";

    // Different email content based on type
    let subject: string;
    let headerTitle: string;
    let mainMessage: string;
    let passwordSection = '';
    const isAccountSetup = Boolean(isNewSignup && presetPassword);

    if (isAccountSetup) {
      subject = "Your Crave'n Feeder Account Is Ready";
      headerTitle = "Account Created";
      mainMessage = "Your Feeder account has been created. Continue the application in your browser to submit your information. Your account is not waitlisted or approved until the application is completed.";
      passwordSection = `
        <div style="background-color: #fff5ec; border: 2px solid #ff6b00; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
          <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 20px; font-weight: bold;">Your Login Credentials</h3>
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
            Important: You will be required to change this password when you log in for the first time.
          </p>
        </div>
      `;
    } else if (isBackgroundCheckApproval) {
      subject = "🎉 You're Cleared to Drive with Crave'n!";
      headerTitle = "Background Check Complete!";
      mainMessage = "Excellent news! Your background check has been completed and you're cleared to drive with Crave'n. 🚗✨";
    } else {
      subject = "🎉 You're Approved! Complete Your Onboarding";
      headerTitle = "Congratulations!";
      mainMessage = "Great news! Your application to become a Crave'n driver has been <strong>approved</strong>. Welcome to the team! 🚗🍔";
    }

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [driverEmail],
      subject: subject,
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
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">${headerTitle}</h1>
                        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">
                          ${isAccountSetup ? 'Continue Your Application' : "You're Cleared to Drive!"}
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Hi ${driverName}!</h2>
                        
                        <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                          ${mainMessage}
                        </p>
                        
                        ${passwordSection}
                        
                        ${isAccountSetup ? '' : `
                        <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #2e7d32; font-size: 18px;">💵 First Delivery Bonus</h3>
                          <p style="margin: 0; color: #2e7d32; font-size: 15px; line-height: 1.6;">
                            Earn an extra <strong>$25</strong> when you complete your first delivery!
                          </p>
                        </div>
                        `}
                        
                        <div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px;">What's Next?</h3>
                          ${isAccountSetup ? `
                          <p style="margin: 0 0 15px 0; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            Return to the application already open in your browser and complete every step.
                          </p>
                          <ol style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            <li>Finish entering your application information</li>
                            <li>Review and submit the application</li>
                            <li>Wait for the Application Submitted screen</li>
                            <li>Then check your email for the waitlist confirmation</li>
                          </ol>
                          ` : `
                          <p style="margin: 0 0 15px 0; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            Complete a quick 10-15 minute onboarding process to get started:
                          </p>
                          <ol style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            <li>Watch a short orientation video</li>
                            <li>Pass a simple safety quiz</li>
                            <li>Complete your W-9 tax form</li>
                            <li>Set up your payout method</li>
                            <li>Review the test delivery process</li>
                          </ol>
                          `}
                        </div>
                        
                        <div style="text-align: center; margin: 40px 0 30px 0;">
                          <a href="https://www.cravenusa.com/driver-onboarding/apply"
                             style="display: inline-block; background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);">
                            ${isAccountSetup ? 'Continue Application' : 'Start Onboarding Now'} →
                          </a>
                        </div>
                        
                        ${isAccountSetup ? `
                        <div style="background-color: #fff8e1; border: 1px solid #f5c26b; padding: 15px; border-radius: 6px; margin: 20px 0;">
                          <p style="margin: 0; color: #7a4a00; font-size: 14px; line-height: 1.6;">
                            <strong>Do not see this email in your inbox?</strong> Check your Spam or Junk folder.
                          </p>
                        </div>
                        ` : `
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">📊 Quick Stats</h3>
                          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                            <li>Average earnings: <strong>$15-$25/hour</strong></li>
                            <li>Daily automatic payouts available</li>
                            <li>Flexible schedule - work when you want</li>
                            <li>24/7 support for drivers</li>
                          </ul>
                        </div>
                        
                        <div style="background-color: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 6px; margin: 20px 0;">
                          <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;">
                            <strong>⏱️ Important:</strong> Complete your onboarding within the next 7 days to maintain your approval status and claim your first delivery bonus!
                          </p>
                        </div>
                        `}
                        
                        <p style="margin: 30px 0 0 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                          Questions? Reply to this email or check out our <a href="https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com/driver-guide" style="color: #ff6b00; text-decoration: none;">Driver Guide</a>.
                        </p>
                        
                        <p style="margin: 20px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                          ${isAccountSetup ? 'Continue your application when ready.' : 'Welcome aboard!'}<br>
                          <strong>The Crave'n Team</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
                            ${isAccountSetup ? 'Complete your application to continue' : 'Ready to Start Earning?'}
                          </p>
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
      `,
    });

    console.log("Driver welcome email sent successfully:", emailResponse);

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
    console.error("Error sending driver welcome email:", error);
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
