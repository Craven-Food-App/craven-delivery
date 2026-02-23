import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

interface CostAlert {
  id: string;
  alert_type: string;
  severity: string;
  category_id: string;
  vendor_id?: string;
  title: string;
  message: string;
  variance_percentage?: number;
  estimated_impact?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for cost variances and create alerts
    const { data: varianceData, error: varianceError } = await supabase
      .rpc("check_cost_variances");

    if (varianceError) {
      console.error("Error checking variances:", varianceError);
      throw varianceError;
    }

    // Auto-create alerts for variances > 5%
    const { data: alertCount, error: alertError } = await supabase
      .rpc("auto_create_cost_alerts");

    if (alertError) {
      console.error("Error creating alerts:", alertError);
    }

    // Get active alerts that need notification
    const { data: alerts, error: alertsError } = await supabase
      .from("tech_cost_alerts")
      .select(`
        *,
        category:tech_cost_categories(name),
        vendor:tech_vendors(name, service_name)
      `)
      .eq("status", "active")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order("created_at", { ascending: false });

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      throw alertsError;
    }

    // Get CTO and CFO emails
    const { data: execUsers, error: execError } = await supabase
      .from("exec_users")
      .select("user_id, role")
      .in("role", ["cto", "cfo", "ceo"]);

    const recipientEmails: string[] = [];
    if (!execError && execUsers) {
      // Fetch emails from auth.users
      for (const exec of execUsers) {
        const { data: authUser } = await supabase.auth.admin.getUserById(exec.user_id);
        if (authUser?.user?.email) {
          recipientEmails.push(authUser.user.email);
        }
      }
    }

    // Fallback to default emails if no exec users found
    if (recipientEmails.length === 0) {
      recipientEmails.push("cto@cravenusa.com", "cfo@cravenusa.com");
    }

    // Send notifications for each alert
    const notifications = [];
    for (const alert of alerts || []) {
      const alertData = alert as any;
      
      // Send email
      if (recipientEmails.length > 0) {
        try {
          const emailResult = await resend.emails.send({
            from: Deno.env.get("RESEND_FROM_EMAIL") || "Crave'n Finance <finance@cravenusa.com>",
            to: recipientEmails,
            subject: `🚨 Tech Cost Alert: ${alertData.title}`,
            html: buildAlertEmail(alertData),
          });

          // Log notification
          await supabase.from("tech_cost_alert_notifications").insert({
            alert_id: alertData.id,
            notification_type: "email",
            recipient_email: recipientEmails.join(", "),
            status: emailResult.error ? "failed" : "sent",
            error_message: emailResult.error?.message,
          });

          notifications.push({ type: "email", status: emailResult.error ? "failed" : "sent" });
        } catch (error: any) {
          console.error("Error sending email:", error);
        }
      }

      // Send Slack notification
      if (SLACK_WEBHOOK_URL) {
        try {
          const slackMessage = buildSlackMessage(alertData);
          const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackMessage),
          });

          await supabase.from("tech_cost_alert_notifications").insert({
            alert_id: alertData.id,
            notification_type: "slack",
            slack_channel: "#tech-costs",
            status: slackResponse.ok ? "sent" : "failed",
            error_message: slackResponse.ok ? null : await slackResponse.text(),
          });

          notifications.push({ type: "slack", status: slackResponse.ok ? "sent" : "failed" });
        } catch (error: any) {
          console.error("Error sending Slack notification:", error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_checked: varianceData?.length || 0,
        alerts_created: alertCount || 0,
        notifications_sent: notifications.length,
        notifications,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in tech-cost-monitor:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildAlertEmail(alert: any): string {
  const severityColorMap: Record<string, string> = {
    critical: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  const severityColor = severityColorMap[alert.severity as string] || "#6b7280";

  const categoryName = alert.category?.name || "Unknown Category";
  const vendorName = alert.vendor ? `${alert.vendor.name} - ${alert.vendor.service_name}` : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background: white; border-left: 4px solid ${severityColor}; padding: 15px; margin: 20px 0; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .metric-label { font-weight: 600; color: #6b7280; }
        .metric-value { font-weight: 700; color: #111827; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        .cta-button { background: ${severityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🚨 Tech Cost Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${alert.title}</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>${alert.message}</strong></p>
          </div>
          
          <div class="metric">
            <span class="metric-label">Category:</span>
            <span class="metric-value">${categoryName}</span>
          </div>
          ${vendorName ? `
          <div class="metric">
            <span class="metric-label">Vendor:</span>
            <span class="metric-value">${vendorName}</span>
          </div>
          ` : ''}
          ${alert.variance_percentage ? `
          <div class="metric">
            <span class="metric-label">Variance:</span>
            <span class="metric-value">${alert.variance_percentage > 0 ? '+' : ''}${alert.variance_percentage.toFixed(1)}%</span>
          </div>
          ` : ''}
          ${alert.estimated_impact ? `
          <div class="metric">
            <span class="metric-label">Estimated Impact:</span>
            <span class="metric-value">$${alert.estimated_impact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
          <div class="metric">
            <span class="metric-label">Severity:</span>
            <span class="metric-value" style="text-transform: capitalize;">${alert.severity}</span>
          </div>
          
          <div style="text-align: center;">
            <a href="https://feeder.crave-n.com/cto-portal?section=costs" class="cta-button">
              View in CTO Portal →
            </a>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 Crave'n. This is an automated financial operations alert.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildSlackMessage(alert: any): any {
  const categoryName = alert.category?.name || "Unknown Category";
  const vendorName = alert.vendor ? `${alert.vendor.name} - ${alert.vendor.service_name}` : null;
  
  const severityEmojiMap: Record<string, string> = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };
  const severityEmoji = severityEmojiMap[alert.severity as string] || "⚪";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${severityEmoji} Tech Cost Alert: ${alert.title}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${alert.message}*`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Category:*\n${categoryName}`,
        },
        {
          type: "mrkdwn",
          text: `*Severity:*\n${alert.severity.toUpperCase()}`,
        },
      ],
    },
  ];

  if (vendorName) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Vendor:* ${vendorName}`,
      },
    });
  }

  if (alert.variance_percentage) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Variance:* ${alert.variance_percentage > 0 ? '+' : ''}${alert.variance_percentage.toFixed(1)}%`,
      },
    });
  }

  if (alert.estimated_impact) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Estimated Impact:* $${alert.estimated_impact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    });
  }

  blocks.push({
    type: "actions",
    block_id: "actions_block",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View in CTO Portal",
        },
        url: "https://feeder.crave-n.com/cto-portal?section=costs",
        style: "primary",
        action_id: "view_cto_portal",
      },
    ],
  } as any);

  return {
    text: `Tech Cost Alert: ${alert.title}`,
    blocks,
  };
}

