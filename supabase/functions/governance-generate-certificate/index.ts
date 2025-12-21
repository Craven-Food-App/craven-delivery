import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      recipient_user_id,
      shares_amount,
      share_class = 'Common',
      resolution_id,
      appointment_id,
    } = body;

    if (!recipient_user_id || !shares_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient_user_id or shares_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient info
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(recipient_user_id);
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', recipient_user_id)
      .maybeSingle();

    const recipientName = profile?.full_name || user?.email?.split('@')[0] || 'Shareholder';

    // Get company info
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['company_name', 'state_of_incorporation']);

    const companyName = companySettings?.find(s => s.setting_key === 'company_name')?.setting_value || 'Crave\'n, Inc.';
    const state = companySettings?.find(s => s.setting_key === 'state_of_incorporation')?.setting_value || 'Delaware';

    // Generate certificate number
    let certNumber: string;
    const { data: certNumData, error: certNumError } = await supabaseAdmin.rpc('generate_certificate_number');
    
    if (certNumError || !certNumData) {
      // Fallback: generate manually
      const year = new Date().getFullYear();
      const { count } = await supabaseAdmin
        .from('share_certificates')
        .select('*', { count: 'exact', head: true });
      const nextNum = (count || 0) + 1;
      certNumber = `CERT-${year}-${String(nextNum).padStart(6, '0')}`;
    } else {
      certNumber = certNumData as string;
    }

    // Get appointment details if available
    let appointmentData: any = {};
    if (appointment_id) {
      const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .maybeSingle();
      appointmentData = appointment || {};
    }

    // Get resolution details if available
    let resolutionData: any = {};
    if (resolution_id) {
      const { data: resolution } = await supabaseAdmin
        .from('governance_board_resolutions')
        .select('*')
        .eq('id', resolution_id)
        .maybeSingle();
      resolutionData = resolution || {};
    }

    // Get stock certificate template
    const { data: template } = await supabaseAdmin
      .from('document_templates')
      .select('html_content')
      .eq('template_key', 'stock_certificate')
      .eq('is_active', true)
      .single();

    if (!template) {
      return new Response(
        JSON.stringify({ error: 'Stock certificate template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare template data
    const templateData: Record<string, any> = {
      certificate_number: certNumber,
      shareholder_name: recipientName,
      shares_amount: shares_amount.toLocaleString(),
      share_class: share_class,
      company_name: companyName,
      state: state,
      issue_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      effective_date: appointmentData.effective_date || new Date().toISOString().split('T')[0],
      resolution_number: resolutionData.resolution_number || 'N/A',
      resolution_date: resolutionData.meeting_date || new Date().toISOString().split('T')[0],
    };

    // Interpolate template
    let html = template.html_content;
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      html = html.replace(regex, String(templateData[key] || ''));
    });

    // Upload HTML to storage
    const bucket = 'governance-certificates';
    const fileName = `certificates/${certNumber}_${Date.now()}.html`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, new Blob([html], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Create certificate record
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('share_certificates')
      .insert({
        certificate_number: certNumber,
        recipient_user_id,
        shares_amount,
        share_class,
        issue_date: new Date().toISOString().split('T')[0],
        resolution_id,
        appointment_id,
        document_url: urlData?.publicUrl || '',
        html_template: html,
        status: 'issued',
      })
      .select()
      .single();

    if (certError) {
      throw certError;
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'certificate_issued',
      p_action_category: 'equity',
      p_target_type: 'certificate',
      p_target_id: certificate.id,
      p_target_name: `Certificate ${certNumber}`,
      p_description: `Share certificate issued: ${certNumber} for ${shares_amount} shares`,
      p_metadata: {
        certificate_number: certNumber,
        shares_amount,
        recipient_user_id,
        resolution_id,
        appointment_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        certificate_id: certificate.id,
        certificate_number: certNumber,
        document_url: urlData?.publicUrl || '',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-generate-certificate:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

