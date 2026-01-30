import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if board is initialized
    const { data: boardSetting } = await supabaseAdmin
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'board_initialized')
      .single();

    if (boardSetting?.setting_value !== 'true') {
      return new Response(
        JSON.stringify({ error: 'Board not initialized' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch appointment
    const { data: appointment } = await supabaseAdmin
      .from('executive_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (!appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get board members for signatures
    const { data: boardMembers } = await supabaseAdmin
      .from('board_members')
      .select('user_id, role_title')
      .in('status', ['Active', 'Conditional']);

    const secretary = boardMembers?.find(m => m.role_title.includes('Secretary'));
    const chairperson = boardMembers?.find(m => m.role_title.includes('Chairperson'));

    // Generate resolution number
    const { data: resolutions } = await supabaseAdmin
      .from('board_documents')
      .select('resolution_number')
      .eq('type', 'board_resolution')
      .not('resolution_number', 'is', null);

    const nextNumber = (resolutions?.length || 0) + 1;
    const resolutionNumber = `RES-${String(nextNumber).padStart(4, '0')}`;

    // Create board resolution document
    const signers: any[] = [];
    if (secretary) {
      signers.push({ role: 'SECRETARY', user_id: secretary.user_id, status: 'pending' });
    }
    if (chairperson) {
      signers.push({ role: 'CHAIRPERSON', user_id: chairperson.user_id, status: 'pending' });
    }

    const { data: resolutionDoc, error: docError } = await supabaseAdmin
      .from('board_documents')
      .insert({
        title: `Board Resolution: Appointment of ${appointment.role_title}`,
        type: 'board_resolution',
        resolution_number: resolutionNumber,
        related_appointment_id: appointment_id,
        signing_status: signers.length > 0 ? 'pending' : 'completed',
        signers: JSON.stringify(signers),
      })
      .select()
      .single();

    if (docError) throw docError;

    // Link resolution to appointment (if board_resolution_id column exists)
    try {
      await supabaseAdmin
        .from('executive_appointments')
        .update({ board_resolution_id: resolutionDoc.id })
        .eq('id', appointment_id);
    } catch (e) {
      // Column might not exist, that's okay
      console.warn('Could not update board_resolution_id on appointment:', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        resolution_id: resolutionDoc.id,
        resolution_number: resolutionNumber 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

