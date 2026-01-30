import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

import { getCorsHeaders } from '../_shared/cors.ts';
// CORS headers helper (inlined to avoid _shared dependency)
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { type } = body;

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, email sending disabled');
      // Return success anyway for development
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Notification logged (email sending disabled)',
          type,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    let emailResult;

    switch (type) {
      case 'termination_notice': {
        const {
          workflow_id,
          recipient_email,
          recipient_name,
          effective_date,
          termination_type,
          reason,
        } = body;

        if (!recipient_email || !recipient_name || !effective_date) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields for termination notice' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const terminationTypeLabel = termination_type === 'for_cause' 
          ? 'for cause' 
          : termination_type === 'without_cause' 
          ? 'without cause' 
          : termination_type || 'without cause';

        const effectiveDateFormatted = new Date(effective_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: right;
      margin-bottom: 30px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 20px;
    }
    .content {
      margin: 20px 0;
    }
    .reason-box {
      background-color: #f5f5f5;
      border-left: 4px solid #d32f2f;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p><strong>Crave'n Inc.</strong></p>
    <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="content">
    <p>${recipient_name}</p>
    <p>${recipient_email}</p>
  </div>

  <div class="content">
    <p><strong>RE: Termination of Employment</strong></p>

    <p>Dear ${recipient_name.split(' ')[0]},</p>

    <p>This letter serves as formal notice that your employment with Crave'n Inc. will be terminated ${terminationTypeLabel}, effective ${effectiveDateFormatted}.</p>

    ${reason ? `
    <div class="reason-box">
      <p><strong>Reason for Termination:</strong></p>
      <p>${reason.replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}

    <p>Your final compensation, including accrued salary, unused PTO, and any applicable severance, will be processed according to your employment agreement and company policy.</p>

    <p>Please return all company property, including but not limited to:</p>
    <ul>
      <li>Company equipment (laptops, phones, devices)</li>
      <li>Access cards and keys</li>
      <li>Company credit cards</li>
      <li>Confidential documents and materials</li>
    </ul>

    <p>Your ongoing obligations under your employment agreement, including confidentiality and non-compete provisions, remain in effect.</p>

    <p>If you have any questions, please contact Human Resources.</p>

    <div class="signature">
      <p>Sincerely,</p>
      <p><strong>Crave'n Inc.</strong></p>
      <p>Human Resources Department</p>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated notification. Please do not reply to this email.</p>
  </div>
</body>
</html>`;

        emailResult = await resend.emails.send({
          from: 'Crave\'n Delivery <notifications@cravenusa.com>',
          to: [recipient_email],
          subject: `Termination Notice - Effective ${effectiveDateFormatted}`,
          html: emailHtml,
        });

        console.log('Termination notice sent:', {
          recipient_email,
          recipient_name,
          effective_date,
          resendId: emailResult.data?.id,
        });
        break;
      }

      case 'internal_notification': {
        const { workflow_id, recipients, message } = body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Missing or invalid recipients for internal notification' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const recipientEmails = recipients.map((r: any) => r.email).filter(Boolean);

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h2>Internal Notification - Exit Workflow</h2>
  <p>Workflow ID: ${workflow_id}</p>
  <div style="margin-top: 20px;">
    ${message.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`;

        emailResult = await resend.emails.send({
          from: 'Crave\'n Delivery <notifications@cravenusa.com>',
          to: recipientEmails,
          subject: 'Internal Notification - Exit Workflow',
          html: emailHtml,
        });

        console.log('Internal notification sent:', {
          recipients: recipientEmails,
          workflow_id,
          resendId: emailResult.data?.id,
        });
        break;
      }

      case 'board_notification': {
        const {
          workflow_id,
          resolution_id,
          executive_name,
          executive_position,
          recipients,
        } = body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Missing or invalid recipients for board notification' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const recipientEmails = recipients.map((r: any) => r.email).filter(Boolean);

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h2>Board Notification - Executive Removal</h2>
  <p><strong>Executive:</strong> ${executive_name}</p>
  <p><strong>Position:</strong> ${executive_position}</p>
  <p><strong>Resolution ID:</strong> ${resolution_id}</p>
  <p><strong>Workflow ID:</strong> ${workflow_id}</p>
  <p>Please review the board resolution and cast your vote.</p>
</body>
</html>`;

        emailResult = await resend.emails.send({
          from: 'Crave\'n Delivery <notifications@cravenusa.com>',
          to: recipientEmails,
          subject: `Board Notification - Executive Removal: ${executive_name}`,
          html: emailHtml,
        });

        console.log('Board notification sent:', {
          recipients: recipientEmails,
          executive_name,
          resolution_id,
          resendId: emailResult.data?.id,
        });
        break;
      }

      case 'completion_notice': {
        const {
          workflow_id,
          recipient_email,
          recipient_name,
        } = body;

        if (!recipient_email || !recipient_name) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields for completion notice' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h2>Exit Workflow Completed</h2>
  <p>Dear ${recipient_name.split(' ')[0]},</p>
  <p>This is to confirm that your exit workflow has been completed.</p>
  <p>All final settlements and documentation have been processed.</p>
  <p>If you have any questions, please contact Human Resources.</p>
  <p>Sincerely,<br>Crave'n Inc. Human Resources</p>
</body>
</html>`;

        emailResult = await resend.emails.send({
          from: 'Crave\'n Delivery <notifications@cravenusa.com>',
          to: [recipient_email],
          subject: 'Exit Workflow Completed',
          html: emailHtml,
        });

        console.log('Completion notice sent:', {
          recipient_email,
          recipient_name,
          workflow_id,
          resendId: emailResult.data?.id,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown notification type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification sent successfully',
        resendId: emailResult.data?.id,
        type,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending exit notification:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

