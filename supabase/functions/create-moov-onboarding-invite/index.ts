import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                     */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MOOV_API_URL = Deno.env.get("MOOV_API_URL") ?? "https://api.moov.io";
const MOOV_SECRET_KEY = Deno.env.get("MOOV_SECRET_KEY");
const MOOV_ACCOUNT_ID = Deno.env.get("MOOV_ACCOUNT_ID") ?? "";

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://cravenusa.com";

/* -------------------------------------------------------------------------- */
/*                                   CORS                                      */
/* -------------------------------------------------------------------------- */

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
  ]).map(o => o.trim())
);

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    // IMPORTANT: do not lie to the browser
    return {
      "Access-Control-Allow-Origin": "null",
    };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/* -------------------------------------------------------------------------- */
/*                              MOOV UTILITIES                                 */
/* -------------------------------------------------------------------------- */

async function moovRequest(
  method: string,
  path: string,
  body?: unknown
) {
  if (!MOOV_SECRET_KEY) {
    throw new Error("MOOV_SECRET_KEY not configured");
  }

  const res = await fetch(`${MOOV_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${MOOV_SECRET_KEY}`,
      "Content-Type": "application/json",
      "x-moov-version": "v2024.01.00",
      ...(MOOV_ACCOUNT_ID && { "Moov-Account": MOOV_ACCOUNT_ID }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Moov API ${res.status}: ${text || res.statusText}`
    );
  }

  return res.json();
}

/* -------------------------------------------------------------------------- */
/*                                   SERVER                                    */
/* -------------------------------------------------------------------------- */

serve(async req => {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Create two clients: anon for auth validation, service role for DB operations
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate user JWT using anon client
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const {
      restaurantId,
      feePlanCodes,
      scopes = ["accounts.read"],
      capabilities = ["wallet.balance", "collect-funds.ach", "send-funds.ach"],
      prefill,
    } = body;

    if (!Array.isArray(feePlanCodes) || feePlanCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "feePlanCodes is required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    /* ----------------------------- RESTAURANT ------------------------------ */

    const { data: restaurant, error: restaurantError } = restaurantId
      ? await adminClient
          .from("restaurants")
          .select("*")
          .eq("id", restaurantId)
          .eq("owner_id", user.id) // Security: ensure user owns the restaurant
          .maybeSingle()
      : await adminClient
          .from("restaurants")
          .select("*")
          .eq("owner_id", user.id) // Security: filter by owner
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

    if (restaurantError) {
      console.error("Error fetching restaurant:", restaurantError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch restaurant data" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Verify restaurant exists and user owns it
    if (restaurantId && !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found or unauthorized" }),
        { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    /* -------------------------- CREATE MOOV INVITE -------------------------- */

    const invite = await moovRequest(
      "POST",
      "/onboarding-invites",
      {
        returnURL: `${FRONTEND_URL}/merchant-portal?moov_onboarding=complete`,
        termsOfServiceURL: `${FRONTEND_URL}/terms-of-service`,
        scopes,
        capabilities,
        feePlanCodes,
        prefill,
      }
    );

    /* ----------------------------- SIDE EFFECT ------------------------------ */

    if (restaurant?.id) {
      const { error: updateError } = await adminClient
        .from("restaurants")
        .update({
          moov_onboarding_invite_code: invite.code,
          moov_onboarding_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurant.id);

      if (updateError) {
        console.error("Error updating restaurant:", updateError);
        // Don't fail the request if DB update fails - the invite was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        code: invite.code,
        link: invite.link,
        status: invite.status,
        restaurantId: restaurant?.id ?? null,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[Moov Onboarding Error]", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
