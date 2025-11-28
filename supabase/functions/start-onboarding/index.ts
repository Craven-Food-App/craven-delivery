// ================================================================
// START-ONBOARDING EDGE FUNCTION
// ================================================================
// Checks zone capacity and determines if driver should be:
// - eligible (zone has capacity) → can be activated
// - waitlisted (zone is full) → added to waitlist

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface OnboardingRequest {
  driverId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { driverId }: OnboardingRequest = await req.json();

    if (!driverId) {
      return new Response(
        JSON.stringify({ error: 'Missing driverId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get driver and their ZIP
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, zip, status')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find region for driver's ZIP (use existing regions table)
    const zipPrefix = driver.zip.substring(0, 3);
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .or(`zip_prefix.eq.${zipPrefix},status.eq.active`)
      .single();

    // If no specific region, try to find any active region
    let regionToUse = region;
    if (regionError || !region) {
      const { data: anyRegion } = await supabase
        .from('regions')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (!anyRegion) {
        // No active regions - add to waitlist automatically
        regionToUse = null;
      } else {
        regionToUse = anyRegion;
      }
    }

    // Count active drivers in this region
    const { count: activeCount } = await supabase
      .from('craver_applications')
      .select('*', { count: 'exact', head: true })
      .eq('region_id', regionToUse?.id)
      .eq('status', 'active');

    const hasCapacity = regionToUse && (activeCount || 0) < (regionToUse.active_quota || 50);

    if (hasCapacity && regionToUse) {
      // Region has capacity - mark driver as eligible
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          status: 'eligible',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'eligible',
          message: 'Driver is eligible and can be activated',
          region: {
            name: regionToUse.name,
            availableSlots: (regionToUse.active_quota || 50) - (activeCount || 0)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Region is full or no active regions - add to waitlist
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          status: 'waitlisted_contract_signed',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (updateError) {
        throw updateError;
      }

      // Count current waitlist position
      const { count: waitlistCount } = await supabase
        .from('craver_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waitlist');

      return new Response(
        JSON.stringify({
          success: true,
          status: 'waitlisted',
          message: 'Driver added to waitlist - region is at capacity',
          region: regionToUse ? {
            name: regionToUse.name,
            capacity: regionToUse.active_quota,
            currentDrivers: activeCount
          } : {
            name: 'General Waitlist',
            capacity: 0,
            currentDrivers: 0
          },
          waitlist: {
            position: (waitlistCount || 0) + 1
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Start onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

