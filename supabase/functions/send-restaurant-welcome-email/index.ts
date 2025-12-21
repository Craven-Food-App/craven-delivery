import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RestaurantWelcomeEmailRequest {
  restaurantName: string;
  ownerEmail: string;
  ownerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, ownerEmail, ownerName }: RestaurantWelcomeEmailRequest = await req.json();

    console.log(`Sending restaurant welcome email to ${ownerEmail} for ${restaurantName}`);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [ownerEmail],
      subject: "Welcome to your Crave'N Merchant Portal",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
              <!-- Logo Header -->
              <tr>
                <td style="padding: 40px 24px 24px 24px;">
                  <div style="color: #ff6b00; font-size: 24px; font-weight: bold;">🍽️ for Merchants</div>
                </td>
              </tr>
              
              <!-- Main Heading -->
              <tr>
                <td style="padding: 0 24px;">
                  <h1 style="margin: 0 0 24px 0; color: #191919; font-size: 32px; font-weight: 600; line-height: 1.2;">
                    Welcome to your Crave'N<br/>Merchant Portal
                  </h1>
                </td>
              </tr>
              
              <!-- Login Instructions -->
              <tr>
                <td style="padding: 0 24px 24px 24px;">
                  <p style="margin: 0 0 8px 0; color: #191919; font-size: 14px; line-height: 1.5;">
                    Use your existing credentials to log into your new portal, including
                  </p>
                  <p style="margin: 0 0 16px 0; color: #191919; font-size: 14px; line-height: 1.5;">
                    <strong>${ownerEmail}</strong> as your email address.
                  </p>
                  <p style="margin: 0; color: #191919; font-size: 14px; line-height: 1.5;">
                    If you don't remember your email, click "Forgot your Password?"
                  </p>
                </td>
              </tr>
              
              <!-- Login Button -->
              <tr>
                <td style="padding: 0 24px 32px 24px;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}/restaurant-auth" 
                     style="display: inline-block; background-color: #ff0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 600;">
                    Log in
                  </a>
                </td>
              </tr>
              
              <!-- Portal Features -->
              <tr>
                <td style="padding: 0 24px 16px 24px;">
                  <h2 style="margin: 0 0 16px 0; color: #191919; font-size: 18px; font-weight: 600;">
                    The Portal is your online tool for:
                  </h2>
                </td>
              </tr>
              
              <!-- Feature List -->
              <tr>
                <td style="padding: 0 24px;">
                  <table cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="padding: 0 0 12px 0; vertical-align: top;">
                        <span style="color: #ff0000; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #191919; font-size: 14px; line-height: 1.5;">Managing your day to day deliveries and resolving errors like missing and incorrect items</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 12px 0; vertical-align: top;">
                        <span style="color: #ff0000; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #191919; font-size: 14px; line-height: 1.5;">Updating contact information and banking details</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 12px 0; vertical-align: top;">
                        <span style="color: #ff0000; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #191919; font-size: 14px; line-height: 1.5;">Managing store hours</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 12px 0; vertical-align: top;">
                        <span style="color: #ff0000; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #191919; font-size: 14px; line-height: 1.5;">Making menu changes to add items, edit descriptions, update pricing and more</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 24px 0; vertical-align: top;">
                        <span style="color: #ff0000; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #191919; font-size: 14px; line-height: 1.5;">Accessing tools to Grow Your Sales</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Tutorial Link -->
              <tr>
                <td style="padding: 0 24px 24px 24px;">
                  <p style="margin: 0; color: #191919; font-size: 14px; line-height: 1.5;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}/restaurant-guide" style="color: #191919; text-decoration: underline;">Click here</a> for a tutorial of the Portal.
                  </p>
                </td>
              </tr>
              
              <!-- Second Login Button -->
              <tr>
                <td style="padding: 0 24px 40px 24px;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}/restaurant-auth" 
                     style="display: inline-block; background-color: #ff0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 600;">
                    Log in
                  </a>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f7f7f7; padding: 32px 24px;">
                  <div style="margin-bottom: 24px;">
                    <span style="color: #ff6b00; font-size: 20px; font-weight: bold;">CRAVE'N</span>
                  </div>
                  
                  <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
                    <tr>
                      <td style="width: 25%; text-align: center; padding: 8px;">
                        <div style="color: #191919; font-size: 11px; font-weight: 600;">Contact Support</div>
                      </td>
                      <td style="width: 25%; text-align: center; padding: 8px;">
                        <div style="color: #191919; font-size: 11px; font-weight: 600;">Learning Center</div>
                      </td>
                      <td style="width: 25%; text-align: center; padding: 8px;">
                        <div style="color: #191919; font-size: 11px; font-weight: 600;">Merchant Portal</div>
                      </td>
                      <td style="width: 25%; text-align: center; padding: 8px;">
                        <div style="color: #191919; font-size: 11px; font-weight: 600;">Tools & Earn</div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 8px 0; color: #5b5b5b; font-size: 11px; line-height: 1.4;">
                    ©2025 Crave'N Inc.<br/>
                    303 2nd Street, Suite 800<br/>
                    San Francisco, CA, 94107
                  </p>
                  
                  <p style="margin: 0; color: #5b5b5b; font-size: 11px; line-height: 1.4;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}/privacy-policy" style="color: #5b5b5b; text-decoration: underline;">Privacy Policy</a>
                  </p>
                  
                  <p style="margin: 16px 0 0 0; color: #5b5b5b; font-size: 11px; line-height: 1.4;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}/help-center" style="color: #5b5b5b; text-decoration: underline;">Help Center</a> | 
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://xaxbucnjlrfkccsfiddq.supabase.co', 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com')}" style="color: #5b5b5b; text-decoration: underline;">View email in browser</a>
                  </p>
                  
                  <p style="margin: 16px 0 0 0; color: #5b5b5b; font-size: 10px; line-height: 1.4;">
                    You are receiving this email because you signed up with your email address (${ownerEmail}) for a product or service offered by Crave'N. If you believe you received this email in error, or if you'd like to stop receiving emails from Crave'N, you can unsubscribe at any time. Please note that if you unsubscribe, you will no longer receive any communications from Crave'N, including important product updates.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("Restaurant welcome email sent successfully:", emailResponse);

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
    console.error("Error sending restaurant welcome email:", error);
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
