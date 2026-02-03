import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get driver's Stripe account
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, payouts_enabled, details_submitted')
      .eq('owner_type', 'driver')
      .eq('owner_id', user.id)
      .single();

    if (!stripeAccount?.stripe_account_id) {
      return new Response(
        JSON.stringify({
          available_cents: 0,
          pending_cents: 0,
          currency: 'usd',
          payouts_enabled: false,
          onboarding_complete: false,
          message: 'Please complete Stripe onboarding to receive payouts',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeAccountId = stripeAccount.stripe_account_id;

    // Retrieve balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const availableCents = balance.available?.[0]?.amount || 0;
    const pendingCents = balance.pending?.[0]?.amount || 0;
    const currency = balance.available?.[0]?.currency || 'usd';

    // Check if instant payouts are enabled for this account
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const instantPayoutsEnabled = account.capabilities?.transfers === 'active';

    // Get recent payout history
    const payouts = await stripe.payouts.list(
      { limit: 5 },
      { stripeAccount: stripeAccountId }
    );

    const recentPayouts = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrival_date: payout.arrival_date 
        ? new Date(payout.arrival_date * 1000).toISOString()
        : null,
      method: payout.method,
      description: payout.description,
    }));

    return new Response(
      JSON.stringify({
        available_cents: availableCents,
        available_dollars: (availableCents / 100).toFixed(2),
        pending_cents: pendingCents,
        pending_dollars: (pendingCents / 100).toFixed(2),
        currency: currency,
        payouts_enabled: stripeAccount.payouts_enabled,
        instant_payouts_enabled: instantPayoutsEnabled,
        onboarding_complete: stripeAccount.details_submitted,
        recent_payouts: recentPayouts,
        can_cash_out: availableCents >= 100 && stripeAccount.payouts_enabled,
        minimum_payout: 100, // $1.00 in cents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error getting driver balance:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to get balance',
        available_cents: 0,
        pending_cents: 0,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});














