import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const { orderTotal, customerInfo, orderId, paymentProvider = 'moov' } = await req.json();

    if (!orderTotal || !customerInfo || !orderId) {
      throw new Error("Missing required parameters");
    }

    // Check which payment provider to use
    if (paymentProvider === 'moov') {
      return await createMoovPayment(orderTotal, customerInfo, orderId, req);
    } else {
      return await createStripePayment(orderTotal, customerInfo, orderId, req);
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

async function createMoovPayment(orderTotal: number, customerInfo: any, orderId: string, req: Request) {
  const moovApiKey = Deno.env.get("MOOV_API_KEY");
  const moovPublicKey = Deno.env.get("MOOV_PUBLIC_KEY");
  const moovAppId = Deno.env.get("MOOV_APPLICATION_ID");
  
  if (!moovApiKey || !moovPublicKey) {
    throw new Error("Moov API credentials not configured");
  }

  console.log("Creating Moov payment for order:", orderId);

  // Convert cents to dollars for Moov
  const amountDollars = (orderTotal / 100).toFixed(2);

  // Create a Moov transfer (payment)
  // Moov uses transfers for payments - funds from customer to merchant
  const transferResponse = await fetch("https://api.moov.io/transfers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${moovApiKey}`,
    },
    body: JSON.stringify({
      amount: {
        currency: "USD",
        value: amountDollars,
      },
      description: "Food Order",
      source: {
        // Customer paying with card - Moov will handle the checkout
        // For web integration, we use Moov Drops for secure card entry
        type: "card",
      },
      destination: {
        // Merchant account receiving payment
        type: "account",
        accountID: moovAppId, // Your Moov merchant account
      },
      metadata: {
        orderId,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
      },
    }),
  });

  if (!transferResponse.ok) {
    const errorText = await transferResponse.text();
    console.error("Moov transfer creation failed:", errorText);
    throw new Error(`Moov payment failed: ${errorText}`);
  }

  const transfer = await transferResponse.json();

  // Return payment URL for Moov Drops checkout
  // In production, integrate Moov.js or use Moov Drops for secure card entry
  const checkoutUrl = `${req.headers.get("origin")}/payment-checkout?payment_id=${transfer.id}&order_id=${orderId}`;

  return new Response(
    JSON.stringify({ 
      url: checkoutUrl,
      payment_id: transfer.id,
      provider: 'moov'
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

async function createStripePayment(orderTotal: number, customerInfo: any, orderId: string, req: Request) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: customerInfo.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Food Order",
            description: `Order from restaurant`,
          },
          unit_amount: orderTotal,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
    cancel_url: `${req.headers.get("origin")}/payment-canceled`,
    metadata: {
      order_id: orderId,
    },
  });

  return new Response(
    JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      provider: 'stripe'
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}