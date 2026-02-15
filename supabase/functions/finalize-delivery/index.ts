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

    // Fetch order details with snapshot payout fields
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, driver_id, assigned_craver_id, subtotal_cents, tip_cents, order_status, delivery_fees_total_cents, driver_base_pay_cents, driver_delivery_fee_share_bps, delivery_fee_cents")
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

    // Get payout values from order snapshot (if available) or current settings
    // Use snapshot values if they exist, otherwise fall back to current settings
    let deliveryFeesTotal = Number(order.delivery_fees_total_cents ?? 0);
    let basePayCents = Number(order.driver_base_pay_cents ?? 250);
    let shareBps = Number(order.driver_delivery_fee_share_bps ?? 7000);
    const tip = Number(order.tip_cents ?? 0); // 100% of customer's selected tip goes to driver

    // If snapshot fields are missing, try to get from delivery_fee_cents and current settings
    if (deliveryFeesTotal === 0 && order.delivery_fee_cents) {
      deliveryFeesTotal = Number(order.delivery_fee_cents);
    }

    // If still missing snapshot values, get from current settings
    if (basePayCents === 250 || shareBps === 7000) {
      const { data: setting } = await supabase
        .from('driver_payout_settings')
        .select('driver_base_pay_cents, driver_delivery_fee_share_bps')
        .eq('is_active', true)
        .maybeSingle();

      if (setting) {
        if (basePayCents === 250) basePayCents = Number(setting.driver_base_pay_cents ?? 250);
        if (shareBps === 7000) shareBps = Number(setting.driver_delivery_fee_share_bps ?? 7000);
      }
    }

    // Calculate driver payout using SQL function (single source of truth)
    const { data: payoutResult, error: payoutError } = await supabase.rpc(
      'calculate_driver_payout_cents',
      {
        p_delivery_fees_total_cents: deliveryFeesTotal,
        p_tip_cents: tip,
        p_base_pay_cents: basePayCents,
        p_share_bps: shareBps
      }
    );

    if (payoutError || !payoutResult || payoutResult.length === 0) {
      throw new Error(`Failed to calculate driver payout: ${payoutError?.message || 'Unknown error'}`);
    }

    const payout = payoutResult[0];
    const driverPayoutCents = Number(payout.driver_payout_cents ?? 0);
    const driverBeforeTipCents = Number(payout.driver_before_tip_cents ?? 0);

    // Insert driver_earnings record (idempotent-ish: avoid duplicates for same order)
    // Try delete existing then insert to keep it simple
    await supabase.from('driver_earnings').delete().eq('order_id', orderId).eq('driver_id', resolvedDriverId);

    const { error: earnErr } = await supabase.from('driver_earnings').insert({
      driver_id: resolvedDriverId,
      order_id: orderId,
      amount_cents: driverBeforeTipCents, // Base pay (before tip)
      tip_cents: tip,
      total_cents: driverPayoutCents, // Total payout (base + tip)
      payout_cents: driverPayoutCents,
    });

    if (earnErr) throw earnErr;

    // NEW: Credit driver wallet with earnings (for feeder card spends)
    const { error: walletErr } = await supabase.rpc('credit_wallet_from_earnings', {
      p_driver_id: resolvedDriverId,
      p_amount_cents: driverPayoutCents,
      p_order_id: orderId
    });

    if (walletErr) {
      console.error('Failed to credit wallet:', walletErr);
      // Non-fatal: earnings record is still created
    }

    // DUAL-WRITE: Also write to feeder_wallet_ledger_entries for persistent balance
    try {
      // Ensure feeder wallet exists (idempotent upsert)
      const { data: wallet } = await supabase
        .from('feeder_wallets')
        .upsert({ feeder_id: resolvedDriverId, currency: 'USD' }, { onConflict: 'feeder_id' })
        .select('id')
        .single();

      if (wallet?.id) {
        // Build ledger entries
        const ledgerEntries: any[] = [];
        if (driverBeforeTipCents > 0) {
          ledgerEntries.push({
            wallet_id: wallet.id,
            feeder_id: resolvedDriverId,
            occurred_at: new Date().toISOString(),
            type: 'earnings_base_pay',
            direction: 'credit',
            amount_cents: driverBeforeTipCents,
            status: 'available',
            source_type: 'order',
            source_id: orderId,
            idempotency_key: `order_${orderId}_base_pay`,
          });
        }
        if (tip > 0) {
          ledgerEntries.push({
            wallet_id: wallet.id,
            feeder_id: resolvedDriverId,
            occurred_at: new Date().toISOString(),
            type: 'earnings_tip',
            direction: 'credit',
            amount_cents: tip,
            status: 'available',
            source_type: 'order',
            source_id: orderId,
            idempotency_key: `order_${orderId}_tip`,
          });
        }
        // Upsert each entry (idempotent via idempotency_key)
        for (const entry of ledgerEntries) {
          const { error: ledgerErr } = await supabase
            .from('feeder_wallet_ledger_entries')
            .upsert(entry, { onConflict: 'idempotency_key' });
          if (ledgerErr) {
            console.error('Ledger entry write error (non-fatal):', ledgerErr);
          }
        }
      }
    } catch (ledgerError) {
      console.error('Feeder ledger dual-write error (non-fatal):', ledgerError);
    }

    // Deduct inventory for non-restaurant merchants (grocery/retail/etc.)
    try {
      // Get order items and restaurant_id
      const { data: orderForInv } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .single();

      if (orderForInv?.restaurant_id) {
        const { data: orderItemsForInv } = await supabase
          .from('order_items')
          .select('menu_item_id, quantity')
          .eq('order_id', orderId);

        if (orderItemsForInv && orderItemsForInv.length > 0) {
          await supabase.rpc('deduct_inventory', {
            p_restaurant_id: orderForInv.restaurant_id,
            p_items: orderItemsForInv.map((i: any) => ({
              menu_item_id: i.menu_item_id,
              quantity: i.quantity,
            })),
          });
        }
      }
    } catch (invErr) {
      console.error('Inventory deduction error (non-fatal):', invErr);
      // Non-fatal: delivery is still finalized, inventory deduction can be reconciled
    }

    console.log('Delivery finalized:', {
      orderId,
      driverId: resolvedDriverId,
      deliveryFeesTotal: deliveryFeesTotal / 100,
      basePay: driverBeforeTipCents / 100,
      tip: tip / 100,
      totalEarnings: driverPayoutCents / 100,
      walletCredited: !walletErr,
      hasPickupPhoto: !!pickupPhotoUrl,
      hasDeliveryPhoto: !!deliveryPhotoUrl
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deliveryFeesTotal: deliveryFeesTotal,
        basePay: driverBeforeTipCents, 
        tip: tip, 
        total: driverPayoutCents,
        shareBps: shareBps,
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
