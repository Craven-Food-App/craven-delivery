import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment processing is not configured. STRIPE_SECRET_KEY is required for CraveMore checkout." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { planKey, preferredPaymentMethod, startTrial } = body;

    if (!planKey || !["monthly", "annual", "lifetime"].includes(planKey)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan key" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("cravemore_plans")
      .select("*")
      .eq("plan_key", planKey)
      .eq("is_active", true)
      .single();

    if (planError) {
      console.error("Error fetching plan:", planError);
      return new Response(
        JSON.stringify({ 
          error: "Plan not found",
          details: planError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }
    
    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found or inactive" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check lifetime cap
    if (planKey === "lifetime") {
      if ((plan.lifetime_cap_used || 0) >= (plan.lifetime_cap_total || 0)) {
        return new Response(
          JSON.stringify({ error: "Lifetime plan sold out" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Check for active promo
    const now = new Date().toISOString();
    const { data: promos } = await supabase
      .from("cravemore_promos")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now);

    const activePromo = promos && promos.length > 0 ? promos[0] : null;
    const priceCents = activePromo && plan.promo_price_cents
      ? plan.promo_price_cents
      : plan.price_cents;

    // Load Stripe processing fee configuration from commission_settings
    let processingFeeCents = 0;
    try {
      const { data: feeSettings } = await supabase
        .from("commission_settings")
        .select("stripe_fee_percent")
        .eq("is_active", true)
        .single();

      const percent = feeSettings?.stripe_fee_percent as number | null;
      if (typeof percent === "number" && percent > 0) {
        processingFeeCents = Math.round(priceCents * (percent / 100));
      }
    } catch (feeError) {
      console.error("Error loading processing fee configuration:", feeError);
      // Fail open: continue without adding a processing fee line item
    }

    // Get user profile for email
    let profile: any = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching user profile:", profileError);
        // Continue anyway - we can use user.email
      } else {
        profile = profileData;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Continue anyway
    }

    const frontendUrl =
      origin ||
      Deno.env.get("FRONTEND_URL") ||
      "https://cravenusa.com";
    const successUrl = `${frontendUrl}/cravemore/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/crave-more-subscription`;

    const metadata = {
      user_id: user.id,
      plan_key: planKey,
      founding_member: planKey === "lifetime" ? "true" : "false",
    };
    const customerEmail = (user.email || "").trim() || undefined;

    let stripeSession: Stripe.Checkout.Session;

    if (planKey === "lifetime") {
      // One-time payment
      stripeSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: priceCents + processingFeeCents,
              product_data: {
                name: "CraveMore Lifetime",
                description: "Lifetime CraveMore access",
              },
            },
          },
        ],
      });
    } else {
      // Subscription (monthly or annual) with optional 30-day trial
      const interval = planKey === "annual" ? "year" : "month";
      const productName =
        planKey === "annual" ? "CraveMore Annual" : "CraveMore Monthly";
      stripeSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: {
          ...(startTrial ? { trial_period_days: 30 } : {}),
          metadata: { user_id: user.id, plan_key: planKey },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: priceCents,
              recurring: { interval },
              product_data: {
                name: productName,
                description: `CraveMore subscription (${planKey})`,
              },
            },
          },
        ],
      });
    }

    if (!stripeSession.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    // Record in DB for analytics; webhook will create user_memberships
    const totalAmountCents = priceCents + processingFeeCents;
    await supabase.from("cravemore_payment_sessions").insert({
      user_id: user.id,
      plan_key: planKey,
      plan_id: plan.id,
      amount_cents: totalAmountCents,
      base_price_cents: priceCents,
      processing_fee_cents: processingFeeCents,
      status: "pending",
      payment_provider: "stripe",
      payment_provider_transaction_id: stripeSession.id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      preferred_payment_method: preferredPaymentMethod || null,
      is_trial: startTrial || false,
    });

    return new Response(
      JSON.stringify({
        sessionId: stripeSession.id,
        url: stripeSession.url,
        amount: totalAmountCents,
        planKey,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    
    // Handle specific errors
    let userFriendlyError = errorMessage;
    let statusCode = 500;
    
    if (errorMessage.includes("Database migration required")) {
      userFriendlyError = "Database migration required. Please contact support or apply the migration: 20251224102610_create_cravemore_payment_sessions.sql";
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes("Payment session")) {
      userFriendlyError = "Failed to create payment session. Please try again.";
      statusCode = 500;
    }
    
    // Always include error message in response for debugging
    return new Response(
      JSON.stringify({ 
        error: userFriendlyError,
        message: errorMessage, // Include original error message
        details: Deno.env.get("ENVIRONMENT") === "development" ? errorStack : undefined,
        originalError: Deno.env.get("ENVIRONMENT") === "development" ? errorMessage : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});

