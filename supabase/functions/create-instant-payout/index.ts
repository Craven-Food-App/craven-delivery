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

    const { amount, payout_method } = await req.json();

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

    // Get available balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const availableCents = balance.available?.[0]?.amount || 0;
    const currency = balance.available?.[0]?.currency || 'usd';

    console.log(`Available balance: ${availableCents} ${currency}`);

    // Validate requested amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (amount > availableCents) {
      throw new Error(
        `Insufficient balance. Available: $${(availableCents / 100).toFixed(2)}, Requested: $${(amount / 100).toFixed(2)}`
      );
    }

    // Check minimum (Stripe requires $1 minimum for instant payouts)
    if (amount < 100) {
      throw new Error('Minimum instant payout is $1.00');
    }

    // Determine payout method
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

    // For instant payouts to debit card
    if (payout_method === 'instant') {
      payoutParams.method = 'instant';
    }

    console.log(`Creating payout: ${JSON.stringify(payoutParams)}`);

    // Create payout
    const payout = await stripe.payouts.create(
      payoutParams,
      {
        stripeAccount: stripeAccountId,
      }
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
























