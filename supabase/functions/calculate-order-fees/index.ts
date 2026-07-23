import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface OrderData {
  subtotal_cents: number;
  restaurant_id: string;
  delivery_address: {
    lat: number;
    lng: number;
  };
  pickup_address: {
    lat: number;
    lng: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { orderData }: { orderData: OrderData } = await req.json();

    // Get commission settings
    const { data: settings } = await supabase
      .from('commission_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!settings) {
      throw new Error('Commission settings not found');
    }

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distance = calculateDistance(
      orderData.pickup_address.lat,
      orderData.pickup_address.lng,
      orderData.delivery_address.lat,
      orderData.delivery_address.lng
    );

    // Check if it's peak hours (5-8 PM or 11 AM - 1 PM)
    const now = new Date();
    const hour = now.getHours();
    const isPeakHour = (hour >= 17 && hour <= 20) || (hour >= 11 && hour <= 13);
    
    // Calculate fees
    const serviceFeeCents = Math.round(orderData.subtotal_cents * (settings.customer_service_fee_percent / 100));
    
    let deliveryFeeCents = settings.delivery_fee_base_cents + Math.round(distance * settings.delivery_fee_per_mile_cents);
    if (isPeakHour) {
      deliveryFeeCents = Math.round(deliveryFeeCents * settings.peak_hour_multiplier);
    }

    // Check CraveMore membership eligibility for $0 delivery fee
    // Includes paid/trial user_memberships AND promotional entitlements (e.g. 365 referral promo)
    let cravemore_delivery_fee_waived = false;
    if (orderData.customer_id) {
      const { data: membership } = await supabase
        .from('user_memberships')
        .select('status, renews_at')
        .eq('user_id', orderData.customer_id)
        .eq('status', 'active')
        .maybeSingle();

      const hasPaidMembership =
        !!membership && (!membership.renews_at || new Date(membership.renews_at) > now);

      let hasPromoEntitlement = false;
      try {
        const { data: promoEnt } = await supabase
          .from('cravemore_promo_entitlements')
          .select('id')
          .eq('user_id', orderData.customer_id)
          .eq('status', 'active')
          .lte('starts_at', now.toISOString())
          .gt('ends_at', now.toISOString())
          .limit(1)
          .maybeSingle();
        hasPromoEntitlement = !!promoEnt;
      } catch {
        // Table may not exist yet in older envs
      }

      if (hasPaidMembership || hasPromoEntitlement) {
        // Check eligibility: subtotal >= $12, merchant eligible, zone eligible
        const MIN_SUBTOTAL_CENTS = 1200;

        if (orderData.subtotal_cents >= MIN_SUBTOTAL_CENTS) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('cravemore_eligible')
            .eq('id', orderData.restaurant_id)
            .single();

          let zoneEligible = true;
          try {
            if (orderData.zone_id) {
              const { data: zone } = await supabase
                .from('zones')
                .select('cravemore_eligible')
                .eq('id', orderData.zone_id)
                .single();
              zoneEligible = zone?.cravemore_eligible !== false;
            }
          } catch {
            // Zones table might not exist, default to eligible
          }

          if (merchant?.cravemore_eligible !== false && zoneEligible) {
            cravemore_delivery_fee_waived = true;
            deliveryFeeCents = 0;
          }
        }
      }
    }

    const restaurantCommissionCents = Math.round(orderData.subtotal_cents * (settings.restaurant_commission_percent / 100));

    const totalCents = orderData.subtotal_cents + serviceFeeCents + deliveryFeeCents;
    const restaurantEarningsCents = orderData.subtotal_cents - restaurantCommissionCents;
    const craveNEarningsCents = restaurantCommissionCents + serviceFeeCents + deliveryFeeCents;

    return new Response(
      JSON.stringify({
        subtotal_cents: orderData.subtotal_cents,
        service_fee_cents: serviceFeeCents,
        delivery_fee_cents: deliveryFeeCents,
        total_cents: totalCents,
        restaurant_commission_cents: restaurantCommissionCents,
        restaurant_earnings_cents: restaurantEarningsCents,
        craven_earnings_cents: craveNEarningsCents,
        distance_miles: distance,
        is_peak_hour: isPeakHour,
        cravemore_delivery_fee_waived: cravemore_delivery_fee_waived,
        // Expose processing fee configuration so front-end can calculate
        processing_fee_percent_card: settings.stripe_fee_percent ?? null,
        processing_fee_percent_ach: null,
        processing_fee_applies_to_full_amount: true,
        fee_breakdown: {
          base_delivery_fee: settings.delivery_fee_base_cents,
          distance_fee: Math.round(distance * settings.delivery_fee_per_mile_cents),
          peak_multiplier: isPeakHour ? settings.peak_hour_multiplier : 1,
          service_fee_percent: settings.customer_service_fee_percent,
          commission_percent: settings.restaurant_commission_percent
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error calculating order fees:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});