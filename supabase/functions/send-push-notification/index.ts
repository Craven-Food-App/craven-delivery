import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";
import { encode as base64encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

// ── Helper: get FCM OAuth2 access token from service account ────────────
async function getFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the RSA private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(
    serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    }
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get FCM access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ── Helper: send a single FCM message ───────────────────────────────────
async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<Response> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // Convert all data values to strings (FCM requires string values)
  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  const message = {
    message: {
      token: pushToken,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channel_id: "craven_orders",
          click_action: "FCM_PLUGIN_ACTIVITY",
          icon: "ic_launcher",
        },
      },
    },
  };

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driver_id, title, body, data, icon, badge } = await req.json();

    if (!driver_id || !title || !body) {
      throw new Error("Missing required fields: driver_id, title, body");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get driver's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("driver_push_subscriptions")
      .select("endpoint, p256dh_key, auth_key, is_native, push_token")
      .eq("driver_id", driver_id)
      .eq("is_active", true);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate native (FCM) from web push subscriptions
    const nativeSubs = subscriptions.filter((s: any) => s.is_native && s.push_token);
    const webSubs = subscriptions.filter((s: any) => !s.is_native);

    console.log(`Found ${nativeSubs.length} native and ${webSubs.length} web subscriptions`);

    // ── FCM native delivery ─────────────────────────────────────────────
    let fcmAccessToken: string | null = null;
    let fcmProjectId: string | null = null;

    if (nativeSubs.length > 0) {
      const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
      if (!serviceAccountJson) {
        console.error("FIREBASE_SERVICE_ACCOUNT_KEY not configured, skipping native push");
      } else {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          fcmProjectId = serviceAccount.project_id;
          fcmAccessToken = await getFcmAccessToken(serviceAccount);
          console.log("FCM access token obtained for project:", fcmProjectId);
        } catch (e) {
          console.error("Failed to get FCM access token:", e);
        }
      }
    }

    const results = await Promise.allSettled([
      // Send to native FCM subscriptions
      ...nativeSubs.map(async (sub: any) => {
        if (!fcmAccessToken || !fcmProjectId) {
          throw new Error("FCM not configured");
        }

        const fcmData: Record<string, string> = {
          ...(data || {}),
          click_action: "OPEN_APP",
        };

        const response = await sendFcmMessage(
          fcmAccessToken,
          fcmProjectId,
          sub.push_token,
          title,
          body,
          fcmData
        );

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`FCM error for token ${sub.push_token.substring(0, 20)}...:`, errBody);

          // If token is invalid/unregistered, mark subscription inactive
          if (
            response.status === 404 ||
            response.status === 410 ||
            errBody.includes("UNREGISTERED") ||
            errBody.includes("INVALID_ARGUMENT")
          ) {
            await supabase
              .from("driver_push_subscriptions")
              .update({ is_active: false })
              .eq("endpoint", sub.endpoint);
            console.log("Marked invalid FCM subscription as inactive");
          }
          throw new Error(`FCM push failed: ${response.status} ${errBody}`);
        }

        console.log("FCM push sent successfully to:", sub.push_token.substring(0, 20) + "...");
        return { success: true, type: "native", endpoint: sub.endpoint };
      }),

      // Send to web push subscriptions (existing logic)
      ...webSubs.map(async (sub: any) => {
        const payload = JSON.stringify({
          title,
          body,
          data: data || {},
          icon: icon || "/feeder_app_icon.png",
          badge: badge || "/feeder_app_icon.png",
          vibrate: [200, 100, 200],
          requireInteraction: false,
          tag: data?.order_id || "default",
        });

        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              TTL: "86400",
            },
            body: payload,
          });

          if (!response.ok) {
            if (response.status === 410 || response.status === 404) {
              await supabase
                .from("driver_push_subscriptions")
                .update({ is_active: false })
                .eq("endpoint", sub.endpoint);
            }
            throw new Error(`Web push failed: ${response.statusText}`);
          }

          return { success: true, type: "web", endpoint: sub.endpoint };
        } catch (error) {
          console.error(`Failed to send web push to ${sub.endpoint}:`, error);
          throw error;
        }
      }),
    ]);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
        native: nativeSubs.length,
        web: webSubs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
