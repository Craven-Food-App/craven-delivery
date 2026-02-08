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
    const { appointment_id, executive_appointment_id, formation_mode, equity_details } = body;

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appointment
    const { data: appointment, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (apptError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appointee user info
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', appointment.appointee_user_id)
      .maybeSingle();

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(appointment.appointee_user_id);
    
    if (userError || !user) {
      console.error('Error fetching appointee user:', userError);
      return new Response(
        JSON.stringify({ error: 'Appointee user not found. User may not have been created.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const officerName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Officer';
    const officerEmail = profile?.email || user?.email || '';
    
    if (!officerEmail) {
      console.error('No email found for appointee user:', appointment.appointee_user_id);
      return new Response(
        JSON.stringify({ error: 'Appointee email not found. Cannot proceed with workflow.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company settings for context
    const { data: settings } = await supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'company_name',
        'state_of_incorporation',
        'registered_office',
        'founder_name',
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    const companyName = settingsMap['company_name'] || 'Crave\'n, Inc.';
    const state = settingsMap['state_of_incorporation'] || 'Delaware';
    const founderName = settingsMap['founder_name'] || 'Torrance Stroman';

    // Step 1: Generate documents (Pre-Incorporation Consent, Appointment Letter, Board Resolution)
    // Use the existing governance-generate-appointment-document function for appointment letter
    // and generate board documents directly
    
    const documentsToGenerate: Array<{ type: string; template_key: string; title: string }> = [];

    // Generate Pre-Incorporation Consent if formation_mode
    if (formation_mode) {
      documentsToGenerate.push({
        type: 'initial_director_consent',
        template_key: 'pre_incorporation_consent',
        title: 'Pre-Incorporation Written Consent of Sole Incorporator',
      });
    }

    // Generate Appointment Letter via existing function (await to ensure it completes)
    try {
      const appointmentLetterUrl = `${supabaseUrl}/functions/v1/governance-generate-appointment-document`;
      const letterResponse = await fetch(appointmentLetterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          appointment_id: executive_appointment_id || appointment_id,
          document_type: 'appointment_letter',
        }),
      });
      
      if (!letterResponse.ok) {
        const errorText = await letterResponse.text();
        console.error('Error generating appointment letter:', letterResponse.status, errorText);
      } else {
        const result = await letterResponse.json();
        console.log('Appointment letter generated:', result);
      }
    } catch (err) {
      console.error('Error calling appointment letter generation:', err);
    }

    // Generate Board Resolution - use correct template key from database
    documentsToGenerate.push({
      type: 'officer_appointment_resolution',
      template_key: 'board_resolution_officer_appointment',
      title: `Board Resolution: Appointment of ${officerName} as ${appointment.role_titles.join(', ')}`,
    });

    // If CEO, add CEO-specific resolution
    const isCEO = appointment.role_titles.some((title: string) => 
      title.includes('CEO') || title.includes('Chief Executive Officer')
    );
    
    if (isCEO) {
      documentsToGenerate.push({
        type: 'ceo_appointment_resolution',
        template_key: 'board_resolution_appointing_ceo',
        title: `Board Resolution: Appointment of Chief Executive Officer`,
      });
    }

    // Generate Officer Acceptance
    documentsToGenerate.push({
      type: 'multi_role_officer_acceptance',
      template_key: 'multi_role_officer_acceptance',
      title: `Officer Acceptance of Appointment - ${officerName}`,
    });

    const documentIds: string[] = [];

    for (const doc of documentsToGenerate) {
      try {
        // Get template from document_templates table
        const { data: template } = await supabaseAdmin
          .from('document_templates')
          .select('html_content')
          .eq('template_key', doc.template_key)
          .eq('is_active', true)
          .maybeSingle();

        if (!template) {
          console.warn(`Template ${doc.template_key} not found, skipping`);
          continue;
        }

        // Prepare template data
        const templateData: Record<string, any> = {
          company_name: companyName,
          state: state,
          officer_name: officerName,
          officer_email: officerEmail,
          officer_address: profile?.address || '',
          appointee_name: officerName,
          appointee_1_name: officerName,
          appointee_1_email: officerEmail,
          appointee_1_role: appointment.role_titles.join(', '),
          role: appointment.role_titles.join(', '),
          effective_date: appointment.effective_date,
          resolution_date: appointment.effective_date,
          incorporator_name: founderName,
          director_name: founderName,
          consent_date: appointment.effective_date,
        };

        // Interpolate template
        let html = template.html_content;
        Object.keys(templateData).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
          html = html.replace(regex, String(templateData[key] || ''));
        });

        // Create document
        // Note: board_documents.related_appointment_id references executive_appointments, not appointments
        const { data: docRecord, error: docError } = await supabaseAdmin
          .from('board_documents')
          .insert({
            title: doc.title,
            type: doc.type,
            html_template: html,
            signing_status: 'pending',
            signers: JSON.stringify([]),
            related_appointment_id: executive_appointment_id || null, // Use executive_appointment_id for legacy table reference
          })
          .select()
          .single();

        if (docError) {
          console.error(`Error creating ${doc.type}:`, docError);
          continue;
        }

        if (docRecord) {
          documentIds.push(docRecord.id);

          // Link to appointment
          await supabaseAdmin.from('appointment_documents').insert({
            appointment_id: appointment_id,
            governance_document_id: docRecord.id,
          });

          // Update executive_appointments URL fields for backward compatibility with AppointmentList
          // Map document types to URL field names in executive_appointments
          const documentUrlFieldMap: Record<string, string> = {
            'initial_director_consent': 'pre_incorporation_consent_url',
            'officer_appointment_resolution': 'board_resolution_url',
            'ceo_appointment_resolution': 'board_resolution_url', // CEO resolution also goes to board_resolution_url
            'multi_role_officer_acceptance': 'confidentiality_ip_url', // Officer acceptance can go here temporarily
          };

          const urlField = documentUrlFieldMap[doc.type];
          if (urlField && executive_appointment_id) {
            // Create a data URL for the HTML template so AppointmentList can detect it
            // In the future, this should be converted to PDF and stored in storage
            const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
            
            await supabaseAdmin
              .from('executive_appointments')
              .update({ [urlField]: htmlDataUrl })
              .eq('id', executive_appointment_id);
          }
        }
      } catch (error) {
        console.error(`Error processing ${doc.type}:`, error);
      }
    }

    // Step 2: Create resolution
    let resolutionId: string | null = null;
    try {
      const { data: resolutionNumber } = await supabaseAdmin.rpc('generate_resolution_number');
      
      const { data: resolution, error: resError } = await supabaseAdmin
        .from('governance_board_resolutions')
        .insert({
          resolution_number: resolutionNumber || `RES-${Date.now()}`,
          title: `Appointment of ${officerName} as ${appointment.role_titles.join(', ')}`,
          description: `Board resolution to appoint ${officerName} to the position of ${appointment.role_titles.join(', ')}`,
          type: 'EXECUTIVE_APPOINTMENT',
          status: 'PENDING_VOTE',
          effective_date: appointment.effective_date,
          metadata: {
            appointment_id: appointment_id,
            executive_appointment_id: executive_appointment_id,
            role_titles: appointment.role_titles,
            equity_grant_details: equity_details || null,
          },
        })
        .select()
        .single();

      if (!resError && resolution) {
        resolutionId = resolution.id;
      }
    } catch (error) {
      console.error('Error creating resolution:', error);
    }

    // Step 3: Create onboarding record
    let onboardingId: string | null = null;
    try {
      const { data: onboarding, error: onboardingError } = await supabaseAdmin
        .from('executive_onboarding')
        .upsert({
          appointment_id: appointment_id,
          user_id: appointment.appointee_user_id,
          status: 'pending',
          documents_required: documentsToGenerate.map(d => ({ template_id: d.template_key, required: true })),
          documents_completed: [],
        }, {
          onConflict: 'appointment_id,user_id',
        })
        .select()
        .single();
      
      if (onboardingError) {
        console.error('Error creating onboarding record:', onboardingError);
      } else if (onboarding) {
        onboardingId = onboarding.id;
      }
    } catch (error) {
      console.error('Error creating onboarding record:', error);
    }

    // Step 4: DO NOT send email here - email will be sent after resolution is executed (step 10)
    // Email is sent in governance-execute-resolution after board votes and resolution is adopted
    // This ensures the executive only receives documents after board approval

    // Log the workflow completion
    console.log('Appointment workflow completed:', {
      appointment_id: appointment_id,
      executive_appointment_id: executive_appointment_id,
      documents_generated: documentIds.length,
      resolution_id: resolutionId,
      onboarding_created: !!onboardingId,
      officer_name: officerName,
      officer_email: officerEmail,
    });
    
    // If no documents were generated, log a warning
    if (documentIds.length === 0) {
      console.warn('WARNING: No documents were generated. Check template availability and template keys.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment workflow initiated',
        appointment_id: appointment_id,
        documents_generated: documentIds.length,
        resolution_id: resolutionId,
        onboarding_id: onboardingId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-handle-appointment-workflow:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

