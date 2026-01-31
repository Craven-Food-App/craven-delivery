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

    const {
      order_id,
      amount_total_cents,
      restaurant_id,
      driver_id,
      currency = 'usd',
    } = await req.json();

    console.log(`Creating PaymentIntent for order ${order_id}, amount: $${amount_total_cents / 100}`);

    // PLATFORM ACCOUNT ONLY - NO destination charges, NO on_behalf_of
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_total_cents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id,
        restaurant_id,
        driver_id,
        user_id: user.id,
      },
    });

    // Store payment intent ID in order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    console.log('PaymentIntent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

