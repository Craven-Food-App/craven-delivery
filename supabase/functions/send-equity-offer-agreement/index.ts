import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EquityOfferRequest {
  employeeEmail: string;
  employeeName: string;
  position: string;
  equityPercentage: number;
  equityType: string;
  vestingSchedule: string;
  strikePrice?: number;
  startDate: string;
  companyName: string;
  state: string;
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
      equityType,
      vestingSchedule,
      strikePrice,
      startDate,
      companyName,
      state,
    }: EquityOfferRequest = await req.json();

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Craven Inc <legal@craven.com>";

    // Format equity type for display
    const equityTypeDisplay = {
      'common_stock': 'Common Stock',
      'preferred_stock': 'Preferred Stock',
      'stock_options': 'Stock Options',
      'phantom_stock': 'Phantom Stock'
    }[equityType] || 'Common Stock';

    // Format vesting schedule
    const vestingDisplay = {
      'immediate': 'Immediate (100% vested)',
      '4_year_1_cliff': '4 years with 1-year cliff',
      '3_year_1_cliff': '3 years with 1-year cliff',
      '2_year_1_cliff': '2 years with 1-year cliff',
      'custom': 'Custom vesting schedule'
    }[vestingSchedule] || '4 years with 1-year cliff';

    const strikePriceDisplay = strikePrice ? `$${strikePrice.toFixed(2)}` : 'N/A';
    const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [employeeEmail],
      subject: `📋 Equity Offer Agreement - ${equityPercentage}% ${equityTypeDisplay} in ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Equity Offer Agreement - ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📋 EQUITY OFFER AGREEMENT</h1>
                        <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">${companyName}</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 50px;">
                        
                        <!-- Agreement Header -->
                        <div style="text-align: center; margin-bottom: 40px;">
                          <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">EQUITY OFFER AGREEMENT</h2>
                          <p style="margin: 0; color: #4a4a4a; font-size: 16px;">This agreement is made and entered into as of ${startDateFormatted}</p>
                        </div>

                        <!-- Parties -->
                        <div style="margin-bottom: 30px;">
                          <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">PARTIES</h3>
                          <p style="margin: 0 0 10px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            <strong>Company:</strong> ${companyName}, a corporation organized under the laws of the State of ${state}
                          </p>
                          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            <strong>Grantee:</strong> ${employeeName}, in the capacity of ${position}
                          </p>
                        </div>

                        <!-- Equity Details -->
                        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">EQUITY GRANT DETAILS</h3>
                          
                          <table width="100%" cellpadding="8" style="border-collapse: collapse;">
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Equity Type:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${equityTypeDisplay}</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Ownership Percentage:</td>
                              <td style="color: #1a1a1a; font-size: 14px; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${equityPercentage}%</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Vesting Schedule:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${vestingDisplay}</td>
                            </tr>
                            ${equityType === 'stock_options' ? `
                            <tr>
                              <td style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 8px 0;">Strike Price:</td>
                              <td style="color: #1a1a1a; font-size: 14px; padding: 8px 0;">${strikePriceDisplay}</td>
                            </tr>
                            ` : ''}
                          </table>
                        </div>

                        <!-- Terms and Conditions -->
                        <div style="margin: 30px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">TERMS AND CONDITIONS</h3>
                          
                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">1. Grant of Equity</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              Subject to the terms and conditions of this Agreement, ${companyName} hereby grants to ${employeeName} 
                              ${equityPercentage}% ownership interest in the form of ${equityTypeDisplay} in ${companyName}.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">2. Vesting</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The equity interest shall vest according to the following schedule: ${vestingDisplay}. 
                              ${vestingSchedule !== 'immediate' ? 'Unvested shares shall be forfeited upon termination of employment.' : ''}
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">3. Voting Rights</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Grantee shall have voting rights proportional to their ownership percentage on all matters 
                              requiring shareholder approval, subject to the terms of the Company's Articles of Incorporation.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">4. Transfer Restrictions</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              The Grantee may not transfer, sell, or otherwise dispose of any equity interest without the prior 
                              written consent of the Company's Board of Directors. The Company shall have a right of first refusal 
                              on any proposed transfer.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">5. Termination</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              Upon termination of employment, all unvested equity shall be forfeited. Vested equity shall remain 
                              subject to the transfer restrictions set forth herein.
                            </p>
                          </div>

                          <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">6. Governing Law</h4>
                            <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                              This Agreement shall be governed by and construed in accordance with the laws of the State of ${state}, 
                              without regard to conflict of law principles.
                            </p>
                          </div>
                        </div>

                        <!-- Acceptance Section -->
                        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px; font-weight: bold;">⚠️ ACCEPTANCE REQUIRED</h3>
                          <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            This Equity Offer Agreement must be accepted within 30 days of the offer date. 
                            Please reply to this email with "I ACCEPT" to confirm your agreement to these terms.
                          </p>
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: bold;">
                            By accepting this offer, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions set forth herein.
                          </p>
                        </div>

                        <!-- Signature Lines -->
                        <div style="margin: 40px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">${employeeName}</p>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Date: _______________</p>
                            </div>
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">${companyName}</p>
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
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">Welcome to ${companyName}! 🚀</p>
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

    console.log("Equity Offer Agreement sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending equity offer agreement:", error);
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
