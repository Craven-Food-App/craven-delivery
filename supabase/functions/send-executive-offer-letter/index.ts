import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface OfferLetterRequest {
  employeeEmail: string;
  employeeName: string;
  position: string;
  department: string;
  salary: number;
  equity?: number; // Percentage if applicable
  startDate: string;
  reportingTo: string;
  signatureToken?: string;
  salaryStatus?: 'active'|'deferred';
  fundingTrigger?: number | null;
  employeeId?: string; // Optional: employee_id for tracking
  executiveSignatureId?: string; // Optional: signature record id
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
      department,
      salary,
      equity,
      startDate,
      reportingTo,
      signatureToken,
      salaryStatus,
      fundingTrigger,
      employeeId,
      executiveSignatureId,
    }: OfferLetterRequest = await req.json();

    const isCLevel = position.toLowerCase().includes('chief') || 
                     position.toLowerCase().includes('ceo') ||
                     position.toLowerCase().includes('cfo') ||
                     position.toLowerCase().includes('cto') ||
                     position.toLowerCase().includes('coo') ||
                     position.toLowerCase().includes('president');

    // Determine if equity should be included
    const hasEquity = isCLevel && equity !== undefined && equity > 0;

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Crave'N <onboarding@resend.dev>";
    // Use the production domain for executive signatures
    const appUrl = 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com';
    const signUrl = signatureToken ? `${appUrl}/executive-sign?token=${signatureToken}` : '';

    const equitySection = hasEquity ? `
      <div style="background-color: #fff9e6; border: 2px solid #ffd700; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; color: #b8860b; font-size: 18px;">🏆 Equity Compensation</h3>
        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
          ${equity}% Equity Stake
        </p>
        <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          As part of your compensation package, you will receive a ${equity}% equity stake in Crave'N Delivery. 
          Details regarding vesting schedule and share allocation will be provided in your formal equity agreement.
        </p>
      </div>
    ` : '';

    const salaryFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
    const deferredClause = salaryStatus === 'deferred' ? `
      <div style="background-color:#fff9e6; border:1px solid #ffd26a; border-radius:6px; padding:16px; margin:16px 0;">
        <strong>Deferred Salary Clause:</strong>
        The Executive acknowledges and agrees that, as of the Effective Date, Crave’n Inc. is in an early, pre-revenue stage and therefore unable to provide cash compensation. Accordingly, the Executive shall initially serve on an equity-only basis. Upon the Company achieving a Funding Event—defined as closing a capital raise of at least $${(fundingTrigger||500000).toLocaleString()} USD or achieving positive cash flow for three consecutive months—the Executive shall begin receiving a base annual salary of ${salaryFormatted} USD, payable according to Company payroll practices. No back pay or retroactive wages shall accrue prior to the Funding Event.
      </div>
    ` : '';


    const isCfo = /chief\s*financial\s*officer|\bcfo\b/i.test(position);

    const cfoResponsibilities = `
      <div style="margin: 30px 0;">
        <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px;">Primary Responsibilities (CFO)</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
          <li>Own the Company’s financial strategy, long-range planning, and capital structure.</li>
          <li>Lead budgeting, forecasting, FP&A, and monthly/quarterly reporting.</li>
          <li>Establish and maintain internal controls, accounting policies, and close processes (GAAP-compliant).</li>
          <li>Manage treasury, cash flow, burn, and runway; optimize working capital.</li>
          <li>Oversee audits, tax planning/compliance, and regulatory filings.</li>
          <li>Support fundraising (equity/debt), due diligence, and investor relations.</li>
          <li>Build and lead the finance, accounting, and procurement functions.</li>
          <li>Partner with CEO/Board on strategy, risk management, and KPIs.</li>
        </ul>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [employeeEmail],
      subject: `🎯 ${isCLevel ? 'Executive ' : ''}Offer Letter - ${position} at Crave'N Delivery`,
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
                  <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%); padding: 50px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">${isCLevel ? '🏆 Executive ' : ''}Offer Letter</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 50px;">
                        <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">Dear ${employeeName},</p>
                        
                        <p style="margin: 0 0 25px 0; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                          We are pleased to offer you the position of <strong style="color: #ff6b00;">${position}</strong> in our <strong>${department}</strong> department at Crave'N Delivery, effective ${new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                        </p>

                        <div style="background-color: #f9f9f9; border-left: 4px solid #ff6b00; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px;">📋 Position Details</h3>
                          <table width="100%" cellpadding="8" style="border-collapse: collapse;">
                            <tr>
                              <td style="color: #4a4a4a; font-size: 15px; font-weight: 600; padding-bottom: 8px;">Position:</td>
                              <td style="color: #1a1a1a; font-size: 15px; padding-bottom: 8px;">${position}</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 15px; font-weight: 600; padding-bottom: 8px;">Department:</td>
                              <td style="color: #1a1a1a; font-size: 15px; padding-bottom: 8px;">${department}</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 15px; font-weight: 600; padding-bottom: 8px;">Salary:</td>
                              <td style="color: #1a1a1a; font-size: 15px; font-weight: 700; padding-bottom: 8px;">${salaryFormatted}/year</td>
                            </tr>
                            <tr>
                              <td style="color: #4a4a4a; font-size: 15px; font-weight: 600;">Start Date:</td>
                              <td style="color: #1a1a1a; font-size: 15px;">${new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            </tr>
                          </table>
                        </div>

                        ${salaryStatus === 'deferred' ? `<p style="margin:0 0 10px 0; color:#4a4a4a;">Compensation: Equity Only (deferred until funding of $${(fundingTrigger||500000).toLocaleString()}). Base salary of ${salaryFormatted}/year begins after Funding Event.</p>` : `<p style="margin:0 0 10px 0; color:#4a4a4a;">Compensation: Base salary of ${salaryFormatted}/year.</p>`}
                        ${deferredClause}

                        ${equitySection}

                        ${isCfo ? cfoResponsibilities : ''}

                        <div style="background-color: #f0f7ff; border-left: 4px solid #1890ff; padding: 20px; margin: 25px 0;">
                          <h3 style="margin: 0 0 10px 0; color: #1890ff; font-size: 18px;">📝 Next Steps</h3>
                          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                            Please review this offer and reply to this email to confirm your acceptance. 
                            ${hasEquity ? 'A separate equity agreement will be sent within 5 business days.' : ''}
                            HR will reach out shortly regarding onboarding paperwork.
                          </p>
                          ${signUrl ? `
                          <div style="text-align:center; margin-top: 16px;">
                            <a href="${signUrl}" style="display:inline-block; background:#1890ff; color:#fff; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:600;">Review & Sign Offer</a>
                          </div>
                          ` : ''}
                        </div>

                        <p style="margin: 30px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">Reporting To:</p>
                        <p style="margin: 5px 0 0 0; color: #4a4a4a; font-size: 15px;">${reportingTo}</p>

                        <p style="margin: 40px 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                          We look forward to welcoming you to the Crave'N Delivery team!
                        </p>

                        <p style="margin: 0; color: #1a1a1a; font-size: 16px;">Best regards,</p>
                        <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">Crave'N Delivery HR Team</p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">Welcome to the Team! 🚀</p>
                        <p style="margin: 0; color: #898989; font-size: 12px;">
                          © ${new Date().getFullYear()} Crave'N Delivery. All rights reserved.
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

    console.log("Executive offer letter sent successfully:", emailResponse);

    // Log email to database
    try {
      const resendId = (emailResponse.data as any)?.id;
      await supabase.from('email_logs').insert({
        recipient_email: employeeEmail,
        recipient_name: employeeName,
        email_type: 'offer_letter',
        subject: `🎯 ${isCLevel ? 'Executive ' : ''}Offer Letter - ${position} at Crave'N Delivery`,
        from_email: fromEmail,
        resend_email_id: resendId,
        status: 'sent',
        employee_id: employeeId || null,
        executive_signature_id: executiveSignatureId || null
      });
    } catch (logError) {
      console.error('Error logging email:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending executive offer letter:", error);
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

