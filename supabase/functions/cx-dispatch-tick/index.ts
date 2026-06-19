// @ts-nocheck
// Scheduled tick: re-broadcasts unaccepted CX jobs to a wider driver pool,
// and marks jobs as dispatch_failed once they exceed max rounds or expire.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const nowIso = new Date().toISOString();

    // 1) Expire jobs past expires_at that nobody took.
    const { data: expired } = await admin
      .from("cx_jobs")
      .select("id")
      .is("assigned_driver_id", null)
      .lt("expires_at", nowIso)
      .in("status", ["posted", "offered"]);
    if (expired?.length) {
      const ids = expired.map((j: any) => j.id);
      await admin.from("cx_jobs").update({ status: "dispatch_failed" }).in("id", ids);
      await admin.from("cx_job_events").insert(
        ids.map((id: string) => ({ job_id: id, event_type: "dispatch_failed", metadata: { reason: "expired" } })),
      );
    }

    // 2) Find jobs whose next_broadcast_at has passed and are still unassigned.
    const { data: stale } = await admin
      .from("cx_jobs")
      .select("id, job_type, dispatch_round, driver_payout_offer_cents")
      .is("assigned_driver_id", null)
      .in("status", ["posted", "offered"])
      .lt("next_broadcast_at", nowIso)
      .limit(100);

    if (!stale?.length) {
      return new Response(JSON.stringify({ ok: true, expired: expired?.length ?? 0, rebroadcast: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rebroadcast = 0;
    let failed = 0;

    for (const job of stale) {
      const { data: pricing } = await admin
        .from("cx_pricing_config")
        .select("fallback_seconds, max_rounds")
        .eq("active", true)
        .eq("job_type", job.job_type)
        .maybeSingle();
      const fallbackSec = pricing?.fallback_seconds ?? 60;
      const maxRounds = pricing?.max_rounds ?? 3;

      const nextRound = (job.dispatch_round ?? 1) + 1;

      if (nextRound > maxRounds) {
        await admin
          .from("cx_jobs")
          .update({ status: "dispatch_failed" })
          .eq("id", job.id);
        await admin.from("cx_job_events").insert({
          job_id: job.id,
          event_type: "dispatch_failed",
          metadata: { reason: "max_rounds", round: nextRound },
        });
        failed++;
        continue;
      }

      const nextBroadcast = new Date(Date.now() + fallbackSec * 1000).toISOString();
      // Open to general (non-verified) pool on round 2+
      await admin
        .from("cx_jobs")
        .update({
          dispatch_round: nextRound,
          tier_open: true,
          next_broadcast_at: nextBroadcast,
          status: "offered",
        })
        .eq("id", job.id);

      await admin.from("cx_job_events").insert({
        job_id: job.id,
        event_type: "rebroadcast",
        metadata: { round: nextRound, tier_open: true },
      });

      // Notify a wider pool: all opted-in drivers (not just verified)
      const { data: drivers } = await admin
        .from("driver_preferences")
        .select("driver_id")
        .eq("cx_opt_in", true);
      const ids = (drivers ?? []).map((d: any) => d.driver_id);
      if (ids.length) {
        try {
          await admin.from("notification_logs").insert(
            ids.slice(0, 100).map((uid: string) => ({
              user_id: uid,
              type: "cx_job_offer",
              title: "Crave'N Express job re-broadcast",
              body: `$${((job.driver_payout_offer_cents) / 100).toFixed(2)} payout · tap to view`,
              metadata: { job_id: job.id, round: nextRound },
            })),
          );
        } catch (_) { /* noop */ }
      }
      rebroadcast++;
    }

    return new Response(JSON.stringify({ ok: true, expired: expired?.length ?? 0, rebroadcast, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});