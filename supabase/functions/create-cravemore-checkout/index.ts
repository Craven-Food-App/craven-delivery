import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

// CORS helper (inlined for standalone deployment)
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

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
    // Validate required environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }
    
    if (!stripeSecretKey) {
      throw new Error("Missing Stripe configuration. Check STRIPE_SECRET_KEY environment variable.");
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

    const { planKey } = body;

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

    // Load processing fee configuration (Moov-style) from commission_settings
    let processingFeeCents = 0;
    try {
      const { data: feeSettings } = await supabase
        .from("commission_settings")
        .select("moov_card_processing_percent")
        .eq("is_active", true)
        .single();

      const percent = feeSettings?.moov_card_processing_percent as number | null;
      if (typeof percent === "number" && percent > 0) {
        processingFeeCents = Math.round(priceCents * (percent / 100));
      }
    } catch (feeError) {
      console.error("Error loading processing fee configuration:", feeError);
      // Fail open: continue without adding a processing fee line item
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    let profile: any = null;
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("stripe_customer_id, email")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        // Check if it's a column doesn't exist error
        if (profileError.message?.includes("does not exist") || 
            profileError.message?.includes("column") && profileError.message?.includes("stripe_customer_id")) {
          console.error("stripe_customer_id column missing. Migration required:", profileError);
          throw new Error(
            "Database migration required: stripe_customer_id column is missing from user_profiles table. " +
            "Please run migration: 20250201000002_add_stripe_customer_id_to_user_profiles.sql"
          );
        }
        
        // PGRST116 = no rows returned (profile doesn't exist yet)
        if (profileError.code !== "PGRST116") {
          console.error("Error fetching user profile:", profileError);
          throw new Error(`Failed to fetch user profile: ${profileError.message}`);
        }
      } else {
        profile = profileData;
        customerId = profile?.stripe_customer_id;
      }
    } catch (error) {
      // Re-throw if it's our custom migration error
      if (error instanceof Error && error.message.includes("Database migration required")) {
        throw error;
      }
      // Otherwise, log and continue (will create new customer)
      console.error("Error fetching profile, will create new customer:", error);
    }

    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email || profile?.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;

        // Update user profile with Stripe customer ID
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
          
        if (updateError) {
          console.error("Error updating user profile with Stripe customer ID:", updateError);
          // Continue anyway - customer was created successfully
        }
      } catch (stripeError) {
        console.error("Error creating Stripe customer:", stripeError);
        throw new Error(`Failed to create Stripe customer: ${stripeError instanceof Error ? stripeError.message : String(stripeError)}`);
      }
    }

    // Create Stripe checkout session
    // Get frontend URL from environment or use default
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       Deno.env.get("SUPABASE_URL")?.replace("/functions/v1", "").replace("https://", "https://") ||
                       "http://localhost:8080";
    const successUrl = `${frontendUrl}/cravemore/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/cravemore?canceled=true`;

    if (planKey === "lifetime") {
      // One-time payment for lifetime
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `CraveMore ${plan.display_name}`,
                description: "Lifetime membership - Founding Member",
              },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
          ...(processingFeeCents > 0
            ? [{
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Processing Fee (Moov)",
                    description: "Processing fee for membership payment",
                  },
                  unit_amount: processingFeeCents,
                },
                quantity: 1,
              }]
            : []),
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plan_key: planKey,
          user_id: user.id,
          founding_member: "true",
        },
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Recurring subscription for monthly/annual
      const interval = planKey === "annual" ? "year" : "month";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `CraveMore ${plan.display_name}`,
                description: `CraveMore membership - ${plan.display_name}`,
              },
              unit_amount: priceCents,
              recurring: {
                interval,
              },
            },
            quantity: 1,
          },
          ...(processingFeeCents > 0
            ? [{
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Processing Fee (Moov)",
                    description: "Processing fee for membership payment",
                  },
                  unit_amount: processingFeeCents,
                },
                quantity: 1,
              }]
            : []),
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plan_key: planKey,
          user_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
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
    
    // Handle specific Stripe errors
    let userFriendlyError = errorMessage;
    let statusCode = 500;
    
    if (errorMessage.includes("cannot currently make live charges")) {
      userFriendlyError = "Stripe account is not activated for live mode. Please use test mode keys for development or activate your Stripe account for live mode.";
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes("Invalid API Key")) {
      userFriendlyError = "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.";
      statusCode = 500;
    } else if (errorMessage.includes("No such customer")) {
      userFriendlyError = "Customer not found. Please try again.";
      statusCode = 404;
    }
    
    return new Response(
      JSON.stringify({ 
        error: userFriendlyError,
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

