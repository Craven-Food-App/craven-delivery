import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (Corporate Secretary, Founder, or CEO)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_FOUNDER', 'CRAVEN_CEO']);

    const { data: execUser } = await supabase
      .from('exec_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ceo')
      .single();

    const hasPermission = 
      (userRoles && userRoles.length > 0) || 
      execUser || 
      user.email === 'craven@usa.com';

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Only Corporate Secretary, Founder, or CEO can backfill documents' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const appointment_id = body.appointment_id; // Optional: specific appointment, or null for all
    const force_regenerate = body.force_regenerate === true; // If true, regenerate even if documents exist

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch appointments
    let query = supabaseAdmin.from('executive_appointments').select('*');
    
    if (appointment_id) {
      query = query.eq('id', appointment_id);
    }

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No appointments found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    interface ResultItem {
      appointment_id: string;
      appointment_name: string;
      status: string;
      documents_generated: string[];
      documents_queued: string[];
      errors: string[] | null;
      reason_no_docs: string | null;
    }

    const results: ResultItem[] = [];

    // FORTUNE 500 DOCUMENT GENERATION FLOW (14 Documents)
    for (const appointment of appointments) {
      const docTypes: string[] = [];
      
      // Determine which documents to generate based on status
      // If force_regenerate is true, ignore existing documents and regenerate all
      // IMPORTANT: When force_regenerate is true, we ALWAYS regenerate, regardless of existing URLs
      
      // Check existing documents (only if not force_regenerate)
      const hasAppointmentLetter = !force_regenerate && appointment.appointment_letter_url && String(appointment.appointment_letter_url).trim() !== '';
      const hasBoardResolution = !force_regenerate && appointment.board_resolution_url && String(appointment.board_resolution_url).trim() !== '';
      const hasCertificate = !force_regenerate && appointment.certificate_url && String(appointment.certificate_url).trim() !== '';
      const hasEmploymentAgreement = !force_regenerate && appointment.employment_agreement_url && String(appointment.employment_agreement_url).trim() !== '';
      const hasDeferredCompensation = !force_regenerate && (appointment as any).deferred_compensation_url && String((appointment as any).deferred_compensation_url).trim() !== '';
      const hasConfidentialityIP = !force_regenerate && (appointment as any).confidentiality_ip_url && String((appointment as any).confidentiality_ip_url).trim() !== '';
      const hasStockSubscription = !force_regenerate && (appointment as any).stock_subscription_url && String((appointment as any).stock_subscription_url).trim() !== '';
      const hasPreIncorporationConsent = !force_regenerate && 
        (appointment as any).pre_incorporation_consent_url && 
        String((appointment as any).pre_incorporation_consent_url).trim() !== '';
      
      // NEW: Fortune 500 additional documents
      const hasCertificateOfIncorporation = !force_regenerate && (appointment as any).certificate_of_incorporation_url && String((appointment as any).certificate_of_incorporation_url).trim() !== '';
      const hasBylaws = !force_regenerate && (appointment as any).bylaws_url && String((appointment as any).bylaws_url).trim() !== '';
      const hasBylawsAcknowledgment = !force_regenerate && (appointment as any).bylaws_acknowledgment_url && String((appointment as any).bylaws_acknowledgment_url).trim() !== '';
      const hasFiduciaryEthics = !force_regenerate && (appointment as any).fiduciary_ethics_url && String((appointment as any).fiduciary_ethics_url).trim() !== '';
      const hasConflictDisclosure = !force_regenerate && (appointment as any).conflict_disclosure_url && String((appointment as any).conflict_disclosure_url).trim() !== '';
      const hasOfficerIndemnification = !force_regenerate && (appointment as any).officer_indemnification_url && String((appointment as any).officer_indemnification_url).trim() !== '';
      const hasEquityPlan = !force_regenerate && (appointment as any).equity_plan_url && String((appointment as any).equity_plan_url).trim() !== '';
      const hasOptionRSUAward = !force_regenerate && (appointment as any).option_rsu_award_url && String((appointment as any).option_rsu_award_url).trim() !== '';
      
      console.log(`Processing appointment ${appointment.id}: force_regenerate=${force_regenerate}, status=${appointment.status}`);
      console.log(`Existing documents check (ignored if force_regenerate):`, {
        hasAppointmentLetter,
        hasBoardResolution,
        hasCertificate,
        hasEmploymentAgreement,
        hasConfidentialityIP,
        hasStockSubscription,
        hasDeferredCompensation,
        hasPreIncorporationConsent,
        // Fortune 500 additional documents
        hasCertificateOfIncorporation,
        hasBylaws,
        hasBylawsAcknowledgment,
        hasFiduciaryEthics,
        hasConflictDisclosure,
        hasOfficerIndemnification,
        hasEquityPlan,
        hasOptionRSUAward,
      });
      
      // If force_regenerate is true, ALWAYS generate ALL documents regardless of status
      if (force_regenerate) {
        console.log(`[${appointment.id}] FORCE REGENERATE MODE: Adding ALL 14 FORTUNE 500 documents to queue`);
        
        // Core Employment Documents
        docTypes.push('appointment_letter');
        docTypes.push('employment_agreement');
        docTypes.push('confidentiality_ip');
        
        // Board & Formation Documents
        docTypes.push('board_resolution');
        if ((appointment as any).formation_mode) {
          docTypes.push('pre_incorporation_consent');
          docTypes.push('certificate_of_incorporation');
        }
        docTypes.push('bylaws');
        
        // Governance Documents (ALWAYS REQUIRED)
        docTypes.push('bylaws_acknowledgment');
        docTypes.push('fiduciary_ethics_ack');
        docTypes.push('conflict_disclosure');
        docTypes.push('officer_indemnification');
        
        // Equity Documents (conditional)
        if (appointment.equity_included) {
          docTypes.push('certificate'); // Stock certificate
          docTypes.push('stock_subscription');
          docTypes.push('equity_incentive_plan');
          docTypes.push('option_rsu_award');
        }
        
        // Deferred Compensation (conditional)
        const needsDeferredComp = appointment.equity_included || 
          (appointment.compensation_structure && String(appointment.compensation_structure).toLowerCase().includes('deferred'));
        if (needsDeferredComp) {
          docTypes.push('deferred_compensation');
        }
        
        console.log(`[${appointment.id}] FORCE REGENERATE: Queued ${docTypes.length} Fortune 500 documents:`, docTypes);
        console.log(`[${appointment.id}] Appointment details:`, {
          equity_included: appointment.equity_included,
          formation_mode: (appointment as any).formation_mode,
          compensation_structure: appointment.compensation_structure,
        });
      } else {
        // Normal flow: generate based on status
        switch (appointment.status) {
        case 'DRAFT':
          // FORTUNE 500: Generate ALL 14 documents for DRAFT status
          // Core Employment Documents
          if (!hasAppointmentLetter) docTypes.push('appointment_letter');
          if (!hasEmploymentAgreement) docTypes.push('employment_agreement');
          if (!hasConfidentialityIP) docTypes.push('confidentiality_ip');
          
          // Board & Formation Documents
          if (!hasBoardResolution) docTypes.push('board_resolution');
          if ((appointment as any).formation_mode) {
            if (!hasPreIncorporationConsent) docTypes.push('pre_incorporation_consent');
            if (!hasCertificateOfIncorporation) docTypes.push('certificate_of_incorporation');
          }
          if (!hasBylaws) docTypes.push('bylaws');
          
          // Governance Documents (ALWAYS REQUIRED for Fortune 500)
          if (!hasBylawsAcknowledgment) docTypes.push('bylaws_acknowledgment');
          if (!hasFiduciaryEthics) docTypes.push('fiduciary_ethics_ack');
          if (!hasConflictDisclosure) docTypes.push('conflict_disclosure');
          if (!hasOfficerIndemnification) docTypes.push('officer_indemnification');
          
          // Equity Documents (conditional)
          if (appointment.equity_included) {
            if (!hasCertificate) docTypes.push('certificate');
            if (!hasStockSubscription) docTypes.push('stock_subscription');
            if (!hasEquityPlan) docTypes.push('equity_incentive_plan');
            if (!hasOptionRSUAward) docTypes.push('option_rsu_award');
          }
          
          // Deferred Compensation (conditional)
          const needsDeferredComp = appointment.equity_included || 
            (appointment.compensation_structure && String(appointment.compensation_structure).toLowerCase().includes('deferred'));
          if (needsDeferredComp && !hasDeferredCompensation) {
            docTypes.push('deferred_compensation');
          }
          break;
        
        case 'SENT_TO_BOARD':
          // Appointment letter + board resolution + governance docs
          if (!hasAppointmentLetter) docTypes.push('appointment_letter');
          if (!hasBoardResolution && appointment.board_resolution_id) docTypes.push('board_resolution');
          if (!hasBylaws) docTypes.push('bylaws');
          if (!hasBylawsAcknowledgment) docTypes.push('bylaws_acknowledgment');
          break;
        
        case 'APPROVED':
          // FORTUNE 500: All 14 documents for approved appointments - complete legal package
          // Core Employment Documents
          if (!hasAppointmentLetter) docTypes.push('appointment_letter');
          if (!hasEmploymentAgreement) docTypes.push('employment_agreement');
          if (!hasConfidentialityIP) docTypes.push('confidentiality_ip');
          
          // Board & Formation Documents
          if (!hasBoardResolution && appointment.board_resolution_id) docTypes.push('board_resolution');
          if ((appointment as any).formation_mode) {
            if (!hasPreIncorporationConsent) docTypes.push('pre_incorporation_consent');
            if (!hasCertificateOfIncorporation) docTypes.push('certificate_of_incorporation');
          }
          if (!hasBylaws) docTypes.push('bylaws');
          
          // Governance Documents (ALWAYS REQUIRED)
          if (!hasBylawsAcknowledgment) docTypes.push('bylaws_acknowledgment');
          if (!hasFiduciaryEthics) docTypes.push('fiduciary_ethics_ack');
          if (!hasConflictDisclosure) docTypes.push('conflict_disclosure');
          if (!hasOfficerIndemnification) docTypes.push('officer_indemnification');
          
          // Equity Documents (conditional)
          if (appointment.equity_included) {
            if (!hasCertificate) docTypes.push('certificate');
            if (!hasStockSubscription) docTypes.push('stock_subscription');
            if (!hasEquityPlan) docTypes.push('equity_incentive_plan');
            if (!hasOptionRSUAward) docTypes.push('option_rsu_award');
          }
          
          // Deferred Compensation (conditional)
          if (!hasDeferredCompensation && (appointment.equity_included || (appointment.compensation_structure && String(appointment.compensation_structure).toLowerCase().includes('deferred')))) {
            docTypes.push('deferred_compensation');
          }
          break;
        
        case 'AWAITING_SIGNATURES':
        case 'READY_FOR_SECRETARY_REVIEW':
        case 'SECRETARY_APPROVED':
        case 'ACTIVATING':
          // FORTUNE 500: For these statuses, ensure all 14 documents exist
          // Core Employment Documents
          if (!hasAppointmentLetter || force_regenerate) docTypes.push('appointment_letter');
          if (!hasEmploymentAgreement || force_regenerate) docTypes.push('employment_agreement');
          if (!hasConfidentialityIP || force_regenerate) docTypes.push('confidentiality_ip');
          
          // Board & Formation Documents
          if (!hasBoardResolution || force_regenerate) docTypes.push('board_resolution');
          if ((appointment as any).formation_mode) {
            if (!hasPreIncorporationConsent || force_regenerate) docTypes.push('pre_incorporation_consent');
            if (!hasCertificateOfIncorporation || force_regenerate) docTypes.push('certificate_of_incorporation');
          }
          if (!hasBylaws || force_regenerate) docTypes.push('bylaws');
          
          // Governance Documents (ALWAYS REQUIRED)
          if (!hasBylawsAcknowledgment || force_regenerate) docTypes.push('bylaws_acknowledgment');
          if (!hasFiduciaryEthics || force_regenerate) docTypes.push('fiduciary_ethics_ack');
          if (!hasConflictDisclosure || force_regenerate) docTypes.push('conflict_disclosure');
          if (!hasOfficerIndemnification || force_regenerate) docTypes.push('officer_indemnification');
          
          // Equity Documents (conditional)
          if (appointment.equity_included) {
            if (!hasCertificate || force_regenerate) docTypes.push('certificate');
            if (!hasStockSubscription || force_regenerate) docTypes.push('stock_subscription');
            if (!hasEquityPlan || force_regenerate) docTypes.push('equity_incentive_plan');
            if (!hasOptionRSUAward || force_regenerate) docTypes.push('option_rsu_award');
          }
          
          // Deferred Compensation (conditional)
          const needsDeferredCompOther = appointment.equity_included || 
            (appointment.compensation_structure && String(appointment.compensation_structure).toLowerCase().includes('deferred'));
          if (needsDeferredCompOther && (!hasDeferredCompensation || force_regenerate)) {
            docTypes.push('deferred_compensation');
          }
          break;
        
        default:
          // FORTUNE 500: For other statuses, generate all standard documents if missing
          // Core Employment Documents
          if (!hasAppointmentLetter || force_regenerate) docTypes.push('appointment_letter');
          if (!hasEmploymentAgreement || force_regenerate) docTypes.push('employment_agreement');
          if (!hasConfidentialityIP || force_regenerate) docTypes.push('confidentiality_ip');
          
          // Board & Formation Documents
          if (!hasBoardResolution || force_regenerate) docTypes.push('board_resolution');
          if ((appointment as any).formation_mode) {
            if (!hasPreIncorporationConsent || force_regenerate) docTypes.push('pre_incorporation_consent');
            if (!hasCertificateOfIncorporation || force_regenerate) docTypes.push('certificate_of_incorporation');
          }
          if (!hasBylaws || force_regenerate) docTypes.push('bylaws');
          
          // Governance Documents (ALWAYS REQUIRED)
          if (!hasBylawsAcknowledgment || force_regenerate) docTypes.push('bylaws_acknowledgment');
          if (!hasFiduciaryEthics || force_regenerate) docTypes.push('fiduciary_ethics_ack');
          if (!hasConflictDisclosure || force_regenerate) docTypes.push('conflict_disclosure');
          if (!hasOfficerIndemnification || force_regenerate) docTypes.push('officer_indemnification');
          
          // Equity Documents (conditional)
          if (appointment.equity_included) {
            if (!hasCertificate || force_regenerate) docTypes.push('certificate');
            if (!hasStockSubscription || force_regenerate) docTypes.push('stock_subscription');
            if (!hasEquityPlan || force_regenerate) docTypes.push('equity_incentive_plan');
            if (!hasOptionRSUAward || force_regenerate) docTypes.push('option_rsu_award');
          }
          
          // Deferred Compensation (conditional)
          const needsDeferredCompDefault = appointment.equity_included || 
            (appointment.compensation_structure && String(appointment.compensation_structure).toLowerCase().includes('deferred'));
          if (needsDeferredCompDefault && (!hasDeferredCompensation || force_regenerate)) {
            docTypes.push('deferred_compensation');
          }
        }
      }
      
      console.log(`[${appointment.id}] ========================================`);
      console.log(`[${appointment.id}] Documents queued for generation: ${docTypes.length}`);
      console.log(`[${appointment.id}] Document types:`, docTypes);
      console.log(`[${appointment.id}] ========================================`);
      
      if (docTypes.length === 0) {
        console.warn(`[${appointment.id}] ⚠️ WARNING: No documents queued for generation!`);
        console.warn(`[${appointment.id}] Status: ${appointment.status}, force_regenerate: ${force_regenerate}`);
        console.warn(`[${appointment.id}] Existing URLs:`, {
          appointment_letter: appointment.appointment_letter_url ? 'EXISTS' : 'MISSING',
          board_resolution: appointment.board_resolution_url ? 'EXISTS' : 'MISSING',
          certificate: appointment.certificate_url ? 'EXISTS' : 'MISSING',
          employment_agreement: appointment.employment_agreement_url ? 'EXISTS' : 'MISSING',
          confidentiality_ip: (appointment as any).confidentiality_ip_url ? 'EXISTS' : 'MISSING',
          stock_subscription: (appointment as any).stock_subscription_url ? 'EXISTS' : 'MISSING',
          deferred_compensation: (appointment as any).deferred_compensation_url ? 'EXISTS' : 'MISSING',
          pre_incorporation_consent: (appointment as any).pre_incorporation_consent_url ? 'EXISTS' : 'MISSING',
        });
      }
      
      // Generate documents
      const generatedDocs: string[] = [];
      const errors: string[] = [];

      console.log(`[${appointment.id}] Starting PARALLEL generation for ${docTypes.length} documents...`);
      
      // Process documents in parallel to avoid timeout issues
      const documentPromises = docTypes.map(async (docType, index) => {
        console.log(`[${appointment.id}] [${index + 1}/${docTypes.length}] Starting: ${docType}`);
        try {
          // Call the generate function using fetch
          // Pass the original user's auth header to maintain JWT validation
          // The document generation function will use service role internally for database access
          const generateResponse = await fetch(
            `${supabaseUrl}/functions/v1/governance-generate-appointment-document`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader || `Bearer ${supabaseServiceKey}`, // Use original auth header if available
                'apikey': supabaseAnonKey,
              },
              body: JSON.stringify({
                appointment_id: appointment.id,
                document_type: docType,
              }),
            }
          );

          const result = await generateResponse.json();

          const responseDetails = {
            ok: generateResponse.ok,
            status: generateResponse.status,
            success: result?.success,
            error: result?.error,
            message: result?.message,
            document_url: result?.document_url,
            document_type: result?.document_type,
          };
          console.log(`[${appointment.id}] Response for ${docType}:`, JSON.stringify(responseDetails, null, 2));

          if (!generateResponse.ok) {
            const errorMsg = result?.error || result?.message || `HTTP ${generateResponse.status}: Failed to generate document`;
            console.error(`[${appointment.id}] ✗ HTTP Error generating ${docType}:`, errorMsg);
            console.error(`[${appointment.id}] Full error response:`, JSON.stringify(result, null, 2));
            return { docType, success: false, error: errorMsg };
          }

          if (!result) {
            const errorMsg = 'No response body returned from document generation function';
            console.error(`[${appointment.id}] ✗ No response body for ${docType}:`, errorMsg);
            return { docType, success: false, error: errorMsg };
          }

          if (result?.success === true && result?.document_url) {
            console.log(`[${appointment.id}] ✓✓✓ SUCCESS: Generated ${docType}`);
            console.log(`[${appointment.id}] Document URL: ${result.document_url}`);
            return { docType, success: true, document_url: result.document_url };
          } else {
            const errorMsg = result?.error || result?.message || 'Unknown error: No success flag or document URL returned';
            console.error(`[${appointment.id}] ✗✗✗ FAILED: ${docType}`);
            console.error(`[${appointment.id}] Error message: ${errorMsg}`);
            console.error(`[${appointment.id}] Full result:`, JSON.stringify(result, null, 2));
            return { docType, success: false, error: errorMsg };
          }
        } catch (err: any) {
          const errorMsg = err?.message || err?.toString() || 'Failed to generate document';
          console.error(`[${appointment.id}] ✗ Exception generating ${docType}:`, errorMsg, err);
          return { docType, success: false, error: errorMsg };
        }
      });

      // Wait for all documents to complete (in parallel)
      console.log(`[${appointment.id}] Waiting for ${documentPromises.length} parallel document generations...`);
      const promiseResults = await Promise.allSettled(documentPromises);
      
      // Process promise results
      promiseResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const { docType, success, document_url, error } = promiseResult.value;
          if (success) {
            generatedDocs.push(docType);
            console.log(`[${appointment.id}] ✓ Completed: ${docType}`);
          } else {
            errors.push(`${docType}: ${error}`);
            console.error(`[${appointment.id}] ✗ Failed: ${docType} - ${error}`);
          }
        } else {
          const docType = docTypes[index];
          const errorMsg = promiseResult.reason?.message || promiseResult.reason?.toString() || 'Promise rejected';
          errors.push(`${docType}: ${errorMsg}`);
          console.error(`[${appointment.id}] ✗ Promise rejected for ${docType}:`, errorMsg);
        }
      });
      
      console.log(`[${appointment.id}] ========================================`);
      console.log(`[${appointment.id}] Generation complete: ${generatedDocs.length} succeeded, ${errors.length} failed`);
      console.log(`[${appointment.id}] Generated docs:`, generatedDocs);
      console.log(`[${appointment.id}] Errors:`, errors);
      console.log(`[${appointment.id}] ========================================`);

      results.push({
        appointment_id: appointment.id,
        appointment_name: appointment.proposed_officer_name,
        status: appointment.status,
        documents_generated: generatedDocs,
        documents_queued: docTypes,
        errors: errors.length > 0 ? errors : null,
        reason_no_docs: docTypes.length === 0 ? 
          (appointment.status === 'APPROVED' ? 
            'All documents already exist for this approved appointment' : 
            `No documents need to be generated for status: ${appointment.status}`) : 
          null,
      });
    }

    // Calculate totals
    const totalGenerated = results.reduce((sum, r) => sum + (r.documents_generated?.length || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0);
    
    // Collect all unique errors
    const allErrors: string[] = [];
    results.forEach(r => {
      if (r.errors) {
        r.errors.forEach(err => {
          if (!allErrors.includes(err)) {
            allErrors.push(err);
          }
        });
      }
    });

    console.log(`========================================`);
    console.log(`FINAL SUMMARY:`);
    console.log(`Processed appointments: ${appointments.length}`);
    console.log(`Total documents generated: ${totalGenerated}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Results:`, JSON.stringify(results, null, 2));
    console.log(`========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: appointments.length,
        documents_generated: totalGenerated,
        errors_count: totalErrors,
        all_errors: allErrors,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-backfill-appointment-documents:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

