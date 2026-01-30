import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface FoundationalConfirmationEmailRequest {
  contributorName: string;
  contributorEmail: string;
  sharesIssued: number;
  certificateNumber: string;
  issueDate: string;
  amountDollars: string;
  documents: Array<{
    type: string;
    title: string;
    file_url: string;
  }>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contributorName,
      contributorEmail,
      sharesIssued,
      certificateNumber,
      issueDate,
      amountDollars,
      documents,
    }: FoundationalConfirmationEmailRequest = await req.json();

    console.log(`Sending foundational confirmation email to ${contributorEmail}`);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <support@cravenusa.com>";
    const supportUrl = Deno.env.get("SUPPORT_URL") || "https://cravenusa.com/contact";

    // Fetch PDF attachments from the document URLs
    const attachments = await Promise.all(
      documents.map(async (doc) => {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) {
            console.error(`Failed to fetch document ${doc.title}: ${response.statusText}`);
            return null;
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          
          // Convert to base64 for Resend
          const base64 = btoa(String.fromCharCode(...buffer));
          
          return {
            filename: `${doc.type}.pdf`,
            content: base64,
          };
        } catch (error) {
          console.error(`Error fetching document ${doc.title}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed attachments
    const validAttachments = attachments.filter((att) => att !== null);

    const emailHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Foundational Invite Confirmed</title>
  </head>

  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <!-- Preheader (hidden preview text) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your Foundational Invite is confirmed. Your documents are attached to this email.
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
                    Your Foundational Invite Is Confirmed
                  </div>

                  <div style="font-size:14px;margin:0 0 14px 0;">
                    Hello ${contributorName},
                  </div>

                  <div style="font-size:14px;margin:0 0 14px 0;">
                    This email confirms your entry into the <strong>Foundational Invite Support Program</strong>.
                    Your participation supports the company during its early formation stage.
                  </div>

                  <div style="font-size:14px;margin:0 0 16px 0;">
                    In connection with your entry, a fixed number of <strong>non-controlling common shares</strong> have been issued
                    and recorded in the company's official stock ledger.
                  </div>

                  <!-- Summary card -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;">
                    <tr>
                      <td style="padding:14px 14px 6px 14px;background-color:#fff7ed;">
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">
                          Issuance Summary
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px 14px 14px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;padding:4px 0;width:45%;">
                              Shares Issued
                            </td>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;padding:4px 0;">
                              ${sharesIssued.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;padding:4px 0;">
                              Certificate No.
                            </td>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;padding:4px 0;">
                              ${certificateNumber}
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;padding:4px 0;">
                              Date of Issuance
                            </td>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;padding:4px 0;">
                              ${issueDate}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <div style="font-size:14px;margin:16px 0 10px 0;font-weight:700;">
                    Your documents
                  </div>

                  <div style="font-size:14px;margin:0 0 12px 0;">
                    All program documentation is attached to this email, including:
                  </div>

                  <!-- Bullet list (table-safe) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;">
                    <tr>
                      <td valign="top" style="width:18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#f57c00;">•</td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">Contribution Receipt</td>
                    </tr>
                    <tr>
                      <td valign="top" style="width:18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#f57c00;">•</td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">Common Stock Issuance Certificate (digital)</td>
                    </tr>
                    <tr>
                      <td valign="top" style="width:18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#f57c00;">•</td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">Foundational Participation Disclosure</td>
                    </tr>
                    <tr>
                      <td valign="top" style="width:18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#f57c00;">•</td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">Risk Acknowledgment record</td>
                    </tr>
                  </table>

                  <!-- CTA button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;">
                    <tr>
                      <td align="left">
                        <a href="${supportUrl}"
                           style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:12px 16px;border-radius:10px;">
                          Contact Support
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
                          If you have questions related to your documents, use the Contact Support button above.
                        </div>
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
                  This message relates to the Foundational Invite Support Program. Documentation is maintained in your participant record.
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
      to: [contributorEmail],
      subject: "Your Foundational Invite Is Confirmed - Documents Attached",
      html: emailHtml,
      attachments: validAttachments,
    });

    console.log("Foundational confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending foundational confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

