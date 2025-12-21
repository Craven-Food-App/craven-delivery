import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, userId, deviceInfo } = await req.json();

    if (!subscription || !userId) {
      throw new Error("Missing required parameters: subscription and userId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Registering push subscription for user:", userId);
    console.log("Subscription endpoint:", subscription.endpoint);

    // Extract keys from subscription
    const p256dhKey = subscription.keys?.p256dh || '';
    const authKey = subscription.keys?.auth || '';

    if (!p256dhKey || !authKey) {
      throw new Error("Invalid subscription: missing keys");
    }

    // Store push subscription in database
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        user_agent: deviceInfo?.userAgent || req.headers.get("user-agent"),
        device_type: deviceInfo?.platform || "web",
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      })
      .select();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Push subscription registered successfully:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Push subscription registered successfully",
        subscription: data?.[0] 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Register push subscription error:", error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Unknown error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});