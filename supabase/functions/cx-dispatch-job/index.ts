// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: job, error: jErr } = await supabase
      .from("cx_jobs").select("*").eq("id", job_id).single();
    if (jErr || !job) throw jErr ?? new Error("Job not found");

    const { data: pricing } = await supabase
      .from("cx_pricing_config").select("dispatch_timeout_seconds")
      .eq("active", true).eq("job_type", job.job_type).maybeSingle();
    const timeoutSec = pricing?.dispatch_timeout_seconds ?? 60;
    const deadline = new Date(Date.now() + timeoutSec * 1000).toISOString();

    const { data: tier1 } = await supabase
      .from("driver_preferences").select("driver_id")
      .eq("cx_opt_in", true).eq("cx_tier_verified", true);
    const { data: tier2 } = await supabase
      .from("driver_preferences").select("driver_id").eq("cx_opt_in", true);

    const tier1Ids = (tier1 ?? []).map((d: any) => d.driver_id);
    const tier2Ids = (tier2 ?? []).map((d: any) => d.driver_id);

    await supabase.from("cx_jobs").update({
      status: "offered", dispatch_deadline_at: deadline,
    }).eq("id", job_id);

    await supabase.from("cx_job_events").insert({
      job_id, event_type: "dispatched",
      metadata: { tier1_count: tier1Ids.length, tier2_count: tier2Ids.length, deadline },
    });

    const offers = (tier1Ids.length ? tier1Ids : tier2Ids).slice(0, 25);
    if (offers.length) {
      try {
        await supabase.from("notification_logs").insert(
          offers.map((uid: string) => ({
            user_id: uid,
            type: "cx_job_offer",
            title: "New Crave'N Express job",
            body: `$${((job.driver_payout_offer_cents)/100).toFixed(2)} payout · tap to view`,
            metadata: { job_id, payout_cents: job.driver_payout_offer_cents },
          }))
        );
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      ok: true, offered_to: offers.length,
      tier1: tier1Ids.length, tier2: tier2Ids.length, deadline,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});