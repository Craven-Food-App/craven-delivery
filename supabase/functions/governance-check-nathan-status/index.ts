import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    // Find Nathan Curry appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .or('proposed_officer_email.ilike.%natecurry%,proposed_officer_name.ilike.%nathan%curry%')
      .order('created_at', { ascending: false });

    if (appointmentsError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch appointments: ${appointmentsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No Nathan Curry appointments found', appointments: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For each appointment, get resolution and document status
    const detailedAppointments = await Promise.all(
      appointments.map(async (appt) => {
        let resolution = null;
        if (appt.board_resolution_id) {
          const { data: res } = await supabaseAdmin
            .from('governance_board_resolutions')
            .select('*')
            .eq('id', appt.board_resolution_id)
            .maybeSingle();
          resolution = res;
        }

        const { data: documents } = await supabaseAdmin
          .from('executive_documents')
          .select('id, type, signature_status')
          .eq('appointment_id', appt.id);

        const totalDocs = documents?.length || 0;
        const signedDocs = documents?.filter(d => d.signature_status === 'signed').length || 0;
        const allSigned = totalDocs > 0 && signedDocs === totalDocs;

        return {
          appointment: {
            id: appt.id,
            name: appt.proposed_officer_name,
            email: appt.proposed_officer_email,
            title: appt.proposed_title,
            status: appt.status,
            board_resolution_id: appt.board_resolution_id,
            created_at: appt.created_at,
            updated_at: appt.updated_at,
          },
          resolution: resolution ? {
            id: resolution.id,
            status: resolution.status,
            type: resolution.type,
            title: resolution.title,
          } : null,
          documents: {
            total: totalDocs,
            signed: signedDocs,
            all_signed: allSigned,
            details: documents || [],
          },
          should_be_in_queue: appt.status === 'READY_FOR_SECRETARY_REVIEW',
          recommended_status: (() => {
            if (!resolution || resolution.status !== 'ADOPTED') {
              return appt.status; // Don't change if resolution not adopted
            }
            if (allSigned) return 'READY_FOR_SECRETARY_REVIEW';
            if (signedDocs > 0) return 'AWAITING_SIGNATURES';
            return 'BOARD_ADOPTED';
          })(),
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        appointments_found: appointments.length,
        appointments: detailedAppointments,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-check-nathan-status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

