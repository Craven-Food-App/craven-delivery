import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

// Inline CORS function (required for web UI deployment)
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
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface FoundationalInviteEmailRequest {
  inviteeName: string;
  inviteeEmail: string;
  accessCode: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const {
      inviteeName,
      inviteeEmail,
      accessCode,
    }: FoundationalInviteEmailRequest = await req.json();

    console.log(`Sending foundational invite email to ${inviteeEmail}`);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <support@cravenusa.com>";
    const supportUrl = Deno.env.get("SUPPORT_URL") || "https://cravenusa.com/contact";
    const accessUrl = Deno.env.get("ACCESS_URL") || "https://cravenusa.com/access";

    const emailHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Foundational Support Invitation</title>
  </head>

  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <!-- Preheader (hidden preview text) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      You've been invited to participate in the Foundational Support Program for Crave'n, Inc.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:24px 12px;">

          <!-- Container -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <!-- Hero image -->
            <tr>
              <td style="padding:0;">
                <img
                  src="https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/brand-assets/foundational_support.png"
                  width="600"
                  alt="Foundational Invite Support"
                  style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </td>
            </tr>

            <!-- Header bar (subtle brand accent) -->
            <tr>
              <td style="padding:0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="height:4px;background-color:#f57c00;line-height:4px;font-size:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 24px 10px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.4;">
                  <div style="font-size:18px;font-weight:700;margin:0 0 10px 0;">
                    You've Been Invited to Foundational Support
                  </div>

                  <div style="font-size:14px;margin:0 0 14px 0;">
                    Hello ${inviteeName || 'there'},
                  </div>

                  <div style="font-size:14px;margin:0 0 14px 0;">
                    You have been invited to participate in the <strong>Foundational Support Program</strong> for Crave'n, Inc.
                    This is an opportunity to support the company during its early formation stage and to own stock in Crave'n, Inc.
                  </div>

                  <div style="font-size:14px;margin:0 0 16px 0;">
                    In connection with your participation, you will receive a fixed number of <strong>non-controlling common shares</strong>
                    in Crave'n, Inc., which will be issued and recorded in the company's official stock ledger upon your contribution.
                  </div>

                  <!-- Access Code Card -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;margin:0 0 16px 0;">
                    <tr>
                      <td style="padding:14px 14px 6px 14px;background-color:#fff7ed;">
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">
                          Invite Registry Access
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px 14px 14px;">
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;margin:0 0 8px 0;">
                          To access the registry and complete your participation, you will need:
                        </div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;padding:4px 0;width:40%;">
                              Access Code
                            </td>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;padding:4px 0;letter-spacing:0.5px;">
                              ${accessCode}
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;padding:4px 0;">
                              Email Address
                            </td>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;padding:4px 0;">
                              ${inviteeEmail}
                            </td>
                          </tr>
                        </table>
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#6b7280;margin:12px 0 0 0;line-height:18px;">
                          Use your access code in combination with the email address listed above to gain access to the registry portal.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;">
                    <tr>
                      <td align="left">
                        <a href="${accessUrl}"
                           style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:12px 16px;border-radius:10px;">
                          Access Registry Portal
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Important notes -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e5e7eb;margin-top:6px;">
                    <tr>
                      <td style="padding-top:14px;">
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#111827;margin:0 0 8px 0;">
                          Important information
                        </div>

                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:18px;color:#374151;margin:0 0 10px 0;">
                          • This program is private and invite-only.<br />
                          • Shares issued are common stock and do not confer control, board seats, or management authority.<br />
                          • No valuation, liquidity, or return is promised.<br />
                          • Ownership percentages may change as additional equity is issued.
                        </div>

                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:18px;color:#374151;margin:0;">
                          If you have questions, use the Contact Support button below.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Contact Support button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;">
                    <tr>
                      <td align="left">
                        <a href="${supportUrl}"
                           style="display:inline-block;background-color:#ffffff;color:#111827;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:12px 16px;border-radius:10px;border:1px solid #e5e7eb;">
                          Contact Support
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Signature block -->
                  <div style="margin-top:18px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <div style="font-size:14px;margin:0 0 8px 0;">Respectfully,</div>
                    <div style="font-size:14px;font-weight:700;margin:0;">Torrance A. Stroman</div>
                    <div style="font-size:12.5px;color:#6b7280;margin:2px 0 0 0;">Chief Executive Officer</div>
                    <div style="font-size:12.5px;color:#6b7280;margin:2px 0 0 0;">Crave'n, Inc. · A Delaware Corporation</div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 24px 20px 24px;background-color:#ffffff;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:17px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:14px;">
                  This message relates to the Foundational Invite Support Program. Documentation will be maintained in your participant record upon completion.
                  Crave'n does not provide personal legal, tax, or investment advice.
                </div>

                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#9ca3af;margin-top:10px;">
                  © ${new Date().getFullYear()} Crave'n, Inc. All rights reserved.
                </div>
              </td>
            </tr>
          </table>

          <!-- Spacer -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
            <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [inviteeEmail],
      subject: "You've Been Invited to Foundational Support - Crave'n, Inc.",
      html: emailHtml,
    });

    console.log("Foundational invite email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending foundational invite email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

