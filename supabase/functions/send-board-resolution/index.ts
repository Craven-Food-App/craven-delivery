import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface BoardResolutionRequest {
  employeeEmail: string;
  employeeName: string;
  position: string;
  resolutionNumber: string;
  resolutionType: string;
  effectiveDate: string;
  companyName: string;
  state: string;
  boardMembers: Array<{ name: string; title: string; vote: string }>;
  equityPercentage?: number;
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
      resolutionNumber,
      resolutionType,
      effectiveDate,
      companyName,
      state,
      boardMembers,
      equityPercentage,
    }: BoardResolutionRequest = await req.json();

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Craven Inc <board@craven.com>";

    const effectiveDateFormatted = new Date(effectiveDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const votesFor = boardMembers.filter(m => m.vote === 'for').length;
    const votesAgainst = boardMembers.filter(m => m.vote === 'against').length;
    const votesAbstain = boardMembers.filter(m => m.vote === 'abstain').length;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [employeeEmail],
      subject: `📋 Board Resolution #${resolutionNumber} - ${position} Appointment - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Board Resolution #${resolutionNumber} - ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📋 BOARD RESOLUTION</h1>
                        <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 16px;">${companyName}</p>
                        <p style="margin: 5px 0 0 0; color: #fecaca; font-size: 14px;">Resolution #${resolutionNumber}</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 50px;">
                        
                        <!-- Resolution Header -->
                        <div style="text-align: center; margin-bottom: 40px;">
                          <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">BOARD RESOLUTION</h2>
                          <p style="margin: 0; color: #4a4a4a; font-size: 16px;">Adopted on ${effectiveDateFormatted}</p>
                        </div>

                        <!-- Resolution Text -->
                        <div style="margin-bottom: 40px;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">RESOLUTION TEXT</h3>
                          <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 25px;">
                            <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; line-height: 1.8; font-weight: bold;">
                              WHEREAS, the Board of Directors of ${companyName} (the "Company") has determined that it is in the best interests of the Company to appoint ${employeeName} to the position of ${position};
                            </p>
                            <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; line-height: 1.8;">
                              WHEREAS, ${employeeName} has demonstrated the qualifications, experience, and leadership necessary to serve effectively in this capacity;
                            </p>
                            ${equityPercentage ? `
                            <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; line-height: 1.8;">
                              WHEREAS, the Board has determined that ${employeeName} should receive ${equityPercentage}% equity ownership in the Company as part of their compensation package;
                            </p>
                            ` : ''}
                            <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; line-height: 1.8;">
                              NOW, THEREFORE, BE IT RESOLVED, that the Board of Directors hereby appoints ${employeeName} to the position of ${position}, effective ${effectiveDateFormatted};
                            </p>
                            ${equityPercentage ? `
                            <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; line-height: 1.8;">
                              BE IT FURTHER RESOLVED, that the Company shall issue ${equityPercentage}% equity ownership to ${employeeName} in accordance with the terms of the applicable equity agreement;
                            </p>
                            ` : ''}
                            <p style="margin: 0; color: #1a1a1a; font-size: 16px; line-height: 1.8; font-weight: bold;">
                              BE IT FURTHER RESOLVED, that the officers of the Company are hereby authorized and directed to take all actions necessary to effectuate the purposes of this resolution.
                            </p>
                          </div>
                        </div>

                        <!-- Voting Record -->
                        <div style="margin-bottom: 40px;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">VOTING RECORD</h3>
                          
                          <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-around; text-align: center;">
                              <div>
                                <div style="font-size: 24px; font-weight: bold; color: #059669;">${votesFor}</div>
                                <div style="font-size: 14px; color: #4a4a4a;">Votes For</div>
                              </div>
                              <div>
                                <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${votesAgainst}</div>
                                <div style="font-size: 14px; color: #4a4a4a;">Votes Against</div>
                              </div>
                              <div>
                                <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${votesAbstain}</div>
                                <div style="font-size: 14px; color: #4a4a4a;">Abstentions</div>
                              </div>
                            </div>
                          </div>

                          <table width="100%" cellpadding="8" style="border-collapse: collapse; border: 1px solid #e2e8f0;">
                            <thead>
                              <tr style="background-color: #f8fafc;">
                                <th style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Board Member</th>
                                <th style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Title</th>
                                <th style="color: #4a4a4a; font-size: 14px; font-weight: 600; padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">Vote</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${boardMembers.map(member => `
                                <tr>
                                  <td style="color: #1a1a1a; font-size: 14px; padding: 12px; border-bottom: 1px solid #e2e8f0;">${member.name}</td>
                                  <td style="color: #4a4a4a; font-size: 14px; padding: 12px; border-bottom: 1px solid #e2e8f0;">${member.title}</td>
                                  <td style="color: #1a1a1a; font-size: 14px; padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                                    <span style="padding: 4px 8px; border-radius: 4px; font-weight: 600; 
                                      background-color: ${member.vote === 'for' ? '#dcfce7' : member.vote === 'against' ? '#fef2f2' : '#f3f4f6'};
                                      color: ${member.vote === 'for' ? '#166534' : member.vote === 'against' ? '#991b1b' : '#374151'};">
                                      ${member.vote.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </div>

                        <!-- Resolution Status -->
                        <div style="background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 18px; font-weight: bold;">✅ RESOLUTION STATUS: APPROVED</h3>
                          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                            This resolution has been duly adopted by the Board of Directors of ${companyName} 
                            and is effective as of ${effectiveDateFormatted}.
                          </p>
                        </div>

                        <!-- Next Steps -->
                        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px; font-weight: bold;">📋 NEXT STEPS</h3>
                          <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            As a result of this resolution, you will receive the following documents:
                          </p>
                          <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.6;">
                            <li>Official offer letter with position details</li>
                            ${equityPercentage ? `<li>Equity offer agreement for ${equityPercentage}% ownership</li>` : ''}
                            ${position.toLowerCase().includes('ceo') ? '<li>Founders equity insurance agreement</li>' : ''}
                            <li>Employee handbook and onboarding materials</li>
                          </ul>
                        </div>

                        <!-- Signature Lines -->
                        <div style="margin: 40px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Board Secretary</p>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Date: _______________</p>
                            </div>
                            <div style="width: 45%;">
                              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Board Chair</p>
                              <p style="margin: 0; color: #4a4a4a; font-size: 12px;">Date: _______________</p>
                            </div>
                          </div>
                        </div>

                        <!-- Footer -->
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px;">
                          <p style="margin: 0 0 10px 0; color: #4a4a4a; font-size: 12px; line-height: 1.6;">
                            This resolution is a legal document and constitutes official corporate action by ${companyName}.
                          </p>
                          <p style="margin: 0; color: #4a4a4a; font-size: 12px; line-height: 1.6;">
                            For questions regarding this resolution, please contact board@craven.com
                          </p>
                        </div>

                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">Welcome to ${companyName}! 🎉</p>
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

    console.log("Board Resolution sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending board resolution:", error);
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
