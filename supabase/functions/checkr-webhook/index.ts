import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

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

    // SECURITY: Rate limiting for webhook (30 per minute)
    const rateLimitResult = await checkRateLimit(req, supabaseClient, RateLimitPresets.API);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitResult.message || 'Too many webhook requests',
          resetIn: rateLimitResult.resetIn 
        }),
        { 
          status: 429, 
          headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
        }
      );
    }

    const webhookData = await req.json();
    console.log('Checkr webhook received:', webhookData.type);

    // Handle report completed event
    if (webhookData.type === 'report.completed') {
      const report = webhookData.data.object;
      
      // Find our database record
      const { data: dbReport, error: findError } = await supabaseClient
        .from('background_check_reports')
        .select('*')
        .eq('checkr_report_id', report.id)
        .single();

      if (findError || !dbReport) {
        console.error('Report not found in database:', report.id);
        throw new Error('Report not found');
      }

      // Extract results
      const criminalStatus = report.ssn_trace_status === 'clear' ? 'clear' : 'records_found';
      const mvrStatus = report.motor_vehicle_report?.status || 'pending';
      
      // Determine if admin review is needed
      const adminReviewRequired = 
        criminalStatus === 'records_found' ||
        mvrStatus === 'violations_found' ||
        report.status === 'consider';

      // Auto-reject criteria
      const autoReject = report.status === 'suspended';

      // Update database record
      const updates: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        checkr_status: report.status,
        criminal_search_status: criminalStatus,
        criminal_records: report.criminal_search || null,
        mvr_status: mvrStatus,
        mvr_records: report.motor_vehicle_report || null,
        ssn_trace_status: report.ssn_trace_status,
        admin_review_required: adminReviewRequired,
      };

      if (autoReject) {
        updates.admin_decision = 'rejected';
        updates.admin_review_notes = 'Auto-rejected due to serious offenses';
      } else if (!adminReviewRequired) {
        updates.admin_decision = 'approved';
        updates.admin_review_notes = 'Auto-approved - clean background check';
      }

      await supabaseClient
        .from('background_check_reports')
        .update(updates)
        .eq('id', dbReport.id);

      // Update application if auto-approved
      if (!adminReviewRequired && !autoReject) {
        await supabaseClient
          .from('craver_applications')
          .update({ background_check: true })
          .eq('id', dbReport.application_id);
      }

      // If auto-rejected, update application status
      if (autoReject) {
        await supabaseClient
          .from('craver_applications')
          .update({ 
            status: 'rejected',
            background_check: false
          })
          .eq('id', dbReport.application_id);
      }

      console.log('Background check processed:', {
        report_id: dbReport.id,
        status: report.status,
        admin_review_required: adminReviewRequired,
        auto_reject: autoReject
      });

      // TODO: Send email notifications to applicant
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
