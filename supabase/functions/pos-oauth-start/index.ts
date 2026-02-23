import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SQUARE_AUTH_URL = "https://connect.squareup.com/oauth2/authorize";
const CLOVER_AUTH_URL = "https://www.clover.com/oauth/authorize";
const TOAST_AUTH_URL = "https://ws-api.toasttab.com/oauth/authorize";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

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
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      provider?: string;
      restaurant_id?: string;
    };
    const provider = (body.provider ?? "").toLowerCase();
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/pos-oauth-callback`;
    const stateRaw = JSON.stringify({ restaurant_id: restaurantId, provider });
    const state = btoa(stateRaw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    if (provider === "square" || provider === "square pos") {
      const clientId = Deno.env.get("SQUARE_APPLICATION_ID");
      if (!clientId) {
        return new Response(
          JSON.stringify({
            error: "Square integration is not configured. Please contact support.",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const scopes =
        "MERCHANT_PROFILE_READ ITEMS_READ ITEMS_WRITE ORDERS_READ ORDERS_WRITE INVENTORY_READ";
      const squareRedirectUri = `${callbackUrl}?provider=square`;
      const url = `${SQUARE_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&session=false&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(squareRedirectUri)}`;
      return new Response(JSON.stringify({ url, provider: "square" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "clover") {
      const appId = Deno.env.get("CLOVER_APP_ID");
      if (!appId) {
        return new Response(
          JSON.stringify({
            error: "Clover integration is not configured. Please contact support.",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const redirectUri = `${callbackUrl}?provider=clover`;
      const url = `${CLOVER_AUTH_URL}?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return new Response(JSON.stringify({ url, provider: "clover" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "toast") {
      const clientId = Deno.env.get("TOAST_CLIENT_ID");
      if (!clientId) {
        return new Response(
          JSON.stringify({
            error: "Toast integration is not configured. Please contact support.",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const redirectUri = `${callbackUrl}?provider=toast`;
      const url = `${TOAST_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code`;
      return new Response(JSON.stringify({ url, provider: "toast" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown provider: ${provider}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("pos-oauth-start error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
