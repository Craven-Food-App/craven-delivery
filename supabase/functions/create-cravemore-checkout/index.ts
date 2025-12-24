import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }
    
    // Note: MOOV_SECRET_KEY is optional for now - we're just creating a payment session
    // The actual payment processing will happen later
    
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

    // Create payment session in database
    // Get frontend URL from environment or use default
    const frontendUrl = Deno.env.get("FRONTEND_URL") || 
                       Deno.env.get("SUPABASE_URL")?.replace("/functions/v1", "").replace("https://", "https://") ||
                       "http://localhost:8080";
    
    const totalAmountCents = priceCents + processingFeeCents;
    
    // Create a payment session record
    const { data: paymentSession, error: sessionError } = await supabase
      .from("cravemore_payment_sessions")
      .insert({
        user_id: user.id,
        plan_key: planKey,
        plan_id: plan.id,
        amount_cents: totalAmountCents,
        base_price_cents: priceCents,
        processing_fee_cents: processingFeeCents,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating payment session:", sessionError);
      
      // Check if it's a table doesn't exist error
      if (sessionError.message?.includes("does not exist") || 
          sessionError.message?.includes("relation") ||
          sessionError.code === "42P01") {
        throw new Error(
          `Database migration required: cravemore_payment_sessions table is missing. ` +
          `Please run migration: 20251224102610_create_cravemore_payment_sessions.sql`
        );
      }
      
      throw new Error(`Failed to create payment session: ${sessionError.message}`);
    }

    // Return payment session with redirect URL to payment page
    const paymentUrl = `${frontendUrl}/cravemore/payment?session_id=${paymentSession.id}`;
    
    return new Response(
      JSON.stringify({ 
        sessionId: paymentSession.id, 
        url: paymentUrl,
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
    
    if (errorMessage.includes("Moov secret key not configured")) {
      userFriendlyError = "Payment processing is not configured. Please check your MOOV_SECRET_KEY environment variable in Supabase.";
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes("Database migration required")) {
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

