import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SQUARE_TOKEN_URL = "https://connect.squareup.com/oauth2/token";
const CLOVER_TOKEN_URL = "https://api.clover.com/oauth/v2/token";
const TOAST_TOKEN_URL = "https://ws-api.toasttab.com/oauth/token";

serve(async (req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const baseRedirect = Deno.env.get("POS_OAUTH_RETURN_URL") ?? "https://cravenusa.com";
  const merchantPortalPath = "/merchant-portal";
  const successRedirect = `${baseRedirect}${merchantPortalPath}?pos=connected`;
  const errorRedirect = `${baseRedirect}${merchantPortalPath}?pos=error`;

  if (errorParam) {
    console.error("OAuth error from provider:", errorParam);
    return Response.redirect(errorRedirect + "&message=" + encodeURIComponent(errorParam), 302);
  }

  let restaurantId: string;
  try {
    if (!state) throw new Error("Missing state");
    const b64 = state.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(b64));
    restaurantId = decoded.restaurant_id;
    if (!restaurantId) throw new Error("Invalid state");
  } catch {
    return Response.redirect(errorRedirect + "&message=invalid_state", 302);
  }

  if (!code) {
    return Response.redirect(errorRedirect + "&message=missing_code", 302);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const callbackBase = `${supabaseUrl}/functions/v1/pos-oauth-callback`;

  let credentials: Record<string, unknown>;

  if (provider === "square") {
    const clientId = Deno.env.get("SQUARE_APPLICATION_ID");
    const clientSecret = Deno.env.get("SQUARE_APPLICATION_SECRET");
    if (!clientId || !clientSecret) {
      console.error("Square credentials not configured");
      return Response.redirect(errorRedirect + "&message=config", 302);
    }
    const tokenRes = await fetch(SQUARE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${callbackBase}?provider=square`,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Square token error:", tokenRes.status, errText);
      return Response.redirect(errorRedirect + "&message=token_exchange_failed", 302);
    }
    credentials = (await tokenRes.json()) as Record<string, unknown>;
  } else if (provider === "clover") {
    const appId = Deno.env.get("CLOVER_APP_ID");
    const appSecret = Deno.env.get("CLOVER_APP_SECRET");
    if (!appId || !appSecret) {
      console.error("Clover credentials not configured");
      return Response.redirect(errorRedirect + "&message=config", 302);
    }
    const redirectUri = `${callbackBase}?provider=clover`;
    const tokenRes = await fetch(CLOVER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Clover token error:", tokenRes.status, errText);
      return Response.redirect(errorRedirect + "&message=token_exchange_failed", 302);
    }
    credentials = (await tokenRes.json()) as Record<string, unknown>;
  } else if (provider === "toast") {
    const clientId = Deno.env.get("TOAST_CLIENT_ID");
    const clientSecret = Deno.env.get("TOAST_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      console.error("Toast credentials not configured");
      return Response.redirect(errorRedirect + "&message=config", 302);
    }
    const redirectUri = `${callbackBase}?provider=toast`;
    const tokenRes = await fetch(TOAST_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Toast token error:", tokenRes.status, errText);
      return Response.redirect(errorRedirect + "&message=token_exchange_failed", 302);
    }
    credentials = (await tokenRes.json()) as Record<string, unknown>;
  } else {
    return Response.redirect(errorRedirect + "&message=unknown_provider", 302);
  }

  const providerDisplayName =
    provider === "square" ? "Square POS" : provider === "clover" ? "Clover" : "Toast";

  const { error: upsertError } = await supabase.from("restaurant_integrations").upsert(
    {
      restaurant_id: restaurantId,
      integration_type: "pos",
      provider_name: providerDisplayName,
      status: "connected",
      credentials_encrypted: credentials as Record<string, unknown>,
      config: {},
      last_synced_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "restaurant_id,provider_name",
      ignoreDuplicates: false,
    }
  );

  if (upsertError) {
    console.error("DB upsert error:", upsertError);
    return Response.redirect(errorRedirect + "&message=save_failed", 302);
  }

  return Response.redirect(`${successRedirect}&provider=${encodeURIComponent(provider)}`, 302);
});
