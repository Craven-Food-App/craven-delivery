import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    const { application_id } = await req.json();

    // Fetch application data
    const { data: application, error: appError } = await supabaseClient
      .from('craver_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    // Create Checkr candidate
    const checkrApiKey = Deno.env.get('CHECKR_API_KEY');
    if (!checkrApiKey) {
      console.log('Checkr API key not configured - creating mock report for testing');
      
      // Create mock background check report for testing
      const { data: report, error: reportError } = await supabaseClient
        .from('background_check_reports')
        .insert({
          application_id: application.id,
          user_id: application.user_id,
          status: 'in_progress',
          checkr_status: 'pending',
          checkr_package: 'mvr_driver'
        })
        .select()
        .single();

      if (reportError) {
        throw reportError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          report_id: report.id,
          message: 'Mock background check initiated (Checkr not configured)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create Checkr candidate
    const candidateResponse = await fetch('https://api.checkr.com/v1/candidates', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(checkrApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        dob: application.date_of_birth,
        ssn: application.ssn,
        zipcode: application.zip_code,
      }),
    });

    if (!candidateResponse.ok) {
      throw new Error(`Checkr candidate creation failed: ${await candidateResponse.text()}`);
    }

    const candidate = await candidateResponse.json();
    console.log('Checkr candidate created:', candidate.id);

    // Order background check report
    const reportResponse = await fetch('https://api.checkr.com/v1/reports', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(checkrApiKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        package: 'mvr_driver',
      }),
    });

    if (!reportResponse.ok) {
      throw new Error(`Checkr report order failed: ${await reportResponse.text()}`);
    }

    const checkrReport = await reportResponse.json();
    console.log('Checkr report ordered:', checkrReport.id);

    // Store in database
    const { data: report, error: reportError } = await supabaseClient
      .from('background_check_reports')
      .insert({
        application_id: application.id,
        user_id: application.user_id,
        checkr_candidate_id: candidate.id,
        checkr_report_id: checkrReport.id,
        status: 'in_progress',
        checkr_status: checkrReport.status,
        checkr_package: 'mvr_driver'
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    // Update application with report reference
    await supabaseClient
      .from('craver_applications')
      .update({ background_check_report_id: report.id })
      .eq('id', application.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: report.id,
        checkr_report_id: checkrReport.id,
        estimated_completion: '1-3 business days'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error initiating background check:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
