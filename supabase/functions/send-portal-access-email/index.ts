import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PortalAccessRequest {
  email: string;
  name: string;
  portals: Array<'board'|'ceo'|'admin'|'cfo'>;
  tempPassword?: string;
  employeeId?: string; // Optional: employee_id for tracking
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, portals, tempPassword, employeeId }: PortalAccessRequest = await req.json();

    // Create auth invite if user doesn't exist
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, filter: { email } as any });
    if (!existing || (existing.users || []).length === 0) {
      await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: name } });
    }

    const appUrl = 'https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com';
    const links: string[] = [];
    if (portals.includes('board')) links.push(`<a href="${appUrl.replace('https://','https://board.')}" style="display:inline-block;margin:4px 6px;padding:10px 16px;background:#0ea5e9;color:#fff;border-radius:6px;text-decoration:none;">Open Board Portal</a>`);
    if (portals.includes('ceo')) links.push(`<a href="${appUrl.replace('https://','https://ceo.')}" style="display:inline-block;margin:4px 6px;padding:10px 16px;background:#10b981;color:#fff;border-radius:6px;text-decoration:none;">Open CEO Command Center</a>`);
    if (portals.includes('admin')) links.push(`<a href="${appUrl}/admin" style="display:inline-block;margin:4px 6px;padding:10px 16px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">Open Admin Portal</a>`);
    if (portals.includes('cfo')) links.push(`<a href="${appUrl.replace('https://','https://cfo.')}" style="display:inline-block;margin:4px 6px;padding:10px 16px;background:#fb923c;color:#fff;border-radius:6px;text-decoration:none;">Open CFO Portal</a>`);

    const emailResponse = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') || "Crave'N <onboarding@resend.dev>",
      to: [email],
      subject: `Your Crave'N portal access`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
          <h2 style="margin:0 0 8px 0;">Welcome, ${name}</h2>
          <p style="color:#374151;">Your Crave'N access has been set up. Use the links below to access your portals. If prompted, complete your account using the email invitation we sent.</p>
          <div style="margin:16px 0;">
            ${links.join(' ')}
          </div>
          ${tempPassword ? `<div style="margin-top:12px;padding:12px;border:1px dashed #94a3b8;border-radius:8px;background:#0b1220;color:#e5e7eb;">
            <div style="font-weight:700;margin-bottom:4px;">Temporary Login</div>
            <div style="font-family:monospace;">Email: ${email}<br/>Password: ${tempPassword}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:6px;">Please change your password after first login.</div>
          </div>` : ''}
          <p style="color:#6b7280;font-size:12px;">If you didn't request this, please ignore.</p>
        </div>
      `,
    });

    // Log email to database
    try {
      const resendId = (emailResponse.data as any)?.id;
      await supabase.from('email_logs').insert({
        recipient_email: email,
        recipient_name: name,
        email_type: 'portal_access',
        subject: `Your Crave'N portal access`,
        from_email: Deno.env.get('RESEND_FROM_EMAIL') || "Crave'N <onboarding@resend.dev>",
        resend_email_id: resendId,
        status: 'sent',
        employee_id: employeeId || null
      });
    } catch (logError) {
      console.error('Error logging portal access email:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


