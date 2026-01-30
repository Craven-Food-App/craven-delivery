import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface DocumentLink {
  title: string;
  url: string;
  requiresSignature: boolean;
}

interface ExecutiveDocumentsBundleRequest {
  to: string;
  executiveName: string;
  position: string;
  documents: DocumentLink[];
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, executiveName, position, documents }: ExecutiveDocumentsBundleRequest = await req.json();

    if (!to || !executiveName || !position || !documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, executiveName, position, documents" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Sending ${documents.length} documents to ${executiveName} (${position}) at ${to}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N HR <hr@craven.com>";

    // Group documents by signature requirement
    const signatureDocs = documents.filter(d => d.requiresSignature);
    const infoOnlyDocs = documents.filter(d => !d.requiresSignature);

    // Build document list HTML
    const buildDocList = (docs: DocumentLink[], showSignatureNote: boolean) => {
      return docs.map((doc, idx) => `
        <div style="background-color: #fff; border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
                ${idx + 1}. ${doc.title}
              </h4>
              ${showSignatureNote ? `
                <p style="margin: 5px 0 0 0; color: #ff7a45; font-size: 13px; font-weight: 600;">
                  ✍️ Signature Required
                </p>
              ` : ''}
            </div>
            <a href="${doc.url}" 
               style="display: inline-block; background: linear-gradient(135deg, #ff7a45 0%, #ff8c00 100%); color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-left: 15px;">
              View Document
            </a>
          </div>
        </div>
      `).join('');
    };

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Your C-Suite Executive Documents Package - Crave'n, Inc.`,
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
                  <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header with Orange Banner -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #ff7a45 0%, #ff8c00 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Welcome to Crave'N!</h1>
                        <p style="margin: 10px 0 0 0; color: #fff; font-size: 18px; opacity: 0.95;">Your Executive Documents Package</p>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Dear ${executiveName},</h2>
                        
                        <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                          Congratulations on your appointment as <strong>${position}</strong> at Crave'n! Below you'll find your complete C-Suite executive documentation package containing <strong>${documents.length} important documents</strong>.
                        </p>
                        
                        <div style="background-color: #fff5ec; border-left: 4px solid #ff7a45; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #ff7a45; font-size: 18px;">📋 Package Summary:</h3>
                          <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                            <li><strong>Total Documents:</strong> ${documents.length}</li>
                            <li><strong>Require Signature:</strong> ${signatureDocs.length}</li>
                            <li><strong>Information Only:</strong> ${infoOnlyDocs.length}</li>
                            <li><strong>Position:</strong> ${position}</li>
                            <li><strong>Date Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
                          </ul>
                        </div>

                        ${signatureDocs.length > 0 ? `
                        <!-- Documents Requiring Signature -->
                        <div style="margin: 40px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; border-bottom: 2px solid #ff7a45; padding-bottom: 10px;">
                            ✍️ Documents Requiring Your Signature (${signatureDocs.length})
                          </h3>
                          <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            Please review and sign these documents by <strong>typing your full legal name</strong> in the signature field provided in each document.
                          </p>
                          ${buildDocList(signatureDocs, true)}
                        </div>
                        ` : ''}

                        ${infoOnlyDocs.length > 0 ? `
                        <!-- Information Only Documents -->
                        <div style="margin: 40px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; border-bottom: 2px solid #898989; padding-bottom: 10px;">
                            📄 Information & Reference Documents (${infoOnlyDocs.length})
                          </h3>
                          <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            Please review these documents for your records. No signature required.
                          </p>
                          ${buildDocList(infoOnlyDocs, false)}
                        </div>
                        ` : ''}
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">📝 Important Notes:</h3>
                          <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            <li>All documents are in <strong>PDF format</strong></li>
                            <li>Documents requiring signature will have a designated signature field</li>
                            <li>Sign by <strong>typing your full legal name</strong> in the signature field</li>
                            <li>Keep copies of all signed documents for your records</li>
                            <li>If you have any questions, contact HR at <a href="mailto:hr@craven.com" style="color: #ff7a45; text-decoration: none;">hr@craven.com</a></li>
                          </ul>
                        </div>

                        <div style="background-color: #fff5ec; border: 2px solid #ff7a45; border-radius: 6px; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #ff7a45; font-size: 16px;">⚡ Action Required:</h3>
                          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            Please review and sign ${signatureDocs.length > 0 ? `the ${signatureDocs.length} signature-required document${signatureDocs.length > 1 ? 's' : ''}` : 'all documents'} within <strong>7 business days</strong> of receiving this email.
                          </p>
                        </div>
                        
                        <p style="margin: 30px 0 0 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                          We're excited to have you on the team!<br/><br/>
                          Best regards,<br/>
                          <strong>Crave'n HR Team</strong><br/>
                          <a href="mailto:hr@craven.com" style="color: #ff7a45; text-decoration: none;">hr@craven.com</a>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0; color: #898989; font-size: 12px;">
                          © ${new Date().getFullYear()} Crave'n, Inc. All rights reserved.
                        </p>
                        <p style="margin: 10px 0 0 0; color: #898989; font-size: 11px;">
                          This email contains confidential executive documents. Do not forward.
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

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: (emailResponse.data as any)?.id || (emailResponse as any)?.id,
        to,
        documentCount: documents.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending executive documents bundle:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
