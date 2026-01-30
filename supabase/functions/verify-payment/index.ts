import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from '../_shared/cors.ts';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:5173",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
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
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, orderId } = await req.json();

    if (!sessionId || !orderId) {
      throw new Error("Missing session ID or order ID");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Use Stripe for all payment verification
    return await verifyStripePayment(sessionId, orderId, supabase);
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function verifyStripePayment(sessionId: string, orderId: string, supabase: any) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  // Retrieve the checkout session
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    // Update order status and payment info
    const { error: updateError } = await supabase
      .from("customer_orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        stripe_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
        payment_provider: "stripe",
      })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    // Send notification to restaurant
    const { data: order } = await supabase
      .from("customer_orders")
      .select(`
        *,
        restaurants (
          owner_id,
          name
        )
      `)
      .eq("id", orderId)
      .single();

    if (order?.restaurants?.owner_id) {
      await supabase.from("order_notifications").insert({
        order_id: orderId,
        user_id: order.restaurants.owner_id,
        notification_type: "new_order",
        title: "New Order Received! 🍕",
        message: `Order #${orderId.slice(-8)} from ${order.customer_name} - $${(order.total_cents / 100).toFixed(2)}`,
      });
    }

    // Trigger driver assignment for this confirmed order
    try {
      await supabase.functions.invoke('auto-assign-orders', {
        body: { orderId }
      });
      console.log("Driver assignment triggered for order:", orderId);
    } catch (assignError) {
      console.error("Failed to trigger driver assignment:", assignError);
      // Don't fail the payment verification if driver assignment fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_status: session.payment_status,
        order_status: "confirmed",
        provider: "stripe"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: false, 
      payment_status: session.payment_status,
      provider: "stripe"
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}