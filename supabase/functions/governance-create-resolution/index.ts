import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      title,
      description,
      type,
      meeting_date,
      effective_date,
      related_officer_id,
      metadata = {},
      appointment_id,
      equity_grant_details,
    } = body;

    if (!title || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate resolution number
    const { data: resolutionNumber } = await supabaseAdmin.rpc('generate_resolution_number');

    if (!resolutionNumber) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate resolution number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare metadata
    const resolutionMetadata = {
      ...metadata,
      appointment_id: appointment_id || null,
      equity_grant_details: equity_grant_details || null,
    };

    // Create resolution
    const { data: resolution, error: resolutionError } = await supabaseAdmin
      .from('governance_board_resolutions')
      .insert({
        resolution_number: resolutionNumber,
        title,
        description: description || null,
        type,
        status: 'DRAFT',
        created_by: user.id,
        meeting_date: meeting_date || null,
        effective_date: effective_date || new Date().toISOString().split('T')[0],
        related_officer_id: related_officer_id || null,
        metadata: resolutionMetadata,
      })
      .select()
      .single();

    if (resolutionError) {
      throw resolutionError;
    }

    // If this is an appointment resolution, generate documents
    if (type === 'EXECUTIVE_APPOINTMENT' && appointment_id) {
      try {
        // Generate appointment documents
        await fetch(`${supabaseUrl}/functions/v1/governance-generate-appointment-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            appointment_id,
            document_type: 'board_resolution',
          }),
        });
      } catch (err) {
        console.error('Error generating appointment documents:', err);
        // Don't fail the resolution creation if document generation fails
      }
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'resolution_created',
      p_action_category: 'board',
      p_target_type: 'resolution',
      p_target_id: resolution.id,
      p_target_name: title,
      p_description: `Resolution created: ${title}`,
      p_metadata: {
        resolution_number: resolutionNumber,
        type,
        appointment_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        resolution,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-create-resolution:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

