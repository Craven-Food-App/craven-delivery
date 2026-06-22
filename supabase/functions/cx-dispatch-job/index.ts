// Edge function: insert a CX courier job and kick off dual dispatch.
// Used by customer "Send a Package" and merchant/company shipment flows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Pickup = { name?: string; phone?: string; address: string; notes?: string };
type Body = {
  requester_type: "customer" | "merchant" | "company";
  size?: string;
  description?: string;
  speed?: string;
  pickup: Pickup;
  dropoff: Pickup;
  total_cents?: number;
  payout_cents?: number;
  platform_base_cents?: number;
  dispatch_mode?: "dual" | "cx_priority";
  dispatch_radius_miles?: number;
  eligible_feeder_tiers?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const body = (await req.json()) as Body;
    if (!body?.pickup?.address || !body?.dropoff?.address) {
      return json({ error: "pickup and dropoff addresses are required" }, 400);
    }

    const admin = createClient(url, serviceKey);

    // Pull dispatch settings (singleton)
    const { data: settings } = await admin
      .from("cx_dispatch_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    const defaults = settings ?? {
      default_radius_miles: 15,
      cx_exclusive_seconds: 30,
      eligible_feeder_tiers: ["elite", "ultimate"],
      customer_dispatch_mode: "dual",
      merchant_dispatch_mode: "cx_priority",
      company_dispatch_mode: "cx_priority",
      auto_dispatch_enabled: true,
    };

    const requesterType = body.requester_type || "customer";
    const mode =
      body.dispatch_mode ??
      (requesterType === "customer"
        ? defaults.customer_dispatch_mode
        : requesterType === "merchant"
          ? defaults.merchant_dispatch_mode
          : defaults.company_dispatch_mode);

    const radius = body.dispatch_radius_miles ?? defaults.default_radius_miles;
    const tiers = body.eligible_feeder_tiers ?? defaults.eligible_feeder_tiers;
    const cxExclusiveUntil =
      mode === "cx_priority"
        ? new Date(Date.now() + (defaults.cx_exclusive_seconds ?? 30) * 1000).toISOString()
        : null;

    const notesPayload = JSON.stringify({
      kind: "package",
      size: body.size,
      description: body.description,
      speed: body.speed,
      pickup: body.pickup,
      dropoff: body.dropoff,
      total_cents: body.total_cents ?? null,
    });

    const insertRow: Record<string, unknown> = {
      created_by: userId,
      job_type: "on_demand",
      status: "posted",
      notes: notesPayload,
      driver_payout_offer_cents: body.payout_cents ?? Math.round(((body.total_cents ?? 999) * 0.75)),
      platform_base_cents: body.platform_base_cents ?? Math.round(((body.total_cents ?? 999) * 0.25)),
      total_charge_cents: body.total_cents ?? null,
      requester_type: requesterType,
      dispatch_mode: mode,
      dispatch_radius_miles: radius,
      eligible_feeder_tiers: tiers,
      cx_exclusive_until: cxExclusiveUntil,
      dispatch_status: defaults.auto_dispatch_enabled ? "broadcasting" : "pending",
      broadcast_started_at: defaults.auto_dispatch_enabled ? new Date().toISOString() : null,
    };

    const { data: job, error: insErr } = await admin
      .from("cx_jobs")
      .insert(insertRow)
      .select()
      .single();

    if (insErr) {
      return json({ error: insErr.message }, 400);
    }

    // Audit event(s)
    const events: Array<Record<string, unknown>> = [];
    events.push({
      job_id: job.id,
      event_type: "created",
      pool: null,
      actor_user_id: userId,
      metadata: { requester_type: requesterType, mode, radius },
    });

    if (defaults.auto_dispatch_enabled) {
      events.push({
        job_id: job.id,
        event_type: "broadcast_cx",
        pool: "cx",
        actor_user_id: userId,
        metadata: { radius },
      });
      if (mode === "dual") {
        events.push({
          job_id: job.id,
          event_type: "broadcast_feeder",
          pool: "feeder",
          actor_user_id: userId,
          metadata: { radius, tiers },
        });
      }
    }

    await admin.from("cx_dispatch_events").insert(events);

    return json({ ok: true, job_id: job.id, dispatch_mode: mode, cx_exclusive_until: cxExclusiveUntil });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}