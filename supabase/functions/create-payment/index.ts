import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { 
  createPaymentIntent, 
  confirmPaymentIntent,
  getOrCreateCustomer,
  getStripeClient 
} from '../_shared/stripe.ts';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin is in allowed list
  let allowedOrigin: string;
  if (origin && allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else {
    // Default to first in list (localhost:8080 for dev)
    allowedOrigin = allowedOrigins[0];
  }
  
  console.log("CORS check:", { origin, allowedOrigin, allowedOrigins, originInList: origin ? allowedOrigins.includes(origin) : false });
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

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
    const { orderTotal, customerInfo, orderId, paymentMethodId, paymentMethodType, provider } = await req.json();

    if (!orderTotal || !customerInfo || !orderId) {
      throw new Error("Missing required parameters: orderTotal, customerInfo, orderId");
    }

    if (!paymentMethodId) {
      throw new Error("Missing payment method: paymentMethodId required");
    }

    // Default to Stripe, but support Moov during migration
    const paymentProvider = provider || 'stripe';

    if (paymentProvider === 'stripe') {
      // Create payment using Stripe
      return await createStripePaymentHandler(
        orderTotal,
        customerInfo,
        orderId,
        paymentMethodId,
        corsHeaders
      );
    } else {
      // Legacy Moov support (deprecated)
      throw new Error("Moov payment processing is deprecated. Please use Stripe.");
    }
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
    // Get order details to determine merchant payout
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('restaurant_id, restaurant:restaurants(stripe_connect_account_id)')
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

    // Calculate platform fee (if applicable)
    // For now, we'll use a simple percentage - adjust based on your business model
    const platformFeePercent = 0.03; // 3% platform fee
    const platformFeeAmount = Math.round(orderTotal * platformFeePercent);
    const merchantAmount = orderTotal - platformFeeAmount;

    // Get merchant Stripe Connect account ID if available
    const merchantAccountId = (order.restaurant as any)?.stripe_connect_account_id;

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount: orderTotal,
      currency: 'USD',
      customerId: customerId,
      paymentMethodId: paymentMethodId,
      description: `Order #${orderId}`,
      metadata: {
        order_id: orderId,
        customer_email: customerInfo.email || '',
        customer_name: customerInfo.name || '',
        restaurant_id: order.restaurant_id || '',
      },
      // If merchant has Stripe Connect account, split payment
      ...(merchantAccountId ? {
        onBehalfOf: merchantAccountId,
        applicationFeeAmount: platformFeeAmount,
        transferData: {
          destination: merchantAccountId,
          amount: merchantAmount,
        },
      } : {}),
    });

    console.log('Stripe payment intent created:', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      orderId,
      merchantAccountId,
    });

    // Confirm the payment intent
    const confirmedPayment = await confirmPaymentIntent(
      paymentIntent.id,
      paymentMethodId
    );

    console.log('Stripe payment confirmed:', {
      paymentIntentId: confirmedPayment.id,
      status: confirmedPayment.status,
      charges: confirmedPayment.charges,
    });

    // Update order with payment information
    await supabase
      .from('orders')
      .update({
        updated_at: new Date().toISOString(),
        // Add payment tracking fields if they exist
        payment_intent_id: confirmedPayment.id,
        payment_status: confirmedPayment.status,
      })
      .eq('id', orderId)
      .catch(err => {
        console.error('Order update error (non-critical):', err);
      });

    // Return payment result
    return new Response(
      JSON.stringify({ 
        payment_id: confirmedPayment.id,
        status: confirmedPayment.status,
        provider: 'stripe',
        order_id: orderId,
        requires_action: confirmedPayment.status === 'requires_action' || confirmedPayment.status === 'requires_confirmation',
        client_secret: paymentIntent.clientSecret, // For 3D Secure if needed
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
