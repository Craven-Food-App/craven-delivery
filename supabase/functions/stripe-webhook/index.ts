import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateLimit, RateLimitPresets } from '../_shared/rateLimit.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// CRITICAL: Use service role for RPC calls
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.API);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[Webhook] ${event.type} (${event.id})`);

    // PRODUCTION-SAFE: INSERT-first dedupe (minimal metadata only)
    const metadata = {
      object_id: (event.data.object as any).id,
      amount: (event.data.object as any).amount,
      metadata: (event.data.object as any).metadata || {},
    };

    const { error: insertError } = await supabase
      .from('stripe_events')
      .insert({
        event_id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        status: 'received',
        metadata,
      });

    // Duplicate key violation = already processed (23505)
    if (insertError?.code === '23505') {
      console.log(`[Webhook] Duplicate event ${event.id}`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    if (insertError) throw insertError;

    // Handle event
    try {
      await handleWebhookEvent(event);
      
      await supabase
        .from('stripe_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', event.id);

    } catch (handlerError: any) {
      console.error(`[Webhook] Handler error:`, handlerError);
      
      await supabase
        .from('stripe_events')
        .update({ status: 'failed', error: handlerError.message })
        .eq('event_id', event.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});

async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
      break;
    // Driver instant payout status updates
    case 'payout.paid':
    case 'payout.failed':
    case 'payout.canceled':
      await handlePayoutUpdate(event.data.object as Stripe.Payout);
      break;
    // Keep existing CraveMore subscription handlers
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription, event.type);
      break;
    default:
      console.log(`[Webhook] Unhandled: ${event.type}`);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  await supabase
    .from('stripe_accounts')
    .update({
      details_submitted: account.details_submitted || false,
      payouts_enabled: account.payouts_enabled || false,
      charges_enabled: account.charges_enabled || false,
      requirements: account.requirements || {},
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);
}

async function handlePayoutUpdate(payout: Stripe.Payout) {
  console.log(`[Webhook] Payout ${payout.id}: ${payout.status}`);
  
  const { error } = await supabase
    .from('driver_payouts')
    .update({
      status: payout.status,
      arrival_date: payout.arrival_date 
        ? new Date(payout.arrival_date * 1000).toISOString()
        : null,
      failure_code: payout.failure_code || null,
      failure_message: payout.failure_message || null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payout_id', payout.id);

  if (error) {
    console.error(`[Webhook] Failed to update payout ${payout.id}:`, error);
    throw error;
  }

  console.log(`[Webhook] Payout ${payout.id} updated to ${payout.status}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // CRITICAL: Only trust order_id from metadata
  const order_id = paymentIntent.metadata.order_id;

  if (!order_id) {
    console.error('[Payment] Missing order_id in metadata');
    return;
  }

  console.log(`[Payment Succeeded] Order: ${order_id}`);

  // LEASE-PROTECTED: Lock order via RPC
  const { data: lockResult, error: lockError } = await supabase
    .rpc('lock_order_for_transfers', {
      p_order_id: order_id,
      p_stripe_payment_intent_id: paymentIntent.id,
    })
    .single();

  if (lockError) {
    throw new Error(`Lock failed: ${lockError.message}`);
  }

  const order = Array.isArray(lockResult) ? lockResult[0] : lockResult;

  // Check status_code
  if (order.status_code === 'complete' || order.status_code === 'locked') {
    console.log(`[Payment] Order ${order_id} status: ${order.status_code}`);
    return;
  }

  if (order.status_code !== 'acquired') {
    throw new Error(`Unexpected status_code: ${order.status_code}`);
  }

  const lease_id = order.transfers_lease_id;

  if (!lease_id) {
    throw new Error('No lease ID returned from lock');
  }

  // Get restaurant_id and driver_id from FRESH order state (NOT from PI metadata)
  const restaurant_id = order.restaurant_id;
  const driver_id = order.driver_id;

  // Get connected accounts
  const { data: restaurantAccount } = await supabase
    .from('stripe_accounts')
    .select('stripe_account_id')
    .eq('owner_type', 'restaurant')
    .eq('owner_id', restaurant_id)
    .single();

  if (!restaurantAccount?.stripe_account_id) {
    await supabase.rpc('mark_transfer_failed', {
      p_order_id: order_id,
      p_transfers_lease_id: lease_id,
      p_error_message: `Restaurant ${restaurant_id} has no Stripe account`,
    });
    throw new Error(`Restaurant ${restaurant_id} has no Stripe account`);
  }

  let driverAccount = null;
  if (driver_id) {
    const { data: driverAcc } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('owner_type', 'driver')
      .eq('owner_id', driver_id)
      .single();
    driverAccount = driverAcc;
  }

  // PARTIAL SUCCESS SAFE: Use fresh state transfer IDs
  let restaurantTransferId = order.stripe_transfer_restaurant_id;
  let driverTransferId = order.stripe_transfer_driver_id;

  try {
    // Restaurant transfer (only if not already created)
    if (!restaurantTransferId && order.restaurant_net_cents > 0) {
      const restaurantTransfer = await stripe.transfers.create(
        {
          amount: order.restaurant_net_cents,
          currency: order.currency,
          destination: restaurantAccount.stripe_account_id,
          description: `Order ${order_id} - Restaurant payout`,
          metadata: { order_id, restaurant_id, type: 'restaurant_net' },
        },
        { idempotencyKey: `order:${order_id}:transfer:restaurant` }
      );
      restaurantTransferId = restaurantTransfer.id;
      console.log(`[Transfer] Restaurant: ${restaurantTransferId}`);

      // Store immediately (partial success protection)
      await supabase
        .from('orders')
        .update({ stripe_transfer_restaurant_id: restaurantTransferId })
        .eq('id', order_id);
    }

    // Driver transfer (only if not already created)
    const driverAmount = (order.driver_pay_cents || 0) + (order.tip_cents || 0);
    if (!driverTransferId && driverAmount > 0 && driverAccount) {
      const driverTransfer = await stripe.transfers.create(
        {
          amount: driverAmount,
          currency: order.currency,
          destination: driverAccount.stripe_account_id,
          description: `Order ${order_id} - Driver payout`,
          metadata: { order_id, driver_id, type: 'driver_pay_tip' },
        },
        { idempotencyKey: `order:${order_id}:transfer:driver` }
      );
      driverTransferId = driverTransfer.id;
      console.log(`[Transfer] Driver: ${driverTransferId}`);

      // Store immediately
      await supabase
        .from('orders')
        .update({ stripe_transfer_driver_id: driverTransferId })
        .eq('id', order_id);
    }

    // LEASE-PROTECTED: Finalize
    await supabase.rpc('finalize_order_transfers', {
      p_order_id: order_id,
      p_transfers_lease_id: lease_id,
      p_restaurant_transfer_id: restaurantTransferId,
      p_driver_transfer_id: driverTransferId,
    });

    // Write ledger entries (idempotent)
    await writeLedgerEntries(order, restaurantTransferId, driverTransferId, paymentIntent.id);

    console.log(`[Payment] Order ${order_id} complete`);

  } catch (transferError: any) {
    console.error(`[Transfer Error]:`, transferError);

    await supabase.rpc('mark_transfer_failed', {
      p_order_id: order_id,
      p_transfers_lease_id: lease_id,
      p_error_message: transferError.message,
      p_restaurant_transfer_id: restaurantTransferId,
      p_driver_transfer_id: driverTransferId,
    });

    throw transferError;
  }
}

async function writeLedgerEntries(
  order: any,
  restaurantTransferId: string | null,
  driverTransferId: string | null,
  paymentIntentId: string
) {
  const entries = [
    {
      order_id: order.order_id,
      entry_type: 'customer_charge',
      owner_type: 'platform',
      owner_id: null,
      amount_cents: order.amount_total_cents,
      currency: order.currency,
      stripe_object_id: paymentIntentId,
      memo: `Customer payment`,
    },
    order.platform_fee_cents > 0 && {
      order_id: order.order_id,
      entry_type: 'platform_fee',
      owner_type: 'platform',
      owner_id: null,
      amount_cents: order.platform_fee_cents,
      currency: order.currency,
      memo: `Platform fee (15%)`,
    },
    restaurantTransferId && {
      order_id: order.order_id,
      entry_type: 'restaurant_net',
      owner_type: 'restaurant',
      owner_id: order.restaurant_id,
      amount_cents: order.restaurant_net_cents,
      currency: order.currency,
      stripe_object_id: restaurantTransferId,
      memo: `Restaurant payout`,
    },
    driverTransferId && order.driver_pay_cents > 0 && {
      order_id: order.order_id,
      entry_type: 'driver_pay',
      owner_type: 'driver',
      owner_id: order.driver_id,
      amount_cents: order.driver_pay_cents,
      currency: order.currency,
      stripe_object_id: driverTransferId,
      memo: `Driver delivery fee`,
    },
    driverTransferId && order.tip_cents > 0 && {
      order_id: order.order_id,
      entry_type: 'tip',
      owner_type: 'driver',
      owner_id: order.driver_id,
      amount_cents: order.tip_cents,
      currency: order.currency,
      stripe_object_id: driverTransferId,
      memo: `Driver tip`,
    },
  ].filter(Boolean);

  for (const entry of entries) {
    await supabase.from('ledger_entries').upsert(entry, { 
      onConflict: 'order_id,entry_type,owner_type,owner_id'
    });
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const order_id = paymentIntent.metadata.order_id;
  if (!order_id) return;

  // PRODUCTION-HARDENED: Only fail if still pending and transfers not complete
  // Prevents late/replay failure events from corrupting completed orders
  const { data: updated } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'cancelled',
    })
    .eq('id', order_id)
    .in('payment_status', ['pending'])
    .neq('transfers_status', 'complete')
    .select('id');

  if (updated && updated.length > 0) {
    console.log(`[Payment Failed] Order ${order_id} marked as failed`);
  } else {
    console.log(`[Payment Failed] Order ${order_id} already completed or not pending - skipped`);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  console.log(`[Refund] Charge: ${charge.id}, Amount: ${charge.amount_refunded}/${charge.amount}`);

  // PRODUCTION-HARDENED: Handle missing payment_intent
  if (!charge.payment_intent) {
    console.error('[Refund] Missing payment_intent on charge');
    // Write ops alert using deterministic event-based ID
    await supabase.from('stripe_events').upsert({
      event_id: `refund-missing-pi-${eventId}`,
      type: 'charge.refunded.missing_payment_intent',
      created: new Date().toISOString(),
      status: 'failed',
      metadata: {
        charge_id: charge.id,
        amount_refunded: charge.amount_refunded,
        error: 'Missing payment_intent',
      },
    }, { onConflict: 'event_id' });
    return;
  }

  // Find order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent_id', charge.payment_intent as string)
    .single();

  if (!order) {
    console.error('[Refund] Order not found');
    return;
  }

  // Determine refund type
  const isFullRefund = charge.amount_refunded >= charge.amount;
  const newPaymentStatus = isFullRefund ? 'refunded' : 'partial_refund';

  // Update order
  await supabase
    .from('orders')
    .update({
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  // APPEND-ONLY REFUND: Use latest refund object ID
  const refunds = (charge.refunds?.data ?? []) as Array<{ id: string; amount: number }>;
  const latestRefund = refunds.length ? refunds[refunds.length - 1] : null;

  const refundKey = latestRefund?.id ?? eventId;
  const refundAmount = latestRefund?.amount ?? charge.amount_refunded ?? 0;

  // INSERT (not upsert) - append-only per refund object
  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    order_id: order.id,
    entry_type: 'refund',
    owner_type: 'platform',
    owner_id: null,
    amount_cents: -refundAmount,
    currency: charge.currency,
    stripe_object_id: refundKey,
    memo: isFullRefund
      ? `Full refund`
      : `Partial refund (${refundAmount}/${charge.amount})`,
  });

  // If duplicate key (23505), treat as success
  if (ledgerError && ledgerError.code !== '23505') {
    console.error('[Refund] Ledger error:', ledgerError);
  }

  console.log(`[Refund] Order ${order.id} marked as ${newPaymentStatus}`);
}

// Keep existing CraveMore subscription handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const planKey = session.metadata?.plan_key;
  const userId = session.metadata?.user_id;
  const foundingMember = session.metadata?.founding_member === 'true';

  if (!planKey || !userId) {
    console.log('Missing plan_key or user_id in checkout session metadata');
    return;
  }

  console.log('Processing CraveMore checkout completion:', { planKey, userId, foundingMember });

  if (planKey === 'lifetime') {
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .upsert({
        user_id: userId,
        plan_key: planKey,
        status: 'active',
        started_at: new Date().toISOString(),
        renews_at: null,
        provider: 'stripe',
        provider_customer_id: session.customer as string,
        provider_subscription_id: null,
        founding_member: foundingMember,
      }, {
        onConflict: 'user_id'
      });

    if (membershipError) {
      console.error('Failed to create lifetime membership:', membershipError);
    } else {
      await supabase.rpc('increment_lifetime_cap', {});
      console.log('Lifetime membership created successfully');
    }
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription, eventType: string) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  console.log(`Subscription ${eventType} for user: ${userId}`);

  if (eventType === 'customer.subscription.deleted') {
    await supabase
      .from('user_memberships')
      .update({ status: 'cancelled' })
      .eq('provider_subscription_id', subscription.id);
  } else {
    await supabase
      .from('user_memberships')
      .upsert({
        user_id: userId,
        plan_key: subscription.metadata?.plan_key || 'monthly',
        status: subscription.status === 'active' ? 'active' : 'cancelled',
        provider: 'stripe',
        provider_customer_id: subscription.customer as string,
        provider_subscription_id: subscription.id,
        started_at: new Date(subscription.created * 1000).toISOString(),
        renews_at: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      }, {
        onConflict: 'user_id'
      });
  }
}
