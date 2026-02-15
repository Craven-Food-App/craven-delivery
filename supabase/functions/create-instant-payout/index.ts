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

    const { amount, payout_method, idempotency_key } = await req.json();

    // Idempotency check
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('feeder_wallet_ledger_entries')
        .select('id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Duplicate request', duplicate: true }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Server-side eligibility check
    const { data: eligibilityEntries } = await supabase
      .from('feeder_wallet_ledger_entries')
      .select('source_id')
      .eq('feeder_id', user.id)
      .eq('source_type', 'order')
      .eq('type', 'earnings_base_pay');

    const completedDeliveries = new Set(
      (eligibilityEntries || []).map(r => r.source_id).filter(Boolean)
    ).size;

    if (completedDeliveries < 50) {
      throw new Error('Instant cashout requires 50+ completed deliveries');
    }

    const { data: profile } = await supabase
      .from('driver_profiles')
      .select('rolling_rating, on_time_rate, completion_rate')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      if (completedDeliveries >= 20 && profile.rolling_rating != null && profile.rolling_rating < 4.5) {
        throw new Error('Instant cashout requires 4.5+ rating');
      }
      if (completedDeliveries >= 10) {
        if (profile.on_time_rate != null && profile.on_time_rate < 95) {
          throw new Error('Instant cashout requires 95%+ on-time rate');
        }
        if (profile.completion_rate != null && profile.completion_rate < 100) {
          throw new Error('Instant cashout requires 100% accuracy');
        }
      }
    }

    // Validate amount against ledger available balance
    const { data: availableEntries } = await supabase
      .from('feeder_wallet_ledger_entries')
      .select('type, amount_cents, status')
      .eq('feeder_id', user.id)
      .in('status', ['available']);

    const earningsTypes = [
      'earnings_base_pay', 'earnings_distance_pay', 'earnings_tip',
      'earnings_bonus', 'earnings_adjustment_credit',
    ];

    const ledgerAvailable = (availableEntries || [])
      .filter(r => earningsTypes.includes(r.type))
      .reduce((s, r) => s + r.amount_cents, 0)
      - (availableEntries || [])
        .filter(r => r.type === 'earnings_adjustment_debit')
        .reduce((s, r) => s + r.amount_cents, 0);

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (amount > ledgerAvailable) {
      throw new Error(
        `Insufficient ledger balance. Available: $${(ledgerAvailable / 100).toFixed(2)}, Requested: $${(amount / 100).toFixed(2)}`
      );
    }

    if (amount < 100) {
      throw new Error('Minimum instant payout is $1.00');
    }

    // Get driver's Stripe account
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, owner_type, owner_id')
      .eq('owner_type', 'driver')
      .eq('owner_id', user.id)
      .single();

    if (!stripeAccount?.stripe_account_id) {
      throw new Error('No Stripe account found. Please complete onboarding first.');
    }

    const stripeAccountId = stripeAccount.stripe_account_id;

    // Get available balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const availableCents = balance.available?.[0]?.amount || 0;
    const currency = balance.available?.[0]?.currency || 'usd';

    if (amount > availableCents) {
      throw new Error(
        `Insufficient Stripe balance. Available: $${(availableCents / 100).toFixed(2)}`
      );
    }

    // Create payout_debit ledger entry (processing)
    const { data: wallet } = await supabase
      .from('feeder_wallets')
      .select('id')
      .eq('feeder_id', user.id)
      .single();

    if (wallet) {
      await supabase
        .from('feeder_wallet_ledger_entries')
        .insert({
          wallet_id: wallet.id,
          feeder_id: user.id,
          occurred_at: new Date().toISOString(),
          type: 'payout_debit',
          direction: 'debit',
          amount_cents: amount,
          status: 'processing',
          source_type: 'payout',
          source_id: `instant_${Date.now()}`,
          idempotency_key: idempotency_key || `instant_${user.id}_${amount}_${Math.floor(Date.now() / 60000)}`,
        });
    }

    // Create Stripe payout
    let payoutParams: Stripe.PayoutCreateParams = {
      amount: amount,
      currency: currency,
      description: `Instant payout for driver ${user.id}`,
      metadata: {
        driver_id: user.id,
        user_email: user.email || '',
        payout_type: 'instant',
      },
    };

    if (payout_method === 'instant') {
      payoutParams.method = 'instant';
    }

    const payout = await stripe.payouts.create(
      payoutParams,
      { stripeAccount: stripeAccountId }
    );

    console.log(`Payout created: ${payout.id}, status: ${payout.status}`);

    // Log payout in database
    const { error: logError } = await supabase
      .from('driver_payouts')
      .insert({
        driver_id: user.id,
        stripe_account_id: stripeAccountId,
        stripe_payout_id: payout.id,
        amount_cents: amount,
        currency: currency,
        payout_type: payout_method,
        status: payout.status,
        arrival_date: payout.arrival_date 
          ? new Date(payout.arrival_date * 1000).toISOString()
          : null,
      });

    if (logError) {
      console.error('Failed to log payout:', logError);
      // Don't fail the request - payout already created
    }

    // Calculate estimated fee (Stripe charges 1% for instant, capped at $10)
    const estimatedFeeCents = payout_method === 'instant' 
      ? Math.min(Math.round(amount * 0.01), 1000)
      : 0;

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        amount: amount,
        currency: currency,
        status: payout.status,
        estimated_arrival: payout.arrival_date
          ? new Date(payout.arrival_date * 1000).toISOString()
          : null,
        method: payout.method,
        fee_cents: estimatedFeeCents,
        net_amount: amount - estimatedFeeCents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating instant payout:', error);
    
    // Handle Stripe-specific errors
    let errorMessage = error.message || 'Failed to create payout';
    let statusCode = 400;

    if (error.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('instant payouts are not enabled')) {
        errorMessage = 'Instant payouts not enabled. Please enable them in your Stripe settings.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance for this payout.';
      }
    } else if (error.type === 'StripePermissionError') {
      errorMessage = 'Account not authorized for payouts. Please complete onboarding.';
      statusCode = 403;
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.raw?.message || error.message,
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});




























