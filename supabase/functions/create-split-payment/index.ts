// Supabase Edge Function: create-split-payment
// Processes split payments across 2 payment methods

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderTotal, orderId, customerInfo, payments, provider } = await req.json();

    // Validate inputs
    if (!orderTotal || !orderId || !payments || payments.length < 1 || payments.length > 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment configuration. Must have 1-2 payment methods.' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process each payment
    const paymentIntents: any[] = [];
    let totalCharged = 0;

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      const { paymentMethodId, amount } = payment;

      console.log(`Processing payment ${i + 1}/${payments.length}: $${(amount / 100).toFixed(2)}`);

      try {
        // Create payment intent for this portion
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            order_id: orderId,
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            split_payment: 'true',
            payment_number: `${i + 1}`,
            total_payments: `${payments.length}`
          }
        });

        paymentIntents.push(paymentIntent);
        totalCharged += amount;

        // Record individual payment in database
        await supabase.from('payments').insert({
          order_id: orderId,
          amount_cents: amount,
          stripe_payment_intent_id: paymentIntent.id,
          payment_method_id: paymentMethodId,
          status: paymentIntent.status,
          provider: 'stripe',
          is_split_payment: true,
          split_payment_index: i + 1
        });

      } catch (error: any) {
        console.error(`Payment ${i + 1} failed:`, error);

        // If this is not the first payment, we need to refund previous successful charges
        if (i > 0) {
          console.log('Refunding previous successful payments...');
          for (const prevIntent of paymentIntents) {
            try {
              await stripe.refunds.create({
                payment_intent: prevIntent.id,
                reason: 'requested_by_customer'
              });
            } catch (refundError) {
              console.error('Refund failed:', refundError);
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            error: `Payment ${i + 1} failed: ${error.message}`,
            status: 'failed'
          }),
          { 
            status: 400, 
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // All payments succeeded
    const allSucceeded = paymentIntents.every(pi => pi.status === 'succeeded');
    const anyPending = paymentIntents.some(pi => pi.status === 'processing' || pi.status === 'requires_capture');

    return new Response(
      JSON.stringify({ 
        status: allSucceeded ? 'succeeded' : (anyPending ? 'pending' : 'processing'),
        payment_intents: paymentIntents.map(pi => ({
          id: pi.id,
          amount: pi.amount,
          status: pi.status
        })),
        total_charged: totalCharged,
        payment_id: paymentIntents[0].id // Use first payment intent as primary reference
      }),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Split payment error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process split payment',
        status: 'error'
      }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  }
});

