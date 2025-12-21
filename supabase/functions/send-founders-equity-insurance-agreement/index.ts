import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface FoundersAgreementRequest {
  employeeEmail: string;
  employeeName: string;
  position: string;
  equityPercentage: number;
  startDate: string;
  companyName: string;
  state: string;
  resolutionNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      employeeEmail,
      employeeName,
      position,
      equityPercentage,
      startDate,
      companyName,
      state,
      resolutionNumber,
    }: FoundersAgreementRequest = await req.json();

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Craven Inc <legal@craven.com>";

    const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [employeeEmail],
      subject: `📋 Founders Equity Insurance Agreement - ${equityPercentage}% Ownership in ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Founders Equity Insurance Agreement - ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📋 FOUNDERS EQUITY INSURANCE AGREEMENT</h1>
                        <p style="margin: 10px 0 0 0; color: #e9d5ff; font-size: 16px;">${companyName}</p>
                        <p style="margin: 5px 0 0 0; color: #e9d5ff; font-size: 14px;">Resolution #${resolutionNumber}</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 50px;">
                        
                        <!-- Agreement Header -->
                        <div style="text-align: center; margin-bottom: 40px;">
                          <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">FOUNDERS EQUITY INSURANCE AGREEMENT</h2>
                          <p style="margin: 0; color: #4a4a4a; font-size: 16px;">This agreement is made and entered into as of ${startDateFormatted}</p>
                        </div>

                        <!-- Parties -->
                        <div style="margin-bottom: 30px;">
                          <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">PARTIES</h3>
                          <p style="margin: 0 0 10px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            <strong>Company:</strong> ${companyName}, a corporation organized under the laws of the State of ${state}
                          </p>
                          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            <strong>Founder:</strong> ${employeeName}, in the capacity of ${position}
                          </p>
                        </div>

                        <!-- Board Resolution Reference -->
                        <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 16px; font-weight: bold;">📋 BOARD RESOLUTION REFERENCE</h3>
                          <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                            This agreement is executed pursuant to Board Resolution #${resolutionNumber}, 
                            dated ${startDateFormatted}, authorizing the appointment of ${employeeName} 
                            as ${position} and the grant of ${equityPercentage}% equity ownership.
                          </p>
                        </div>

                        <!-- Equity Details -->
                        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">FOUNDERS EQUITY GRANT</h3>
                          
                          <table width="100%" cellpadding="8" style="border-collapse: collapse;">
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Equity Type:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Founders Common Stock</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Ownership Percentage:</td>
                              <td style="color: #1a1a1a; font-size: 14px; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${equityPercentage}%</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Vesting Schedule:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Immediate (100% vested)</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0;">Founder Status:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0;">Founding ${position}</td>
                            </tr>
                          </table>
                        </div>

                        <!-- Terms and Conditions -->
                        <div style="margin: 30px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">FOUNDERS TERMS AND CONDITIONS</h3>
                          
                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">1. Founder Status</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              ${employeeName} is hereby recognized as a founding ${position} of ${companyName} 
                              and shall be entitled to all rights, privileges, and responsibilities associated 
                              with founder status, including but not limited to voting rights, information rights, 
                              and participation in major corporate decisions.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">2. Equity Insurance</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Company hereby guarantees that the Founder's ${equityPercentage}% equity ownership 
                              shall be protected against dilution from future equity issuances, except as may be 
                              approved by a supermajority vote of the Board of Directors (75% approval required).
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">3. Anti-Dilution Protection</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              In the event of future equity issuances that would dilute the Founder's ownership 
                              below ${equityPercentage}%, the Company shall issue additional shares to the Founder 
                              to maintain their ownership percentage, subject to the terms of this agreement.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">4. Voting Rights</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Founder shall have voting rights proportional to their ownership percentage 
                              on all matters requiring shareholder approval, including but not limited to 
                              board elections, major corporate transactions, and amendments to corporate documents.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">5. Information Rights</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Founder shall have the right to receive regular financial reports, 
                              board meeting minutes, and other material information about the Company's 
                              operations and financial condition.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">6. Transfer Restrictions</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Founder may not transfer, sell, or otherwise dispose of any equity interest 
                              without the prior written consent of the Company's Board of Directors. 
                              The Company shall have a right of first refusal on any proposed transfer.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">7. Founder Departure</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              In the event of the Founder's departure from the Company, their equity ownership 
                              shall remain vested and subject to the transfer restrictions set forth herein. 
                              The Company may repurchase the Founder's shares at fair market value.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">8. Governing Law</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              This Agreement shall be governed by and construed in accordance with the laws 
                              of the State of ${state}, without regard to conflict of law principles.
                            </p>
                          </div>
                        </div>

                        <!-- Acceptance Section -->
                        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px; font-weight: bold;">⚠️ ACCEPTANCE REQUIRED</h3>
                          <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            This Founders Equity Insurance Agreement must be accepted within 30 days of the offer date. 
                            Please reply to this email with "I ACCEPT FOUNDERS AGREEMENT" to confirm your agreement to these terms.
                          </p>
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: bold;">
                            By accepting this agreement, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions set forth herein.
                          </p>
                        </div>

                        <!-- Signature Lines -->
                        <div style="margin: 40px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">${employeeName} - Founder</p>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Date: _______________</p>
                            </div>
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">${companyName} - Board of Directors</p>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Date: _______________</p>
                            </div>
                          </div>
                        </div>

                        <!-- Footer -->
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px;">
                          <p style="margin: 0 0 10px 0; color: #4a4a4a; font-size: 12px; line-height: 1.6;">
                            This document constitutes a legally binding agreement. Please review all terms carefully before accepting.
                          </p>
                          <p style="margin: 0; color: #4a4a4a; font-size: 12px; line-height: 1.6;">
                            For questions regarding this agreement, please contact legal@craven.com
                          </p>
                        </div>

                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">Welcome to the ${companyName} Founders Circle! 👑</p>
                        <p style="margin: 0; color: #898989; font-size: 12px;">
                          © ${new Date().getFullYear()} ${companyName}. All rights reserved.
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

    console.log("Founders Equity Insurance Agreement sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending founders equity insurance agreement:", error);
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
