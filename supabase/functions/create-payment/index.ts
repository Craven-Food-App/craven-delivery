import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';

import { getCorsHeaders } from '../_shared/cors.ts';
import { 
  createPaymentIntent, 
  getOrCreateCustomer
} from '../_shared/stripe.ts';

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // SECURITY: Rate limiting for payment endpoint
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.PAYMENT);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: rateLimitResult.message || 'Too many payment requests',
        resetIn: rateLimitResult.resetIn 
      }),
      { 
        status: 429, 
        headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
      }
    );
  }

  try {
    const { orderTotal, customerInfo, orderId, paymentMethodId } = await req.json();

    if (!orderTotal || !customerInfo || !orderId) {
      throw new Error("Missing required parameters: orderTotal, customerInfo, orderId");
    }

    if (!paymentMethodId) {
      throw new Error("Missing payment method: paymentMethodId required");
    }

    // Create payment using Stripe
    return await createStripePaymentHandler(
      orderTotal,
      customerInfo,
      orderId,
      paymentMethodId,
      corsHeaders
    );
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function createStripePaymentHandler(
  orderTotal: number,
  customerInfo: any,
  orderId: string,
  paymentMethodId: string,
  corsHeaders: Record<string, string>
) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Get order details (restaurant_id for metadata)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('restaurant_id')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer({
      email: customerInfo.email,
      name: customerInfo.name,
      phone: customerInfo.phone,
      metadata: {
        order_id: orderId,
      },
    });

    // MARKETPLACE MODEL: Platform is merchant of record
    // NO destination charges, NO on_behalf_of, NO application_fee_amount
    // Transfers happen via webhook after payment succeeds

    // Create payment intent on PLATFORM account only
    const paymentIntent = await createPaymentIntent({
      amount: orderTotal,
      currency: 'usd',
      customerId: customerId,
      description: `Order #${orderId}`,
      metadata: {
        order_id: orderId,
        customer_email: customerInfo.email || '',
        customer_name: customerInfo.name || '',
        restaurant_id: order.restaurant_id || '',
      },
      // NO onBehalfOf, NO transferData, NO applicationFeeAmount
    });

    console.log('Stripe PaymentIntent created (client-side confirmation):', {
      paymentIntentId: paymentIntent.id,
      orderId,
    });

    // CRITICAL: Do NOT confirm server-side
    // Client will confirm using Stripe.js
    // Webhook will set payment_status='succeeded'

    // Update order with payment intent ID and PENDING status
    await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending', // ONLY webhook sets 'succeeded'
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .catch(err => {
        console.error('Order update error (non-critical):', err);
      });

    // Return client_secret for client-side confirmation
    return new Response(
      JSON.stringify({ 
        payment_id: paymentIntent.id,
        client_secret: paymentIntent.clientSecret, // Client confirms with this
        status: 'pending', // Always pending until webhook confirms
        provider: 'stripe',
        order_id: orderId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Stripe payment error:", error);
    
    // Update order with error status
    await supabase
      .from('orders')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .catch(err => console.error('Order update error:', err));

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Payment creation failed',
        provider: 'stripe'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
}
