import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, driverId, deliveryPhotoUrl, pickupPhotoUrl } = await req.json();

    if (!orderId) throw new Error("Missing orderId");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, driver_id, assigned_craver_id, subtotal_cents, tip_cents, order_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw orderError ?? new Error("Order not found");

    // Determine driver id
    const resolvedDriverId = driverId || order.driver_id || order.assigned_craver_id;
    if (!resolvedDriverId) throw new Error("Driver not assigned to this order");

    // Prepare order update data
    const updateData: any = {
      order_status: 'delivered',
      driver_id: resolvedDriverId
    };

    // Add photo URLs if provided
    if (deliveryPhotoUrl) {
      updateData.delivery_photo_url = deliveryPhotoUrl;
    }
    if (pickupPhotoUrl) {
      updateData.pickup_photo_url = pickupPhotoUrl;
    }

    // Update order status to delivered and add photos
    if (order.order_status !== 'delivered') {
      const { error: statusErr } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      if (statusErr) throw statusErr;
    }

    // Get active payout setting
    const { data: setting } = await supabase
      .from('driver_payout_settings')
      .select('percentage')
      .eq('is_active', true)
      .maybeSingle();

    const percentage = Number(setting?.percentage ?? 70);

    const subtotal = Number(order.subtotal_cents ?? 0);
    const tip = Number(order.tip_cents ?? 0);

    // Calculate earnings
    const basePay = Math.round((percentage / 100) * subtotal);
    const total = basePay + tip;

    // Insert driver_earnings record (idempotent-ish: avoid duplicates for same order)
    // Try delete existing then insert to keep it simple
    await supabase.from('driver_earnings').delete().eq('order_id', orderId).eq('driver_id', resolvedDriverId);

    const { error: earnErr } = await supabase.from('driver_earnings').insert({
      driver_id: resolvedDriverId,
      order_id: orderId,
      amount_cents: basePay,
      tip_cents: tip,
      total_cents: total,
      payout_cents: total,
    });

    if (earnErr) throw earnErr;

    console.log('Delivery finalized:', {
      orderId,
      driverId: resolvedDriverId,
      earnings: total / 100,
      hasPickupPhoto: !!pickupPhotoUrl,
      hasDeliveryPhoto: !!deliveryPhotoUrl
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        percentage, 
        basePay, 
        tip, 
        total,
        photos: {
          pickup: pickupPhotoUrl,
          delivery: deliveryPhotoUrl
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('finalize-delivery error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
