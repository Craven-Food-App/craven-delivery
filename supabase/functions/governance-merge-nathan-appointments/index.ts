import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
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

    // Find all Nathan Curry appointments
    const { data: appointments, error: fetchError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .or('proposed_officer_email.ilike.%natecurry%,proposed_officer_name.ilike.%nathan%curry%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch appointments: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No Nathan Curry appointments found',
          appointments_found: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${appointments.length} Nathan Curry appointments`);

    // Find the appointment with the most documents (this will be our primary)
    let primaryAppointment = null;
    let maxDocCount = -1;

    for (const apt of appointments) {
      let docCount = 0;
      if (apt.appointment_letter_url) docCount++;
      if (apt.board_resolution_url) docCount++;
      if (apt.certificate_url) docCount++;
      if (apt.employment_agreement_url) docCount++;
      if (apt.confidentiality_ip_url) docCount++;
      if (apt.stock_subscription_url) docCount++;
      if (apt.deferred_compensation_url) docCount++;
      if ((apt as any).pre_incorporation_consent_url) docCount++;

      if (docCount > maxDocCount) {
        maxDocCount = docCount;
        primaryAppointment = apt;
      }
    }

    if (!primaryAppointment) {
      return new Response(
        JSON.stringify({ error: 'Could not determine primary appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Primary appointment: ${primaryAppointment.id} with ${maxDocCount} documents`);

    // Merge all documents from other appointments into the primary
    const mergedDocuments: Record<string, string> = {};
    const mergedAppointmentIds: string[] = [];

    // Start with primary appointment's documents
    if (primaryAppointment.appointment_letter_url) mergedDocuments['appointment_letter_url'] = primaryAppointment.appointment_letter_url;
    if (primaryAppointment.board_resolution_url) mergedDocuments['board_resolution_url'] = primaryAppointment.board_resolution_url;
    if (primaryAppointment.certificate_url) mergedDocuments['certificate_url'] = primaryAppointment.certificate_url;
    if (primaryAppointment.employment_agreement_url) mergedDocuments['employment_agreement_url'] = primaryAppointment.employment_agreement_url;
    if (primaryAppointment.confidentiality_ip_url) mergedDocuments['confidentiality_ip_url'] = primaryAppointment.confidentiality_ip_url;
    if (primaryAppointment.stock_subscription_url) mergedDocuments['stock_subscription_url'] = primaryAppointment.stock_subscription_url;
    if (primaryAppointment.deferred_compensation_url) mergedDocuments['deferred_compensation_url'] = primaryAppointment.deferred_compensation_url;
    if ((primaryAppointment as any).pre_incorporation_consent_url) mergedDocuments['pre_incorporation_consent_url'] = (primaryAppointment as any).pre_incorporation_consent_url;

    // Merge documents from other appointments
    for (const apt of appointments) {
      if (apt.id === primaryAppointment.id) continue; // Skip primary

      console.log(`Merging documents from appointment ${apt.id}...`);

      // Merge each document type if primary doesn't have it
      if (!mergedDocuments['appointment_letter_url'] && apt.appointment_letter_url) {
        mergedDocuments['appointment_letter_url'] = apt.appointment_letter_url;
        console.log(`  → Merged appointment_letter_url from ${apt.id}`);
      }
      if (!mergedDocuments['board_resolution_url'] && apt.board_resolution_url) {
        mergedDocuments['board_resolution_url'] = apt.board_resolution_url;
        console.log(`  → Merged board_resolution_url from ${apt.id}`);
      }
      if (!mergedDocuments['certificate_url'] && apt.certificate_url) {
        mergedDocuments['certificate_url'] = apt.certificate_url;
        console.log(`  → Merged certificate_url from ${apt.id}`);
      }
      if (!mergedDocuments['employment_agreement_url'] && apt.employment_agreement_url) {
        mergedDocuments['employment_agreement_url'] = apt.employment_agreement_url;
        console.log(`  → Merged employment_agreement_url from ${apt.id}`);
      }
      if (!mergedDocuments['confidentiality_ip_url'] && apt.confidentiality_ip_url) {
        mergedDocuments['confidentiality_ip_url'] = apt.confidentiality_ip_url;
        console.log(`  → Merged confidentiality_ip_url from ${apt.id}`);
      }
      if (!mergedDocuments['stock_subscription_url'] && apt.stock_subscription_url) {
        mergedDocuments['stock_subscription_url'] = apt.stock_subscription_url;
        console.log(`  → Merged stock_subscription_url from ${apt.id}`);
      }
      if (!mergedDocuments['deferred_compensation_url'] && apt.deferred_compensation_url) {
        mergedDocuments['deferred_compensation_url'] = apt.deferred_compensation_url;
        console.log(`  → Merged deferred_compensation_url from ${apt.id}`);
      }
      if (!mergedDocuments['pre_incorporation_consent_url'] && (apt as any).pre_incorporation_consent_url) {
        mergedDocuments['pre_incorporation_consent_url'] = (apt as any).pre_incorporation_consent_url;
        console.log(`  → Merged pre_incorporation_consent_url from ${apt.id}`);
      }

      // Also merge board_resolution_id if primary doesn't have it
      if (!primaryAppointment.board_resolution_id && apt.board_resolution_id) {
        mergedDocuments['board_resolution_id'] = apt.board_resolution_id;
        console.log(`  → Merged board_resolution_id from ${apt.id}`);
      }

      mergedAppointmentIds.push(apt.id);
    }

    // Update primary appointment with all merged documents
    console.log(`Updating primary appointment ${primaryAppointment.id} with merged documents...`);
    const { error: updateError } = await supabaseAdmin
      .from('executive_appointments')
      .update(mergedDocuments)
      .eq('id', primaryAppointment.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update primary appointment: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully updated primary appointment with ${Object.keys(mergedDocuments).length} document fields`);

    // Delete or mark other appointments as duplicates
    // Option: Delete them, or mark them with a status
    const deleteResults = [];
    for (const aptId of mergedAppointmentIds) {
      try {
        // First, check if there are any dependencies
        const { data: deps } = await supabaseAdmin
          .from('appointment_documents')
          .select('id')
          .eq('appointment_id', aptId)
          .limit(1);

        if (deps && deps.length > 0) {
          // Mark as duplicate instead of deleting
          const { error: markError } = await supabaseAdmin
            .from('executive_appointments')
            .update({ 
              status: 'MERGED',
              notes: `Merged into appointment ${primaryAppointment.id} on ${new Date().toISOString()}`,
            })
            .eq('id', aptId);

          if (markError) {
            console.error(`Failed to mark ${aptId} as merged:`, markError);
            deleteResults.push({ id: aptId, action: 'mark_failed', error: markError.message });
          } else {
            console.log(`Marked appointment ${aptId} as MERGED`);
            deleteResults.push({ id: aptId, action: 'marked_merged' });
          }
        } else {
          // Safe to delete
          const { error: deleteError } = await supabaseAdmin
            .from('executive_appointments')
            .delete()
            .eq('id', aptId);

          if (deleteError) {
            console.error(`Failed to delete ${aptId}:`, deleteError);
            deleteResults.push({ id: aptId, action: 'delete_failed', error: deleteError.message });
          } else {
            console.log(`Deleted duplicate appointment ${aptId}`);
            deleteResults.push({ id: aptId, action: 'deleted' });
          }
        }
      } catch (err: any) {
        console.error(`Error processing appointment ${aptId}:`, err);
        deleteResults.push({ id: aptId, action: 'error', error: err.message });
      }
    }

    const finalDocCount = Object.keys(mergedDocuments).filter(k => k.endsWith('_url')).length;
    const hasResolution = !!mergedDocuments['board_resolution_id'];

    return new Response(
      JSON.stringify({
        success: true,
        message: `Merged ${appointments.length} appointments into primary appointment`,
        primary_appointment_id: primaryAppointment.id,
        primary_appointment_name: primaryAppointment.proposed_officer_name,
        documents_merged: finalDocCount,
        has_board_resolution: hasResolution,
        merged_appointments: mergedAppointmentIds.length,
        merge_results: deleteResults,
        merged_documents: Object.keys(mergedDocuments).filter(k => k.endsWith('_url')),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-merge-nathan-appointments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

