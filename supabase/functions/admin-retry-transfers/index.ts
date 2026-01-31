import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// CRITICAL: Use service role for RPC calls and DB operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PRODUCTION-SAFE: Admin role check using anon client for user verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    // Use anon client to verify user token
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Verify admin role using service role client (safe for reads)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'ceo', 'super_admin'])
      .single();

    if (!userRole && user.email !== 'tstroman.ceo@cravenusa.com') {
      throw new Error('Forbidden: Admin access required');
    }

    const { order_id } = await req.json();

    // LEASE-PROTECTED: Lock order first
    const { data: lockResult, error: lockError } = await supabase
      .rpc('lock_order_for_transfers', {
        p_order_id: order_id,
        p_stripe_payment_intent_id: '',
      })
      .single();

    if (lockError) {
      throw new Error(`Lock failed: ${lockError.message}`);
    }

    const order = Array.isArray(lockResult) ? lockResult[0] : lockResult;

    // Check status_code
    if (order.status_code === 'complete' || order.status_code === 'locked') {
      return new Response(
        JSON.stringify({ success: true, message: `Status: ${order.status_code}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lease_id = order.transfers_lease_id;
    const restaurant_id = order.restaurant_id;
    const driver_id = order.driver_id;

    // Get connected accounts
    const { data: restaurantAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('owner_type', 'restaurant')
      .eq('owner_id', restaurant_id)
      .single();

    if (!restaurantAccount) {
      throw new Error('Restaurant has no Stripe account');
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

    // IDEMPOTENT: Only create missing transfers (use fresh state)
    let restaurantTransferId = order.stripe_transfer_restaurant_id;
    let driverTransferId = order.stripe_transfer_driver_id;

    if (!restaurantTransferId && order.restaurant_net_cents > 0) {
      const transfer = await stripe.transfers.create(
        {
          amount: order.restaurant_net_cents,
          currency: order.currency,
          destination: restaurantAccount.stripe_account_id,
          description: `Order ${order_id} - Restaurant payout (retry)`,
          metadata: { order_id, restaurant_id, type: 'restaurant_net' },
        },
        { idempotencyKey: `order:${order_id}:transfer:restaurant` }
      );
      restaurantTransferId = transfer.id;
      
      await supabase
        .from('orders')
        .update({ stripe_transfer_restaurant_id: restaurantTransferId })
        .eq('id', order_id);
    }

    const driverAmount = (order.driver_pay_cents || 0) + (order.tip_cents || 0);
    if (!driverTransferId && driverAmount > 0 && driverAccount) {
      const transfer = await stripe.transfers.create(
        {
          amount: driverAmount,
          currency: order.currency,
          destination: driverAccount.stripe_account_id,
          description: `Order ${order_id} - Driver payout (retry)`,
          metadata: { order_id, driver_id, type: 'driver_pay_tip' },
        },
        { idempotencyKey: `order:${order_id}:transfer:driver` }
      );
      driverTransferId = transfer.id;
      
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

    // PRODUCTION-HARDENED: Repair ledger after finalize
    await repairLedgerEntries(order, restaurantTransferId, driverTransferId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function repairLedgerEntries(
  order: any,
  restaurantTransferId: string | null,
  driverTransferId: string | null
) {
  // Get PI ID from order
  const { data: fullOrder } = await supabase
    .from('orders')
    .select('stripe_payment_intent_id')
    .eq('id', order.order_id)
    .single();

  const paymentIntentId = fullOrder?.stripe_payment_intent_id;

  if (!paymentIntentId) {
    console.warn('[Ledger Repair] No payment_intent_id found');
    return;
  }

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

  // UPSERT for non-refund entries (idempotent)
  for (const entry of entries) {
    await supabase.from('ledger_entries').upsert(entry, { 
      onConflict: 'order_id,entry_type,owner_type,owner_id'
    });
  }

  console.log('[Ledger Repair] Complete');
}

