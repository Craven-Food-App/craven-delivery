import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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
      .select("endpoint, p256dh_key, auth_key")
      .eq("driver_id", driver_id)
      .eq("is_active", true);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VITE_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKey) {
      console.warn("VAPID_PRIVATE_KEY not configured, notifications will be simulated");
    }

    // Send notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
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
          // For web push, we need to use the Web Push API
          // In production, you'd use a web-push library, but for Deno we'll use fetch
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: payload,
          });

          if (!response.ok) {
            // If subscription is invalid, mark it as inactive
            if (response.status === 410 || response.status === 404) {
              await supabase
                .from("driver_push_subscriptions")
                .update({ is_active: false })
                .eq("endpoint", sub.endpoint);
            }
            throw new Error(`Push failed: ${response.statusText}`);
          }

          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
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
