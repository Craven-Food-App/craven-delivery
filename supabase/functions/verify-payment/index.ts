import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, orderId, paymentId, provider = 'moov' } = await req.json();

    if ((!sessionId && !paymentId) || !orderId) {
      throw new Error("Missing session/payment ID or order ID");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check which payment provider to use
    if (provider === 'moov' && paymentId) {
      return await verifyMoovPayment(paymentId, orderId, supabase);
    } else if (sessionId) {
      return await verifyStripePayment(sessionId, orderId, supabase);
    } else {
      throw new Error("Invalid payment provider or missing payment ID");
    }
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

async function verifyMoovPayment(paymentId: string, orderId: string, supabase: any) {
  const moovApiKey = Deno.env.get("MOOV_API_KEY");
  
  if (!moovApiKey) {
    throw new Error("Moov API credentials not configured");
  }

  console.log("Verifying Moov payment:", paymentId);

  // Retrieve the Moov transfer
  const transferResponse = await fetch(`https://api.moov.io/transfers/${paymentId}`, {
    headers: {
      "Authorization": `Bearer ${moovApiKey}`,
    },
  });

  if (!transferResponse.ok) {
    const errorText = await transferResponse.text();
    console.error("Moov transfer retrieval failed:", errorText);
    throw new Error(`Moov payment verification failed: ${errorText}`);
  }

  const transfer = await transferResponse.json();
  console.log("Moov transfer status:", transfer.status);

  // Moov transfer status can be: pending, completed, failed
  if (transfer.status === "completed") {
    // Update order status and payment info
    const { error: updateError } = await supabase
      .from("customer_orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        moov_payment_id: paymentId,
        moov_transfer_id: transfer.id,
        payment_provider: "moov",
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_status: "paid",
        order_status: "confirmed",
        provider: "moov"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  // Handle failed or pending transfers
  if (transfer.status === "failed") {
    const { error: updateError } = await supabase
      .from("customer_orders")
      .update({
        payment_status: "failed",
        moov_payment_id: paymentId,
        moov_transfer_id: transfer.id,
        payment_provider: "moov",
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ 
        success: false, 
        payment_status: "failed",
        provider: "moov"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  // Still pending
  return new Response(
    JSON.stringify({ 
      success: false, 
      payment_status: "pending",
      provider: "moov"
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

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