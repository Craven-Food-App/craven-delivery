import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0";
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = {
  ...getCorsHeaders(req.headers.get('origin')),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { inviteId, amountCents, email } = await req.json();

    if (!inviteId || !amountCents || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify invite exists and is valid
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("id", inviteId)
      .eq("email", email.trim().toLowerCase())
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid invite" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount is within bounds
    if (amountCents < invite.min_amount_cents || amountCents > invite.max_amount_cents) {
      return new Response(
        JSON.stringify({ 
          error: `Amount must be between $${(invite.min_amount_cents / 100).toFixed(2)} and $${(invite.max_amount_cents / 100).toFixed(2)}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check invite is still valid
    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This invite has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.status === "paid") {
      return new Response(
        JSON.stringify({ error: "This invite has already been used" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-12-18.acacia",
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Private Investment Contribution",
              description: `Contribution by ${invite.full_name || email}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${Deno.env.get("FRONTEND_URL") || "https://craven-delivery.com"}/success?session_id={CHECKOUT_SESSION_ID}&invite_id=${inviteId}`,
      cancel_url: `${Deno.env.get("FRONTEND_URL") || "https://craven-delivery.com"}/allocate?invite_id=${inviteId}`,
      customer_email: email,
      metadata: {
        invite_id: inviteId,
        amount_cents: amountCents.toString(),
      },
    });

    // Update invite with checkout session info
    await supabase
      .from("invites")
      .update({
        stripe_session_id: session.id,
        selected_amount_cents: amountCents,
      })
      .eq("id", inviteId);

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: "Unable to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

