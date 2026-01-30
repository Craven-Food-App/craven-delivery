// @ts-nocheck
// Provision new hire mailboxes and role aliases using Microsoft Graph (app-only)
// Requires env: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET
// Optional: GRAPH_LICENSE_SKU (for assignLicense), GRAPH_DOMAIN (default cravenusa.com)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const TENANT = Deno.env.get('GRAPH_TENANT_ID') || '';
const CLIENT = Deno.env.get('GRAPH_CLIENT_ID') || '';
const SECRET = Deno.env.get('GRAPH_CLIENT_SECRET') || '';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function token() {
  if (!TENANT || !CLIENT || !SECRET) {
    console.error('Missing Azure credentials:', { hasTenant: !!TENANT, hasClient: !!CLIENT, hasSecret: !!SECRET });
    throw new Error('Azure credentials not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET in Supabase Edge Function secrets.');
  }
  
  const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
  const form = new URLSearchParams();
  form.set('client_id', CLIENT);
  form.set('client_secret', SECRET);
  form.set('grant_type', 'client_credentials');
  form.set('scope', 'https://graph.microsoft.com/.default');
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Azure auth failed:', res.status, errorText);
    throw new Error(`Azure authentication failed: ${res.status} ${errorText}`);
  }
  const j = await res.json();
  return j.access_token as string;
}

function emailFor(first: string, last: string, code: string, domain: string) {
  const f = (first || '').trim().toLowerCase();
  const l = (last || '').trim().toLowerCase();
  const base = `${f[0] || ''}${l}`.replace(/[^a-z0-9]/g, '');
  const named = `${base}.${code}@${domain}`;
  const roleAlias = `${code}@${domain}`;
  return { named, roleAlias };
}

async function graph(path: string, method: string, body?: unknown, bearer?: string) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${bearer}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`graph_error ${method} ${path} ${res.status} ${txt}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const payload = await req.json();
    const domain = payload.domain || Deno.env.get('GRAPH_DOMAIN') || 'cravenusa.com';
    const { firstName, lastName, positionCode, personalEmail, executive, employeeId } = payload;
    const { named, roleAlias } = emailFor(firstName, lastName, positionCode, domain);

    console.log(`Provisioning M365 account for ${firstName} ${lastName} -> ${named}`);
    
    const bearer = await token();

    // 1) Ensure user exists (create if missing)
    let user = null;
    try {
      user = await graph(`/users/${encodeURIComponent(named)}`, 'GET', undefined, bearer);
    } catch (_) {
      // create
      const tempPassword = `Craven!${Math.floor(100000 + Math.random()*899999)}`;
      user = await graph('/users', 'POST', {
        accountEnabled: true,
        displayName: `${firstName} ${lastName}`,
        mailNickname: `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g,''),
        userPrincipalName: named,
        passwordProfile: { forceChangePasswordNextSignIn: true, password: tempPassword },
      }, bearer);
      // include temp password in response (never log in prod)
      user.__tempPassword = tempPassword;
    }

    // 2) Create M365 group for role alias if executive and not exists, and add user
    let group = null;
    if (executive) {
      const found = await graph(`/groups?$filter=mail eq '${roleAlias}'`, 'GET', undefined, bearer);
      if (found?.value?.length) {
        group = found.value[0];
      } else {
        // Create Microsoft 365 group with mailbox
        group = await graph('/groups', 'POST', {
          displayName: `${positionCode.toUpperCase()} Role Alias`,
          description: `${positionCode} role mail alias for ${domain}`,
          groupTypes: [ 'Unified' ],
          mailEnabled: true,
          mailNickname: positionCode,
          securityEnabled: false,
          visibility: 'Private'
        }, bearer);
        // Note: Graph assigns the primary SMTP; we need to set it to roleAlias
        // Best-effort: update proxyAddresses; if not permitted, admin can adjust in Exchange
        try {
          await graph(`/groups/${group.id}`, 'PATCH', { mailNickname: positionCode }, bearer);
        } catch (_) {}
      }
      // Add member/owner
      try {
        await graph(`/groups/${group.id}/members/$ref`, 'POST', { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}` }, bearer);
      } catch (_) {}
      try {
        await graph(`/groups/${group.id}/owners/$ref`, 'POST', { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}` }, bearer);
      } catch (_) {}
    }

    // 3) Send welcome email via Resend (reliable email system)
    if (personalEmail && user?.__tempPassword) {
      try {
        const emailResponse = await resend.emails.send({
          from: Deno.env.get('RESEND_FROM_EMAIL') || 'Crave\'N <onboarding@resend.dev>',
          to: [personalEmail],
          subject: 'Welcome to Craven Inc – Your company email and login',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Welcome, ${firstName} ${lastName}!</h2>
              <p>Your company email account has been created:</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${named}</p>
                ${executive && roleAlias ? `<p><strong>Role Alias:</strong> ${roleAlias}</p>` : ''}
                <p><strong>Temporary Password:</strong> ${user.__tempPassword}</p>
              </div>
              <p><strong>⚠️ You must change your password on first login.</strong></p>
              <div style="margin: 30px 0;">
                <a href="https://portal.office.com" style="background: #ff6b00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In to Office 365</a>
              </div>
              <p>For security, enroll in MFA: <a href="https://aka.ms/mfasetup">https://aka.ms/mfasetup</a></p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">Craven IT Team</p>
            </div>
          `
        });
        
        console.log('✅ Welcome email sent via Resend to:', personalEmail);
        
        // Track in email_logs
        try {
          const resendId = (emailResponse.data as any)?.id;
          await supabase.from('email_logs').insert({
            recipient_email: personalEmail,
            recipient_name: `${firstName} ${lastName}`,
            email_type: 'ms365_welcome',
            subject: 'Welcome to Craven Inc – Your company email and login',
            from_email: Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
            resend_email_id: resendId,
            status: 'sent',
            employee_id: employeeId || null
          });
        } catch (logErr) {
          console.error('Failed to log email:', logErr);
        }
      } catch (emailErr: any) {
        console.error('❌ Failed to send welcome email:', emailErr.message);
      }
    }

    // Track Microsoft 365 account creation in database
    try {
      if (user && user.id) {
        // Upsert to ms365_email_accounts
        await supabase.from('ms365_email_accounts').upsert({
          email_address: named,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
          ms365_user_id: user.id,
          ms365_user_principal_name: named,
          mailbox_type: 'user',
          role_alias: executive ? roleAlias : null,
          provisioning_status: 'active',
          provisioned_at: new Date().toISOString(),
          access_level: executive ? 10 : 5,
          employee_id: employeeId || null
        }, { onConflict: 'email_address' });
        
        console.log('✅ M365 account tracked in database:', named);
      }
    } catch (logError) {
      console.error('Error tracking M365 account:', logError);
      // Don't fail if tracking fails
    }

    return new Response(JSON.stringify({ ok: true, named, roleAlias: executive ? roleAlias : null, user, group }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});


