// Edge Function: quote-order-pricing
// Server-side pricing calculation for checkout preview
// Single source of truth for all pricing calculations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const {
      items, // Array of { id, price_cents, quantity }
      restaurant_id,
      customer_location, // { lat, lng }
      tip_cents = 0,
      auto_boost_enabled = true,
      auto_boost_cap_cents = 600
    } = await req.json();

    if (!items || !restaurant_id || !customer_location) {
      throw new Error("Missing required fields: items, restaurant_id, customer_location");
    }

    // Get restaurant location
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('latitude, longitude, delivery_fee_cents')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      throw new Error("Restaurant not found");
    }

    // Calculate food subtotal
    const food_subtotal_cents = items.reduce((sum: number, item: any) => {
      return sum + (item.price_cents * (item.quantity || 1));
    }, 0);

    // Calculate tax (simplified - use 8% as default, should be configurable)
    const tax_rate = 0.08;
    const tax_cents = Math.round(food_subtotal_cents * tax_rate);

    // Calculate distance-based fee (simplified - should use actual routing)
    const distance_km = calculateDistance(
      restaurant.latitude,
      restaurant.longitude,
      customer_location.lat,
      customer_location.lng
    );
    const distance_fee_cents = Math.round(distance_km * 50); // $0.50 per km

    // Base delivery fee
    const base_delivery_fee_cents = restaurant.delivery_fee_cents || 300; // $3.00 default

    // Time-based fee (simplified - should consider time of day)
    const time_fee_cents = 0; // Can be calculated based on peak hours

    // Demand fee (simplified - should consider current demand)
    const demand_fee_cents = 0; // Can be calculated based on active orders

    // Escalation fee starts at 0 for quotes
    const escalation_fee_cents = 0;

    // Compute total delivery fees
    const { data: deliveryFeesTotal } = await supabase.rpc(
      'compute_delivery_fees_total_cents',
      {
        p_base_delivery_fee_cents: base_delivery_fee_cents,
        p_distance_fee_cents: distance_fee_cents,
        p_time_fee_cents: time_fee_cents,
        p_demand_fee_cents: demand_fee_cents,
        p_escalation_fee_cents: escalation_fee_cents
      }
    );

    const delivery_fees_total_cents = deliveryFeesTotal || 0;

    // Get payout settings
    const { data: payoutSettings } = await supabase
      .from('driver_payout_settings')
      .select('driver_base_pay_cents, driver_delivery_fee_share_bps, merchant_commission_bps')
      .eq('is_active', true)
      .maybeSingle();

    const driver_base_pay_cents = Number(payoutSettings?.driver_base_pay_cents ?? 250);
    const driver_share_bps = Number(payoutSettings?.driver_delivery_fee_share_bps ?? 7000);
    const merchant_commission_bps = Number(payoutSettings?.merchant_commission_bps ?? 1500);

    // Calculate driver payout
    const { data: driverPayout } = await supabase.rpc(
      'calculate_driver_payout_cents',
      {
        p_delivery_fees_total_cents: delivery_fees_total_cents,
        p_tip_cents: tip_cents,
        p_base_pay_cents: driver_base_pay_cents,
        p_share_bps: driver_share_bps
      }
    );

    const driverPayoutResult = driverPayout?.[0] || {
      driver_payout_cents: 0,
      platform_delivery_share_cents: 0,
      driver_before_tip_cents: 0,
      driver_fee_share_cents: 0
    };

    // Calculate merchant payout
    const { data: merchantPayout } = await supabase.rpc(
      'calculate_merchant_payout_cents',
      {
        p_food_subtotal_cents: food_subtotal_cents,
        p_merchant_commission_bps: merchant_commission_bps
      }
    );

    const merchantPayoutResult = merchantPayout?.[0] || {
      merchant_commission_cents: 0,
      merchant_payout_cents: 0,
      platform_food_commission_cents: 0
    };

    // Calculate customer total
    const customer_total_cents = food_subtotal_cents + tax_cents + delivery_fees_total_cents + tip_cents;

    return new Response(
      JSON.stringify({
        // Food and tax
        food_subtotal_cents,
        tax_cents,
        
        // Delivery fee components
        base_delivery_fee_cents,
        distance_fee_cents,
        time_fee_cents,
        demand_fee_cents,
        escalation_fee_cents,
        delivery_fees_total_cents,
        
        // Tip
        tip_cents,
        
        // Merchant settlement
        merchant_commission_cents: merchantPayoutResult.merchant_commission_cents,
        merchant_payout_cents: merchantPayoutResult.merchant_payout_cents,
        platform_food_commission_cents: merchantPayoutResult.platform_food_commission_cents,
        
        // Driver payout
        driver_fee_share_cents: driverPayoutResult.driver_fee_share_cents,
        driver_before_tip_cents: driverPayoutResult.driver_before_tip_cents,
        driver_payout_cents: driverPayoutResult.driver_payout_cents,
        platform_delivery_share_cents: driverPayoutResult.platform_delivery_share_cents,
        
        // Customer total
        customer_total_cents,
        
        // Auto-boost settings
        auto_boost_enabled,
        auto_boost_cap_cents
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('quote-order-pricing error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


































