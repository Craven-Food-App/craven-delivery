// Edge Function: manual-boost-delivery
// Customer-initiated delivery fee boost

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

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

    const { orderId, boost_amount_cents = 100 } = await req.json();

    if (!orderId) {
      throw new Error("Missing required field: orderId");
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('order_status', 'broadcasting')
      .is('accepted_driver_id', null)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found, not broadcasting, or already accepted");
    }

    // Check if boost would exceed cap
    const newEscalatedTotal = (order.escalated_total_cents || 0) + boost_amount_cents;
    const maxCap = Math.max(order.auto_boost_cap_cents || 600, 600); // At least $6 cap

    if (newEscalatedTotal > maxCap) {
      throw new Error(`Boost would exceed maximum cap of $${(maxCap / 100).toFixed(2)}`);
    }

    // Apply boost increment
    const newEscalationFee = (order.escalation_fee_cents || 0) + boost_amount_cents;

    // Recompute delivery_fees_total_cents
    const { data: newDeliveryFeesTotal } = await supabase.rpc(
      'compute_delivery_fees_total_cents',
      {
        p_base_delivery_fee_cents: order.base_delivery_fee_cents || 0,
        p_distance_fee_cents: order.distance_fee_cents || 0,
        p_time_fee_cents: order.time_fee_cents || 0,
        p_demand_fee_cents: order.demand_fee_cents || 0,
        p_escalation_fee_cents: newEscalationFee
      }
    );

    const newDeliveryFeesTotalCents = newDeliveryFeesTotal || 0;

    // Recompute driver payout
    const { data: driverPayout } = await supabase.rpc(
      'calculate_driver_payout_cents',
      {
        p_delivery_fees_total_cents: newDeliveryFeesTotalCents,
        p_tip_cents: order.tip_cents || 0,
        p_base_pay_cents: order.driver_base_pay_cents || 250,
        p_share_bps: order.driver_delivery_fee_share_bps || 7000
      }
    );

    const driverPayoutResult = driverPayout?.[0] || {
      driver_payout_cents: 0,
      platform_delivery_share_cents: 0,
      driver_before_tip_cents: 0,
      driver_fee_share_cents: 0
    };

    // Update order
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        escalation_fee_cents: newEscalationFee,
        escalated_total_cents: newEscalatedTotal,
        delivery_fees_total_cents: newDeliveryFeesTotalCents,
        driver_fee_share_cents: driverPayoutResult.driver_fee_share_cents,
        driver_payout_cents: driverPayoutResult.driver_payout_cents,
        platform_delivery_share_cents: driverPayoutResult.platform_delivery_share_cents,
        customer_boost_required: false, // Reset flag
        total_cents: (order.food_subtotal_cents || 0) + (order.tax_cents || 0) + newDeliveryFeesTotalCents + (order.tip_cents || 0),
        updated_at: now
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Rebroadcast updated offer to drivers
    const driverBroadcastChannel = supabase.channel('driver_broadcast');
    await driverBroadcastChannel.subscribe();
    await driverBroadcastChannel.send({
      type: 'broadcast',
      event: 'order_updated',
      payload: {
        order_id: orderId,
        driver_payout_cents: driverPayoutResult.driver_payout_cents,
        delivery_fees_total_cents: newDeliveryFeesTotalCents,
        escalation_fee_cents: newEscalationFee,
        message: 'Updated payout - customer boosted'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        boost_amount_cents: boost_amount_cents,
        new_escalation_fee_cents: newEscalationFee,
        new_delivery_fees_total_cents: newDeliveryFeesTotalCents,
        new_driver_payout_cents: driverPayoutResult.driver_payout_cents
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('manual-boost-delivery error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});































