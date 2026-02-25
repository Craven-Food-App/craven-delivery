import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const orderId = body?.order_id;
    const amountCents = body?.amount_cents != null ? Number(body.amount_cents) : null;

    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, restaurant_id, stripe_payment_intent_id, total_cents, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", order.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized to refund this order" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: "Order has no payment to refund" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentStatus = (order.payment_status || "").toLowerCase();
    if (paymentStatus === "refunded") {
      return new Response(JSON.stringify({ error: "Order is already fully refunded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalCents = order.total_cents ?? 0;
    if (amountCents != null && (amountCents <= 0 || amountCents > totalCents)) {
      return new Response(JSON.stringify({ error: "Invalid refund amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refundParams: { payment_intent: string; amount?: number; reason?: string } = {
      payment_intent: order.stripe_payment_intent_id,
      reason: "requested_by_customer",
    };
    if (amountCents != null && amountCents < totalCents) {
      refundParams.amount = amountCents;
    }

    const refund = await stripe.refunds.create(refundParams);

    await supabase.from("merchant_activity_log").insert({
      restaurant_id: order.restaurant_id,
      actor_id: user.id,
      action: amountCents != null && amountCents < totalCents ? "partial_refund" : "full_refund",
      entity_type: "order",
      entity_id: order.id,
      metadata: { refund_id: refund.id, amount_cents: amountCents ?? totalCents },
    });

    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("refund-order error:", e);
    const message = e instanceof Error ? e.message : "Refund failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
