// Edge Function: accept-order
// Atomically accepts an order and stops escalation

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

    const { orderId, driverId } = await req.json();

    if (!orderId || !driverId) {
      throw new Error("Missing required fields: orderId, driverId");
    }

    // Atomically accept order using database transaction
    // Ensure status == broadcasting and not already accepted
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_status, accepted_driver_id, driver_payout_cents, delivery_fees_total_cents, tip_cents')
      .eq('id', orderId)
      .eq('order_status', 'broadcasting')
      .is('accepted_driver_id', null)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found, not broadcasting, or already accepted");
    }

    // Update order atomically
    const acceptedAt = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'accepted',
        accepted_driver_id: driverId,
        accepted_at: acceptedAt,
        driver_id: driverId, // Also set driver_id for backward compatibility
        next_escalation_at: null, // STOP escalation
        updated_at: acceptedAt
      })
      .eq('id', orderId)
      .eq('order_status', 'broadcasting') // Double-check status hasn't changed
      .is('accepted_driver_id', null) // Double-check not already accepted
      .select()
      .single();

    if (updateError || !updatedOrder) {
      throw new Error("Failed to accept order - may have been accepted by another driver");
    }

    // Cancel any pending order assignments for this order
    await supabase
      .from('order_assignments')
      .update({ status: 'cancelled' })
      .eq('order_id', orderId)
      .neq('driver_id', driverId)
      .in('status', ['pending', 'offered']);

    // Notify customer that driver accepted
    const customerChannel = supabase.channel(`order_${orderId}`);
    await customerChannel.subscribe();
    await customerChannel.send({
      type: 'broadcast',
      event: 'order_accepted',
      payload: {
        order_id: orderId,
        driver_id: driverId,
        accepted_at: acceptedAt
      }
    });

    // Notify other drivers that order is no longer available
    const driverBroadcastChannel = supabase.channel('driver_broadcast');
    await driverBroadcastChannel.subscribe();
    await driverBroadcastChannel.send({
      type: 'broadcast',
      event: 'order_accepted',
      payload: {
        order_id: orderId,
        message: 'Order has been accepted by another driver'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        driver_id: driverId,
        accepted_at: acceptedAt,
        driver_payout_cents: updatedOrder.driver_payout_cents,
        delivery_fees_total_cents: updatedOrder.delivery_fees_total_cents,
        tip_cents: updatedOrder.tip_cents
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('accept-order error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});













































