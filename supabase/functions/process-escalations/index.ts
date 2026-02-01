// Edge Function: process-escalations
// Cron job to process order escalations every 30-60 seconds
// Increases delivery fees for orders that haven't been accepted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Escalation schedule configuration
const ESCALATION_STEPS = [
  { minutes: 2, increment_cents: 100 },  // +2 min: +$1.00
  { minutes: 5, increment_cents: 200 },  // +5 min: +$2.00 more (total +$3.00)
  { minutes: 8, increment_cents: 300 },   // +8 min: +$3.00 more (total +$6.00)
];

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

    const now = new Date();

    // Find orders that need escalation
    const { data: ordersToEscalate, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_status', 'broadcasting')
      .is('accepted_driver_id', null)
      .not('next_escalation_at', 'is', null)
      .lte('next_escalation_at', now.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch orders: ${fetchError.message}`);
    }

    if (!ordersToEscalate || ordersToEscalate.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No orders to escalate",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processed = [];
    const skipped = [];

    for (const order of ordersToEscalate) {
      try {
        // Double-check order is still broadcasting and not accepted
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('order_status, accepted_driver_id, next_escalation_step')
          .eq('id', order.id)
          .single();

        if (!currentOrder || 
            currentOrder.order_status !== 'broadcasting' || 
            currentOrder.accepted_driver_id !== null) {
          skipped.push({ order_id: order.id, reason: 'Order no longer broadcasting or already accepted' });
          continue;
        }

        const currentStep = currentOrder.next_escalation_step || 0;

        // Check if we've reached the last escalation step
        if (currentStep >= ESCALATION_STEPS.length) {
          // No more escalation steps, stop escalation
          await supabase
            .from('orders')
            .update({ next_escalation_at: null })
            .eq('id', order.id);
          skipped.push({ order_id: order.id, reason: 'All escalation steps completed' });
          continue;
        }

        const escalationStep = ESCALATION_STEPS[currentStep];
        const incrementCents = escalationStep.increment_cents;

        // Check auto-boost cap
        if (order.auto_boost_enabled) {
          const newEscalatedTotal = (order.escalated_total_cents || 0) + incrementCents;
          if (newEscalatedTotal > order.auto_boost_cap_cents) {
            // Cap reached, stop auto escalation
            await supabase
              .from('orders')
              .update({ 
                next_escalation_at: null,
                customer_boost_required: true // Signal customer can manually boost
              })
              .eq('id', order.id);
            skipped.push({ order_id: order.id, reason: 'Auto-boost cap reached' });
            continue;
          }
        } else {
          // Auto-boost disabled, require manual boost
          await supabase
            .from('orders')
            .update({ 
              customer_boost_required: true,
              next_escalation_at: null // Stop auto escalation
            })
            .eq('id', order.id);
          skipped.push({ order_id: order.id, reason: 'Auto-boost disabled, manual boost required' });
          continue;
        }

        // Apply escalation increment
        const newEscalationFee = (order.escalation_fee_cents || 0) + incrementCents;
        const newEscalatedTotal = (order.escalated_total_cents || 0) + incrementCents;

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

        // Calculate next escalation time
        const broadcastStartedAt = new Date(order.broadcast_started_at);
        const nextStepIndex = currentStep + 1;
        let nextEscalationAt = null;

        if (nextStepIndex < ESCALATION_STEPS.length) {
          const nextStep = ESCALATION_STEPS[nextStepIndex];
          const nextEscalationTime = new Date(broadcastStartedAt);
          nextEscalationTime.setMinutes(nextEscalationTime.getMinutes() + nextStep.minutes);
          nextEscalationAt = nextEscalationTime.toISOString();
        }

        // Update order with escalated values
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            escalation_fee_cents: newEscalationFee,
            escalated_total_cents: newEscalatedTotal,
            delivery_fees_total_cents: newDeliveryFeesTotalCents,
            driver_fee_share_cents: driverPayoutResult.driver_fee_share_cents,
            driver_payout_cents: driverPayoutResult.driver_payout_cents,
            platform_delivery_share_cents: driverPayoutResult.platform_delivery_share_cents,
            next_escalation_step: nextStepIndex,
            next_escalation_at: nextEscalationAt,
            updated_at: now.toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          throw new Error(`Failed to update order ${order.id}: ${updateError.message}`);
        }

        // Recalculate customer total (for display)
        const newCustomerTotal = (order.food_subtotal_cents || 0) + 
                                 (order.tax_cents || 0) + 
                                 newDeliveryFeesTotalCents + 
                                 (order.tip_cents || 0);

        // Update customer total
        await supabase
          .from('orders')
          .update({ total_cents: newCustomerTotal })
          .eq('id', order.id);

        // Rebroadcast updated offer to drivers
        const driverBroadcastChannel = supabase.channel('driver_broadcast');
        await driverBroadcastChannel.subscribe();
        await driverBroadcastChannel.send({
          type: 'broadcast',
          event: 'order_updated',
          payload: {
            order_id: order.id,
            driver_payout_cents: driverPayoutResult.driver_payout_cents,
            delivery_fees_total_cents: newDeliveryFeesTotalCents,
            escalation_fee_cents: newEscalationFee,
            message: 'Updated payout'
          }
        });

        // Notify customer of escalation
        const customerChannel = supabase.channel(`order_${order.id}`);
        await customerChannel.subscribe();
        await customerChannel.send({
          type: 'broadcast',
          event: 'order_escalated',
          payload: {
            order_id: order.id,
            escalation_fee_cents: newEscalationFee,
            delivery_fees_total_cents: newDeliveryFeesTotalCents,
            customer_total_cents: newCustomerTotal
          }
        });

        processed.push({
          order_id: order.id,
          escalation_step: currentStep,
          increment_cents: incrementCents,
          new_escalation_fee_cents: newEscalationFee,
          new_driver_payout_cents: driverPayoutResult.driver_payout_cents
        });

      } catch (error) {
        console.error(`Error processing escalation for order ${order.id}:`, error);
        skipped.push({ 
          order_id: order.id, 
          reason: `Error: ${(error as Error).message}` 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        skipped: skipped.length,
        details: {
          processed,
          skipped
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('process-escalations error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
















