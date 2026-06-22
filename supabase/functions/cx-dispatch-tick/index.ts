// Edge function: housekeeping for CX dispatch.
// Expires the CX-exclusive window (broadcasts to Feeders) and times out stale jobs.
// Can be invoked manually from the Dispatch Console or by pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const nowIso = new Date().toISOString();

  // 1) For cx_priority jobs whose exclusive window has lapsed and remain unclaimed,
  //    log a broadcast_feeder event so Feeders see them.
  const { data: lapsed } = await admin
    .from("cx_jobs")
    .select("id, dispatch_mode, cx_exclusive_until, dispatch_radius_miles, eligible_feeder_tiers")
    .eq("dispatch_status", "broadcasting")
    .eq("dispatch_mode", "cx_priority")
    .lte("cx_exclusive_until", nowIso);

  const fanOutEvents = (lapsed ?? []).map((j) => ({
    job_id: j.id,
    event_type: "broadcast_feeder",
    pool: "feeder",
    metadata: { radius: j.dispatch_radius_miles, tiers: j.eligible_feeder_tiers, reason: "cx_window_expired" },
  }));

  if (fanOutEvents.length) {
    await admin.from("cx_dispatch_events").insert(fanOutEvents);
  }

  // 2) Expire jobs older than 10 minutes that nobody claimed.
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: expired } = await admin
    .from("cx_jobs")
    .update({ dispatch_status: "expired" })
    .in("dispatch_status", ["pending", "broadcasting"])
    .lte("broadcast_started_at", cutoff)
    .select("id");

  if (expired?.length) {
    await admin.from("cx_dispatch_events").insert(
      expired.map((j) => ({ job_id: j.id, event_type: "expired", pool: null })),
    );
  }

  return new Response(
    JSON.stringify({ ok: true, fanned_out: fanOutEvents.length, expired: expired?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});