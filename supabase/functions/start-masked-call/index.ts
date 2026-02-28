import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? null);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!accountSid || !authToken || !twilioPhone || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const orderId = body?.order_id;
    const callerRole = body?.caller_role;
    if (!orderId || !callerRole || (callerRole !== "driver" && callerRole !== "customer")) {
      return new Response(
        JSON.stringify({ error: "order_id and caller_role (driver|customer) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, customer_phone")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assignment } = await supabase
      .from("order_assignments")
      .select("driver_id")
      .eq("order_id", orderId)
      .eq("status", "accepted")
      .maybeSingle();
    if (!assignment?.driver_id) {
      return new Response(JSON.stringify({ error: "No assigned driver for this order" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("phone")
      .eq("user_id", assignment.driver_id)
      .maybeSingle();
    const driverPhone = (profile?.phone ?? "").trim();
    const customerPhone = (order.customer_phone ?? "").trim();
    if (!driverPhone || !customerPhone) {
      return new Response(
        JSON.stringify({ error: "Driver or customer phone missing for this order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookBase = supabaseUrl + "/functions/v1/twilio-voice-webhook";
    const firstToCall = callerRole === "driver" ? driverPhone : customerPhone;
    const secondToCall = callerRole === "driver" ? customerPhone : driverPhone;
    const webhookUrl = webhookBase + "?to=" + encodeURIComponent(secondToCall);

    const twilioBody = new URLSearchParams({ To: firstToCall, From: twilioPhone, Url: webhookUrl });
    const twilioAccountUrl = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Calls.json";
    const twilioRes = await fetch(twilioAccountUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(accountSid + ":" + authToken),
      },
      body: twilioBody.toString(),
    });

    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({ error: twilioData?.message ?? "Failed to start call" }),
        { status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, call_sid: twilioData.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("start-masked-call error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
