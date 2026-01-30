import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface InvestorDemoInviteRequest {
  email: string;
  fullName?: string;
  organization?: string;
  notes?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the requesting user is authorized (CEO/Admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is CEO or admin
    const isCEO = user.email === 'tstroman.ceo@cravenusa.com';
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'ceo', 'super_admin']);

    if (!isCEO && (!roles || roles.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, fullName, organization, notes }: InvestorDemoInviteRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique access token
    const { data: tokenData } = await supabase.rpc('generate_investor_access_token');
    const accessToken = tokenData as string;

    // Create or update investor demo access record
    const { data: accessRecord, error: dbError } = await supabase
      .from('investor_demo_access')
      .upsert({
        email: email.toLowerCase().trim(),
        full_name: fullName || null,
        organization: organization || null,
        access_token: accessToken,
        status: 'invited',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        notes: notes || null,
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create access record', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link
    const appUrl = Deno.env.get('APP_URL') || 'https://hq.cravenusa.com';
    const magicLink = `${appUrl}/investor-demo?token=${accessToken}`;

    // Send invitation email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Access created but email not sent (RESEND_API_KEY not configured)',
          accessRecord,
          magicLink // Return link for testing
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Investor Demo Access - Crave'N Platform</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Crave'N Platform Demo</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Investor Preview Access</p>
        </div>
        
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            ${fullName ? `Hi ${fullName},` : 'Hello,'}
          </p>
          
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            You've been granted exclusive access to preview the Crave'N last-mile delivery platform. Experience our ecosystem from three perspectives:
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #667eea;">Platform Views Available:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;"><strong>Customer Experience</strong> – Browse restaurants, place orders, track deliveries</li>
              <li style="margin: 8px 0;"><strong>Merchant Dashboard</strong> – Order management, menu configuration, analytics</li>
              <li style="margin: 8px 0;"><strong>Driver Mobile View</strong> – Delivery interface, earnings tracker, navigation</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; margin: 25px 0 20px 0;">
            All data in this demo is <strong>mock data for demonstration purposes only</strong> and does not reflect actual platform activity.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${magicLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
              Access Demo Portal
            </a>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⏰ Access expires in 90 days</strong><br>
              This magic link is unique to you. No password required.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin: 25px 0 5px 0;">
            Questions? Contact <a href="mailto:tstroman.ceo@cravenusa.com" style="color: #667eea; text-decoration: none;">tstroman.ceo@cravenusa.com</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.5;">
            <strong>Crave'N Inc.</strong><br>
            Last-Mile Delivery & Logistics Platform<br>
            Confidential - For Investor Use Only
          </p>
        </div>
      </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Crave\'N Investor Relations <investors@cravenusa.com>',
      to: [email],
      subject: '🚀 Your Exclusive Access to the Crave\'N Platform Demo',
      html: emailHtml
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send email',
          details: emailError,
          accessRecord // Still return record for manual follow-up
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Investor demo invite sent to:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Investor demo invite sent successfully',
        email,
        accessRecord,
        emailId: emailData?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending investor demo invite:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

