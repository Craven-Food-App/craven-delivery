import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from '../_shared/adminAuth.ts';

interface AutoActivateRequest {
  region_id: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const gate = await requireAdmin(req, ["admin", "ceo", "coo", "chro"]);
  if (!gate.ok) {
    return new Response(JSON.stringify({ error: gate.error }), {
      status: gate.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { region_id } = await req.json() as AutoActivateRequest;

    console.log('Auto-activating drivers for region:', region_id);

    // Get region capacity
    const { data: region, error: regionError } = await supabaseClient
      .from('regions')
      .select('name, active_quota, status')
      .eq('id', region_id)
      .single();

    if (regionError || !region) {
      throw new Error('Region not found');
    }

    console.log('Region details:', region);

    // Count current active drivers
    const { data: activeDrivers, error: activeError } = await supabaseClient
      .from('craver_applications')
      .select('id')
      .eq('region_id', region_id)
      .eq('status', 'approved');

    if (activeError) throw activeError;

    const currentActive = activeDrivers?.length || 0;
    const availableSlots = region.active_quota - currentActive;

    console.log(`Current active: ${currentActive}, Quota: ${region.active_quota}, Available slots: ${availableSlots}`);

    if (availableSlots <= 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Region is at capacity',
          activated_count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get top waitlist drivers with completed onboarding
    const { data: waitlistDrivers, error: waitlistError } = await supabaseClient
      .from('craver_applications')
      .select('id, first_name, last_name, email, priority_score')
      .eq('region_id', region_id)
      .eq('status', 'waitlist')
      .eq('background_check', true)
      .not('background_check_approved_at', 'is', null)
      .not('onboarding_completed_at', 'is', null)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(availableSlots);

    if (waitlistError) throw waitlistError;

    if (!waitlistDrivers || waitlistDrivers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No eligible drivers in waitlist with completed onboarding',
          activated_count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Activating ${waitlistDrivers.length} drivers`);

    // Call activate-drivers edge function
    const activateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/activate-drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        driver_ids: waitlistDrivers.map(d => d.id),
      }),
    });

    const activateResult = await activateResponse.json();

    console.log('Activation result:', activateResult);

    return new Response(
      JSON.stringify({
        success: true,
        region_name: region.name,
        activated_count: activateResult.activated_count || 0,
        available_slots: availableSlots,
        drivers: waitlistDrivers.map(d => ({
          name: `${d.first_name} ${d.last_name}`,
          email: d.email,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error auto-activating drivers:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
