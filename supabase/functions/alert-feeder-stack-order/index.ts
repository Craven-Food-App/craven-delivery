// Supabase Edge Function: alert-feeder-stack-order
// Alerts feeders when a stacked order is created (may require different feeder if out of area)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { parentOrderId, stackedOrderId } = await req.json();

    if (!parentOrderId || !stackedOrderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get parent order details
    const { data: parentOrder, error: parentError } = await supabase
      .from('orders')
      .select('*, restaurant:restaurants(*)')
      .eq('id', parentOrderId)
      .single();

    if (parentError || !parentOrder) {
      throw new Error('Parent order not found');
    }

    // Get stacked order details
    const { data: stackedOrder, error: stackedError } = await supabase
      .from('orders')
      .select('*, restaurant:restaurants(*)')
      .eq('id', stackedOrderId)
      .single();

    if (stackedError || !stackedOrder) {
      throw new Error('Stacked order not found');
    }

    // Check if parent order has an assigned feeder
    let assignedFeederId = null;
    const { data: parentDelivery } = await supabase
      .from('deliveries')
      .select('feeder_id, feeder:user_profiles(*)')
      .eq('order_id', parentOrderId)
      .maybeSingle();

    if (parentDelivery?.feeder_id) {
      assignedFeederId = parentDelivery.feeder_id;
      console.log(`Parent order has assigned feeder: ${assignedFeederId}`);
    }

    // Calculate distance between parent and stacked restaurants
    // Simplified distance check - in production would use proper geolocation
    const parentLat = parentOrder.restaurant.latitude || 0;
    const parentLng = parentOrder.restaurant.longitude || 0;
    const stackedLat = stackedOrder.restaurant.latitude || 0;
    const stackedLng = stackedOrder.restaurant.longitude || 0;

    const distance = Math.sqrt(
      Math.pow(stackedLat - parentLat, 2) + Math.pow(stackedLng - parentLng, 2)
    );

    const MAX_SAME_FEEDER_DISTANCE = 0.1; // ~7 miles in lat/lng degrees (simplified)
    const needsDifferentFeeder = distance > MAX_SAME_FEEDER_DISTANCE;

    console.log(`Distance between restaurants: ${distance.toFixed(4)} degrees`);
    console.log(`Needs different feeder: ${needsDifferentFeeder}`);

    // Create notification for the appropriate feeder(s)
    if (assignedFeederId && !needsDifferentFeeder) {
      // Alert existing feeder about additional pickup
      await supabase.from('notifications').insert({
        user_id: assignedFeederId,
        title: 'Stacked Order Added',
        message: `Customer added another order from ${stackedOrder.restaurant.name} to your current delivery. Pick up both orders.`,
        type: 'order_stacked',
        data: {
          parent_order_id: parentOrderId,
          stacked_order_id: stackedOrderId,
          stack_type: 'same_feeder'
        }
      });

      console.log(`Notified existing feeder ${assignedFeederId} about stacked order`);
    } else if (needsDifferentFeeder) {
      // Find nearby feeder for the stacked order location
      // This would normally query available feeders near stackedOrder.restaurant
      // For now, we create a delivery record that can be picked up by any feeder

      await supabase.from('deliveries').insert({
        order_id: stackedOrderId,
        status: 'pending',
        pickup_address: {
          name: stackedOrder.restaurant.name,
          address: stackedOrder.restaurant.address,
          lat: stackedLat,
          lng: stackedLng
        },
        dropoff_address: stackedOrder.delivery_address,
        is_part_of_stack: true,
        stack_parent_order_id: parentOrderId
      });

      // Send general alert to available feeders in the area
      // (Would integrate with feeder app push notifications in production)
      console.log(`Created delivery record for stacked order, awaiting nearby feeder assignment`);
    }

    // Update stacked order with feeder assignment info
    await supabase
      .from('orders')
      .update({
        notes: needsDifferentFeeder 
          ? 'Stacked order - different feeder needed due to distance'
          : `Stacked with order ${parentOrderId} - same feeder`
      })
      .eq('id', stackedOrderId);

    return new Response(
      JSON.stringify({ 
        success: true,
        needs_different_feeder: needsDifferentFeeder,
        assigned_feeder_id: assignedFeederId,
        message: needsDifferentFeeder 
          ? 'Different feeder needed for stacked order'
          : 'Existing feeder notified of stack'
      }),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Feeder alerting error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to alert feeder',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  }
});

