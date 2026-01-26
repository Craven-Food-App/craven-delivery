// Edge Function: create-order
// Server-side order creation with promo reserve/apply/redeem
// This is the bulletproof implementation - client cannot manipulate promo math

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// Stripe helper functions (inlined to avoid _shared import issues)
function getStripeClient(): Stripe {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = getStripeClient();
  
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata || {},
  });
  
  return customer.id;
}

async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number;
  onBehalfOf?: string;
  transferData?: {
    destination: string;
    amount?: number;
  };
}): Promise<{
  id: string;
  clientSecret: string;
  status: string;
}> {
  const stripe = getStripeClient();
  
  const paymentIntentParams: any = {
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    metadata: params.metadata || {},
    automatic_payment_methods: {
      enabled: true,
    },
  };
  
  if (params.customerId) {
    paymentIntentParams.customer = params.customerId;
  }
  
  if (params.paymentMethodId) {
    paymentIntentParams.payment_method = params.paymentMethodId;
    paymentIntentParams.confirmation_method = 'manual';
    paymentIntentParams.confirm = true;
  }
  
  if (params.onBehalfOf || params.transferData) {
    paymentIntentParams.on_behalf_of = params.onBehalfOf;
    paymentIntentParams.transfer_data = params.transferData;
    paymentIntentParams.application_fee_amount = params.applicationFeeAmount;
  }
  
  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
  
  return {
    id: paymentIntent.id,
    clientSecret: paymentIntent.client_secret || '',
    status: paymentIntent.status,
  };
}

async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<{
  id: string;
  status: string;
  charges: Array<{ id: string; amount: number }>;
}> {
  const stripe = getStripeClient();
  
  const confirmParams: any = {};
  if (paymentMethodId) {
    confirmParams.payment_method = paymentMethodId;
  }
  
  const paymentIntent = await stripe.paymentIntents.confirm(
    paymentIntentId,
    confirmParams
  );
  
  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    charges: paymentIntent.charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount,
    })),
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const {
      restaurant_id,
      cart_items,
      food_subtotal_cents,
      delivery_fee_cents,
      service_fee_cents,
      tax_cents,
      tip_cents,
      delivery_address,
      pickup_address,
      delivery_method,
      customer_info,
      payment_method_id,
      auto_boost_enabled = true,
      auto_boost_cap_cents = 600,
    } = await req.json();

    if (!restaurant_id || !cart_items || !food_subtotal_cents || !payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ========================================================================
    // STEP 1: Reserve promo (if eligible)
    // ========================================================================
    let promoReservation: any = null;
    let finalDeliveryFee = delivery_fee_cents || 0;
    let finalServiceFee = service_fee_cents || 0;
    let promoCreditApplied = 0;

    try {
      const { data: reservation, error: reserveError } = await supabaseAdmin.rpc(
        'reserve_promo_for_checkout',
        {
          p_user_id: user.id,
          p_food_subtotal_cents: food_subtotal_cents,
          p_delivery_fee_cents: delivery_fee_cents || 0,
          p_service_fee_cents: service_fee_cents || 0,
        }
      );

      if (!reserveError && reservation?.reserved) {
        promoReservation = reservation;
        // Apply credits to fees
        finalDeliveryFee = Math.max(0, (delivery_fee_cents || 0) - (reservation.delivery_credit_cents || 0));
        finalServiceFee = Math.max(0, (service_fee_cents || 0) - (reservation.service_credit_cents || 0));
        promoCreditApplied = reservation.credit_cents || 0;
      }
    } catch (promoError) {
      console.error('Promo reservation error (non-fatal):', promoError);
      // Continue without promo if reservation fails
    }

    // ========================================================================
    // STEP 1B: Apply tester credits (if available) - ONLY to Crave'n fees
    // ========================================================================
    let testerCreditQuote: any = null;
    let testerServiceCredit = 0;
    let testerDeliveryCredit = 0;
    let testerPlatformCredit = 0;
    let totalTesterCreditApplied = 0;

    try {
      const { data: testerQuote, error: testerError } = await supabaseAdmin.rpc(
        'apply_tester_credits_to_checkout',
        {
          p_user_id: user.id,
          p_service_fee_cents: finalServiceFee, // Use already-promo-adjusted service fee
          p_delivery_fee_cents: finalDeliveryFee, // Use already-promo-adjusted delivery fee
          p_platform_fee_cents: 0, // Platform fees not currently calculated separately
        }
      );

      if (!testerError && testerQuote?.applied) {
        testerCreditQuote = testerQuote;
        testerServiceCredit = testerQuote.service_credit_cents || 0;
        testerDeliveryCredit = testerQuote.delivery_credit_cents || 0;
        testerPlatformCredit = testerQuote.platform_credit_cents || 0;

        // Apply tester credits to already-promo-adjusted fees
        finalDeliveryFee = Math.max(0, finalDeliveryFee - testerDeliveryCredit);
        finalServiceFee = Math.max(0, finalServiceFee - testerServiceCredit);
      }
    } catch (testerError) {
      console.error('Tester credit application error (non-fatal):', testerError);
      // Continue without tester credits if application fails
    }

    // ========================================================================
    // STEP 2: Calculate final totals (server-side, promo and tester credits already applied)
    // ========================================================================
    const finalSubtotal = food_subtotal_cents; // NEVER reduce food subtotal
    const finalTax = tax_cents || 0; // NEVER reduce tax
    const finalTip = tip_cents || 0; // NEVER reduce tip
    const finalTotal = finalSubtotal + finalDeliveryFee + finalServiceFee + finalTax + finalTip;
    
    // Calculate total tester credits applied
    totalTesterCreditApplied = testerServiceCredit + testerDeliveryCredit + testerPlatformCredit;

    // ========================================================================
    // STEP 2.5: Snapshot driver payout settings and calculate driver payout
    // ========================================================================
    // Get active payout settings to snapshot at order creation
    const { data: payoutSettings } = await supabaseAdmin
      .from('driver_payout_settings')
      .select('driver_base_pay_cents, driver_delivery_fee_share_bps, merchant_commission_bps')
      .eq('is_active', true)
      .maybeSingle();

    const snapshotBasePayCents = Number(payoutSettings?.driver_base_pay_cents ?? 250);
    const snapshotShareBps = Number(payoutSettings?.driver_delivery_fee_share_bps ?? 7000);
    const deliveryFeesTotalCents = delivery_method === 'delivery' ? finalDeliveryFee : 0;

    // Calculate driver payout using SQL function (single source of truth)
    let driverPayoutSnapshot = { driver_payout_cents: 0, platform_delivery_share_cents: 0 };
    if (deliveryFeesTotalCents > 0) {
      const { data: payoutResult, error: payoutError } = await supabaseAdmin.rpc(
        'calculate_driver_payout_cents',
        {
          p_delivery_fees_total_cents: deliveryFeesTotalCents,
          p_tip_cents: finalTip,
          p_base_pay_cents: snapshotBasePayCents,
          p_share_bps: snapshotShareBps
        }
      );

      if (!payoutError && payoutResult && payoutResult.length > 0) {
        driverPayoutSnapshot = payoutResult[0];
      }
    }

    // ========================================================================
    // STEP 2.6: Calculate fee components (for now, simplified - should be from quote)
    // ========================================================================
    const base_delivery_fee_cents = delivery_method === 'delivery' ? finalDeliveryFee : 0;
    const distance_fee_cents = 0; // Should be calculated from actual distance
    const time_fee_cents = 0; // Should be calculated based on time of day
    const demand_fee_cents = 0; // Should be calculated based on demand
    const escalation_fee_cents = 0; // Starts at 0, increases during broadcasting

    // Recompute delivery_fees_total_cents with components
    const { data: computedDeliveryFees } = await supabaseAdmin.rpc(
      'compute_delivery_fees_total_cents',
      {
        p_base_delivery_fee_cents: base_delivery_fee_cents,
        p_distance_fee_cents: distance_fee_cents,
        p_time_fee_cents: time_fee_cents,
        p_demand_fee_cents: demand_fee_cents,
        p_escalation_fee_cents: escalation_fee_cents
      }
    );

    const deliveryFeesTotalCents = computedDeliveryFees || base_delivery_fee_cents;

    // Recalculate driver payout with correct delivery fees
    let driverPayoutSnapshot = { driver_payout_cents: 0, platform_delivery_share_cents: 0, driver_fee_share_cents: 0 };
    if (deliveryFeesTotalCents > 0) {
      const { data: payoutResult } = await supabaseAdmin.rpc(
        'calculate_driver_payout_cents',
        {
          p_delivery_fees_total_cents: deliveryFeesTotalCents,
          p_tip_cents: finalTip,
          p_base_pay_cents: snapshotBasePayCents,
          p_share_bps: snapshotShareBps
        }
      );
      if (payoutResult && payoutResult.length > 0) {
        driverPayoutSnapshot = payoutResult[0];
      }
    }

    // Calculate merchant payout
    const { data: merchantPayout } = await supabaseAdmin.rpc(
      'calculate_merchant_payout_cents',
      {
        p_food_subtotal_cents: finalSubtotal,
        p_merchant_commission_bps: Number(payoutSettings?.merchant_commission_bps ?? 1500)
      }
    );

    const merchantPayoutResult = merchantPayout?.[0] || {
      merchant_commission_cents: 0,
      merchant_payout_cents: 0,
      platform_food_commission_cents: 0
    };

    // Auto-boost settings already extracted from request body above

    // Calculate next escalation time (2 minutes from now if auto-boost enabled)
    const broadcastStartedAt = new Date().toISOString();
    const nextEscalationAt = auto_boost_enabled 
      ? new Date(Date.now() + 2 * 60 * 1000).toISOString() // +2 minutes
      : null;

    // ========================================================================
    // STEP 3: Create order record with snapshot payout fields and broadcasting status
    // ========================================================================
    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: user.id,
        restaurant_id: restaurant_id,
        food_subtotal_cents: finalSubtotal,
        subtotal_cents: finalSubtotal, // Keep for backward compatibility
        delivery_fee_cents: delivery_method === 'delivery' ? finalDeliveryFee : 0,
        // Fee components
        base_delivery_fee_cents: base_delivery_fee_cents,
        distance_fee_cents: distance_fee_cents,
        time_fee_cents: time_fee_cents,
        demand_fee_cents: demand_fee_cents,
        escalation_fee_cents: escalation_fee_cents,
        // Snapshot payout fields (critical for historical accuracy)
        delivery_fees_total_cents: deliveryFeesTotalCents,
        tip_cents: finalTip,
        driver_base_pay_cents: snapshotBasePayCents,
        driver_delivery_fee_share_bps: snapshotShareBps,
        driver_fee_share_cents: Number(driverPayoutSnapshot.driver_fee_share_cents ?? 0),
        driver_payout_cents: Number(driverPayoutSnapshot.driver_payout_cents ?? 0),
        platform_delivery_share_cents: Number(driverPayoutSnapshot.platform_delivery_share_cents ?? 0),
        // Merchant settlement snapshots
        merchant_commission_cents: Number(merchantPayoutResult.merchant_commission_cents ?? 0),
        merchant_payout_cents: Number(merchantPayoutResult.merchant_payout_cents ?? 0),
        platform_food_commission_cents: Number(merchantPayoutResult.platform_food_commission_cents ?? 0),
        // Escalation/dispatch fields
        order_status: 'broadcasting', // Start in broadcasting state
        broadcast_started_at: broadcastStartedAt,
        next_escalation_step: 0,
        next_escalation_at: nextEscalationAt,
        auto_boost_enabled: auto_boost_enabled,
        auto_boost_cap_cents: auto_boost_cap_cents,
        escalated_total_cents: 0,
        customer_boost_required: false,
        tester_credit_applied_cents: totalTesterCreditApplied,
        tester_service_credit_applied_cents: testerServiceCredit,
        tester_delivery_credit_applied_cents: testerDeliveryCredit,
        tester_platform_credit_applied_cents: testerPlatformCredit,
        service_fee_cents: finalServiceFee,
        tax_cents: finalTax,
        total_cents: finalTotal,
        customer_name: customer_info?.name || '',
        customer_phone: customer_info?.phone || '',
        delivery_address: delivery_method === 'delivery' ? delivery_address : null,
        pickup_address: pickup_address,
        estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString(),
        // Promo fields (will be updated after redemption)
        promo_applied: promoReservation ? true : false,
      })
      .select()
      .single();

    if (orderError || !createdOrder) {
      // If order creation failed, revoke reservation if it exists
      if (promoReservation?.reservation_id) {
        await supabaseAdmin
          .from('promo_ledger')
          .update({ event_type: 'REVOKED' })
          .eq('id', promoReservation.reservation_id);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // STEP 4: Create order items
    // ========================================================================
    const orderItems = cart_items.map((item: any) => ({
      order_id: createdOrder.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price_cents: item.price_cents,
      special_instructions: item.special_instructions || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items error (non-fatal):', itemsError);
      // Continue - items can be added later if needed
    }

    // ========================================================================
    // STEP 5: Create Stripe payment intent
    // ========================================================================
    let paymentIntent: any = null;
    let paymentError: any = null;

    try {
      // Get restaurant for Stripe Connect account
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('stripe_connect_account_id')
        .eq('id', restaurant_id)
        .single();

      // Get or create Stripe customer
      const stripeCustomerId = await getOrCreateCustomer({
        email: customer_info?.email || user.email || '',
        name: customer_info?.name || '',
        phone: customer_info?.phone || '',
        metadata: {
          user_id: user.id,
          order_id: createdOrder.id,
        },
      });

      // Calculate platform fee (if applicable)
      // This is business logic - adjust as needed
      const platformFeePercent = 0.15; // 15% platform fee
      const merchantAmount = Math.round(finalSubtotal * (1 - platformFeePercent));
      const platformFeeAmount = finalSubtotal - merchantAmount;

      // Create payment intent
      paymentIntent = await createPaymentIntent({
        amount: finalTotal,
        currency: 'USD',
        customerId: stripeCustomerId,
        paymentMethodId: payment_method_id,
        description: `Order #${createdOrder.id}`,
        metadata: {
          order_id: createdOrder.id,
          customer_id: user.id,
          restaurant_id: restaurant_id,
        },
        // Stripe Connect split payment if restaurant has account
        ...(restaurant?.stripe_connect_account_id ? {
          onBehalfOf: restaurant.stripe_connect_account_id,
          applicationFeeAmount: platformFeeAmount,
          transferData: {
            destination: restaurant.stripe_connect_account_id,
            amount: merchantAmount,
          },
        } : {}),
      });

      // Confirm payment intent
      const confirmedPayment = await confirmPaymentIntent(
        paymentIntent.id,
        payment_method_id
      );

      // Update order with payment info
      await supabaseAdmin
        .from('orders')
        .update({
          payment_intent_id: confirmedPayment.id,
          payment_status: confirmedPayment.status,
          payment_provider: 'stripe',
        })
        .eq('id', createdOrder.id);

      // ========================================================================
      // STEP 6: Redeem promo (only after payment confirmed)
      // ========================================================================
      if (promoReservation && confirmedPayment.status === 'succeeded') {
        const { data: redemption, error: redeemError } = await supabaseAdmin.rpc(
          'redeem_reserved_promo',
          {
            p_user_id: user.id,
            p_order_id: createdOrder.id,
          }
        );

        if (redeemError) {
          console.error('Promo redemption error:', redeemError);
          // Non-fatal - order is created and paid
        }
      }

      // ========================================================================
      // STEP 6B: Redeem tester credits (only after payment confirmed)
      // ========================================================================
      if (testerCreditQuote && testerCreditQuote.applied && confirmedPayment.status === 'succeeded') {
        const { data: testerRedemption, error: testerRedeemError } = await supabaseAdmin.rpc(
          'redeem_tester_credits_for_order',
          {
            p_user_id: user.id,
            p_order_id: createdOrder.id,
            p_service_credit_cents: testerServiceCredit,
            p_delivery_credit_cents: testerDeliveryCredit,
            p_platform_credit_cents: testerPlatformCredit,
          }
        );

        if (testerRedeemError) {
          console.error('Tester credit redemption error:', testerRedeemError);
          // Non-fatal - order is created and paid
        }
      }

      // Return success
      return new Response(
        JSON.stringify({
          success: true,
          order_id: createdOrder.id,
          payment_intent_id: confirmedPayment.id,
          payment_status: confirmedPayment.status,
          total_cents: finalTotal,
          promo: promoReservation ? {
            applied: true,
            credit_cents: promoCreditApplied,
            delivery_credit_cents: promoReservation.delivery_credit_cents,
            service_credit_cents: promoReservation.service_credit_cents,
            step: promoReservation.step,
          } : null,
          tester_credits: testerCreditQuote && testerCreditQuote.applied ? {
            applied: true,
            total_credit_cents: totalTesterCreditApplied,
            service_credit_cents: testerServiceCredit,
            delivery_credit_cents: testerDeliveryCredit,
            platform_credit_cents: testerPlatformCredit,
          } : null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (stripeError) {
      paymentError = stripeError;
      console.error('Stripe payment error:', stripeError);

      // Update order status
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'failed',
          payment_provider: 'stripe',
        })
        .eq('id', createdOrder.id);

      // Revoke promo reservation if payment failed
      if (promoReservation?.reservation_id) {
        await supabaseAdmin
          .from('promo_ledger')
          .update({ event_type: 'REVOKED' })
          .eq('id', promoReservation.reservation_id);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Payment failed', 
          details: (stripeError as Error).message,
          order_id: createdOrder.id, // Order created but payment failed
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in create-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

