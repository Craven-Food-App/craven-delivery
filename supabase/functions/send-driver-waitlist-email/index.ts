import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

import { getCorsHeaders } from '../_shared/cors.ts';

interface WaitlistEmailRequest {
  driverName: string;
  driverEmail: string;
  city?: string;
  state?: string;
  waitlistPosition?: number;
  location?: string;
  emailType?: 'waitlist' | 'invitation' | 'activation';
  messageType?: 'waitlist' | 'invitation' | 'activation' | 'upcoming_activation'; // For backward compatibility
  presetPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client to fetch API key from database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch Resend API key from database
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      try {
        // Try admin_settings table with setting_key = 'resend_api_key'
        const { data: adminData, error: adminError } = await supabaseClient
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'resend_api_key')
          .maybeSingle();

        console.log('Admin settings query result:', { adminData, adminError });

          if (!adminError && adminData?.setting_value) {
            // Handle both string and JSONB formats
            // When stored as JSONB string like '"key"', Supabase returns it as a string
            // When stored as JSONB object like '{"key": "value"}', Supabase returns it as an object
            if (typeof adminData.setting_value === 'string') {
              // Remove quotes if it's a JSONB string (stored as '"value"')
              resendApiKey = adminData.setting_value.replace(/^"|"$/g, '');
            } else if (typeof adminData.setting_value === 'object' && adminData.setting_value !== null) {
              // JSONB object format - try common property names
              resendApiKey = adminData.setting_value.value || 
                           adminData.setting_value.api_key || 
                           adminData.setting_value.key ||
                           adminData.setting_value.resend_api_key ||
                           // If it's stored as a simple object with the key as the value
                           (Object.keys(adminData.setting_value).length === 1 
                             ? String(Object.values(adminData.setting_value)[0])
                             : null);
            }
            console.log('Extracted API key from database:', resendApiKey ? 'Found (length: ' + resendApiKey.length + ')' : 'Not found');
          } else {
          console.log('No admin settings found, trying marketing_settings...');
          // Try marketing_settings table as fallback
          const { data: marketingData, error: marketingError } = await supabaseClient
            .from('marketing_settings')
            .select('resend_api_key')
            .limit(1)
            .maybeSingle();

          if (!marketingError && marketingData?.resend_api_key) {
            resendApiKey = marketingData.resend_api_key;
            console.log('Found API key in marketing_settings');
          }
        }
      } catch (dbError) {
        console.error('Error fetching API key from database:', dbError);
      }
    } else {
      console.log('Using API key from environment variable');
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set in environment or database');
      console.error('Please ensure the API key is stored in admin_settings with setting_key = "resend_api_key"');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured. RESEND_API_KEY not found.',
          hint: 'Store the API key in admin_settings table with setting_key = "resend_api_key" and setting_value as a JSONB string or object'
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Using Resend API key (first 10 chars):', resendApiKey.substring(0, 10) + '...');

    const { driverName, driverEmail, city, state, waitlistPosition, location, emailType, messageType, presetPassword }: WaitlistEmailRequest = await req.json();
    
    // Support both emailType and messageType for backward compatibility
    const effectiveEmailType = emailType || messageType || 'waitlist';

    // Validate required fields
    if (!driverName || !driverEmail) {
      return new Response(
        JSON.stringify({ error: 'driverName and driverEmail are required' }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending ${effectiveEmailType} email to ${driverEmail}`, {
      driverName,
      city,
      state,
      waitlistPosition,
      location
    });

    // Password section for activation emails
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

    // Select email template based on type
    let emailHtml = '';
    let subject = '';
    
    if (effectiveEmailType === 'activation') {
      // Activation email template
      emailHtml = `
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
                  <tr>
                    <td style="background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 You're Activated!</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">Welcome to Crave'N!</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Hi ${driverName}! 👋</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Great news! You've been activated and are now ready to start delivering with Crave'N. 🚗✨
                      </p>
                      ${passwordSection}
                      <div style="background-color: #fff5ec; border-left: 4px solid #ff6b00; padding: 20px; margin: 30px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px;">📋 What's Next?</h3>
                        <ol style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                          <li>Log in to your driver account</li>
                          <li>Complete your profile setup if needed</li>
                          <li>Review the driver guidelines</li>
                          <li>Go online and start accepting deliveries!</li>
                        </ol>
                      </div>
                      <div style="text-align: center; margin: 40px 0 30px 0;">
                        <a href="https://www.cravenusa.com/mobile" 
                           style="display: inline-block; background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);">
                          Access Driver Portal
                        </a>
                      </div>
                      <p style="margin: 20px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Welcome aboard! 🧡<br>
                        <strong>The Crave'N Team</strong>
                      </p>
                    </td>
                  </tr>
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
      `;
      subject = "🎉 You're Activated! Welcome to Crave'N";
    } else if (effectiveEmailType === 'invitation') {
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .cta-button { background: #FF6B35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You've Been Invited to Drive with Crave'N!</h1>
            </div>
            
            <div class="content">
              <p>Hi <strong>${driverName}</strong>,</p>
              
              <p><strong>Great news!</strong> You've been removed from the waitlist and we're ready for you to complete your driver application.</p>
              
              <p>We need you to finish a few more steps to activate your driver account:</p>
              
              <ol>
                <li>Verify your identity and upload documents</li>
                <li>Provide vehicle and insurance information</li>
                <li>Complete background check</li>
                <li>Sign legal agreements</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="https://feeder.crave-n.com/driver/post-waitlist-onboarding" class="cta-button">
                  Complete Your Application →
                </a>
              </div>
              
              <p>You can complete this in about 10-15 minutes. Your application will be reviewed within 24 hours.</p>
              
              <p><strong>The Crave'N Team</strong></p>
            </div>
            
            <div class="footer">
              <p>© 2025 Crave'N. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      subject = 'Complete Your Crave\'N Driver Application';
    } else {
      // Waitlist email template - Mantine-inspired design
      // Use the deployed site's public folder URL for the celebration icon
      // The image is in public/craven-c-celebration.png and should be accessible at the root
      const baseUrl = Deno.env.get("PUBLIC_URL") || "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com";
      const celebrationIconUrl = `${baseUrl}/craven-c-celebration.png`;
      
      console.log('Using celebration icon URL:', celebrationIconUrl);
      emailHtml = `
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You're on the Waitlist! - Crave'N</title>
            <style type="text/css">
                /* Basic Reset */
                body, table, td, a {
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                    margin: 0;
                    padding: 0;
                }
                /* Mantine-inspired Palette & Typography */
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                    background-color: #f8f9fa;
                    color: #212529;
                    line-height: 1.6;
                }
                a {
                    color: #228be6;
                    text-decoration: none;
                }
                /* Main Container Styles */
                .container {
                    max-width: 600px;
                    width: 100%;
                    margin: 0 auto;
                }
                /* Card Styles */
                .card {
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
                }
                /* Button Styles */
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    border-radius: 6px;
                    background-color: #228be6;
                    color: #ffffff !important;
                    font-weight: 600;
                    text-decoration: none;
                    text-align: center;
                    border: 1px solid #228be6;
                }
                /* Mobile Responsiveness */
                @media only screen and (max-width: 600px) {
                    .container {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .card {
                        border-radius: 0;
                        box-shadow: none;
                    }
                    .header-logo {
                        padding: 20px !important;
                    }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f9fa;">
            <!-- 1. Full-width wrapper table -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8f9fa;">
                <tr>
                    <td align="center" style="padding: 24px 0;">
                        <!-- 2. Main Content Container (600px max width) -->
                        <table border="0" cellpadding="0" cellspacing="0" class="container">
                            <!-- Header/Logo Area -->
                            <tr>
                                <td align="center" style="padding: 20px 0 10px 0;">
                                    <h1 style="font-size: 24px; color: #343a40;">Crave'N</h1>
                                </td>
                            </tr>
                            <!-- Main Card (The Core Content) -->
                            <tr>
                                <td align="center" style="padding: 0 16px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="padding: 40px 30px;">
                                        <tr>
                                            <td align="left">
                                                <!-- Confirmation Header with Celebration Icon -->
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tr>
                                                        <td align="left" style="padding-bottom: 16px;">
                                                            <table border="0" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td valign="middle" style="padding-right: 12px;">
                                                                        <img src="${celebrationIconUrl}" alt="Celebration" width="48" height="48" style="display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                                                                    </td>
                                                                    <td valign="middle">
                                                                        <h2 style="font-size: 28px; font-weight: 700; margin: 0; color: #212529;">
                                                                            You're Officially On The List!
                                                                        </h2>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Body Text -->
                                                <p style="margin: 0 0 24px 0; font-size: 16px; color: #495057;">
                                                    Thank you for joining the waitlist for <strong>Crave'N</strong>. We're excited to give you early access to the best way to earn money as a delivery driver.
                                                </p>
                                                
                                                <!-- Waitlist Status Card (Mantine Style Alert/Badge) -->
                                                <table border="0" cellpadding="20" cellspacing="0" width="100%" style="background-color: #e7f5ff; border: 1px solid #a5d8ff; border-radius: 6px; margin-bottom: 30px;">
                                                    <tr>
                                                        <td align="left">
                                                            <p style="font-size: 14px; color: #228be6; font-weight: 600; margin: 0;">
                                                                Your Current Position: <span style="font-size: 20px;">#${waitlistPosition || 'N/A'}</span>
                                                            </p>
                                                            <p style="font-size: 14px; color: #495057; margin: 8px 0 0 0;">
                                                                ${location ? `We are rolling out invites in ${location} soon.` : 'We are rolling out invites soon.'} Keep an eye on your inbox!
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- What Happens Next Section -->
                                                <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #212529;">
                                                    What Happens Next?
                                                </h3>
                                                <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #495057; font-size: 16px;">
                                                    <li style="margin-bottom: 8px;">You'll stay on the waitlist until delivery routes open in your area</li>
                                                    <li style="margin-bottom: 8px;">When routes launch, you'll receive an email invitation to complete your application</li>
                                                    <li style="margin-bottom: 8px;">Once approved, you can start accepting deliveries immediately</li>
                                                </ul>
                                                
                                                <!-- Main Button -->
                                                <div style="text-align: center; margin-bottom: 30px;">
                                                    <a href="https://www.cravenusa.com/enhanced-onboarding" class="button">
                                                        View My Dashboard
                                                    </a>
                                                </div>
                                                
                                                <!-- Signature/Closing -->
                                                <p style="margin: 0 0 10px 0; font-size: 16px; color: #495057;">
                                                    Cheers,
                                                </p>
                                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #212529;">
                                                    The Crave'N Team
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 16px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td align="center">
                                                <p style="font-size: 12px; color: #868e96; margin: 0 0 8px 0;">
                                                    Crave'N &copy; 2025. All rights reserved.
                                                </p>
                                                <p style="font-size: 12px; margin: 0;">
                                                    <a href="https://www.cravenusa.com/privacy-policy" style="color: #868e96;">Privacy Policy</a>
                                                </p>
                                                <p style="font-size: 10px; color: #ced4da; margin-top: 16px;">
                                                    This email was sent to ${driverEmail}.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        <!-- End Main Content Container -->
                    </td>
                </tr>
            </table>
            <!-- End Full-width wrapper table -->
        </body>
        </html>
      `;
      subject = 'You\'re on the Crave\'N Driver Waitlist! 🚗';
    }

    // Use Resend SDK
    const resend = new Resend(resendApiKey);
    
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";
    
    console.log(`Sending ${emailType} email to ${driverEmail} from ${fromEmail}`);
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [driverEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log('Resend email response:', emailResponse);

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      throw new Error(`Resend API error: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
    }

    if (!emailResponse.data) {
      console.error('Resend returned no data:', emailResponse);
      throw new Error('Resend API returned no data');
    }

    console.log('Email sent successfully. Email ID:', emailResponse.data.id);
    const result = { id: emailResponse.data.id, success: true };

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in send-driver-waitlist-email function:", error);
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