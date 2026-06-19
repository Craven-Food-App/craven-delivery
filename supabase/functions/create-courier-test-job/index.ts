// @ts-nocheck
// Admin-only: create a live CX (courier) test job for a courier merchant so feeders
// receive it in their CX queue. Optional feederId broadcasts a direct offer to that
// feeder via realtime so the offer pops in their app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json().catch(() => ({}));
    const {
      restaurantId,
      feederId,
      payoutCents = 1800,
      pickup,
      dropoffs,
      jobType = "on_demand",
      notes,
    } = body as {
      restaurantId?: string;
      feederId?: string | null;
      payoutCents?: number;
      pickup?: { address: string; latitude?: number; longitude?: number; contact_name?: string; contact_phone?: string };
      dropoffs?: Array<{ address: string; latitude?: number; longitude?: number; contact_name?: string; contact_phone?: string; package_description?: string }>;
      jobType?: "on_demand" | "scheduled" | "bulk_route";
      notes?: string;
    };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const callerId = userRes.user.id;
    const { data: isCxAdmin, error: adminErr } = await service.rpc("is_cx_admin", { _user_id: callerId });
    if (adminErr || isCxAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    // Pick courier restaurant: either provided, or first courier_service merchant
    let courierRest: any = null;
    if (restaurantId) {
      const { data } = await service
        .from("restaurants")
        .select("id, name, business_type")
        .eq("id", restaurantId).maybeSingle();
      courierRest = data;
    } else {
      const { data } = await service
        .from("restaurants")
        .select("id, name, business_type")
        .eq("business_type", "courier_service")
        .order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      courierRest = data;
    }
    if (!courierRest || courierRest.business_type !== "courier_service") {
      return new Response(JSON.stringify({ error: "No courier merchant available" }), { status: 404, headers: jsonHeaders });
    }

    const pickupStop = pickup ?? {
      address: "PetSmart, 9645 Olde US Hwy 20, Rossford, OH 43460",
      latitude: 41.6128,
      longitude: -83.5638,
      contact_name: "Store Manager",
      contact_phone: "+14195551234",
    };
    const drops = (dropoffs && dropoffs.length > 0) ? dropoffs : [
      {
        address: "123 W State St, Fremont, OH 43420",
        latitude: 41.3505,
        longitude: -83.1219,
        contact_name: "J. Carter",
        contact_phone: "+14195551001",
        package_description: "Pet food (25 lbs)",
      },
      {
        address: "456 Main St, Gibsonburg, OH 43431",
        latitude: 41.3892,
        longitude: -83.3199,
        contact_name: "M. Lopez",
        contact_phone: "+14195551002",
        package_description: "Pet supplies (18 lbs)",
      },
    ];

    // Pricing config (best-effort)
    const { data: pricing } = await service
      .from("cx_pricing_config").select("*")
      .eq("active", true).eq("job_type", jobType).maybeSingle();
    const baseCents = pricing?.platform_base_cents ?? 299;
    const totalCharge = payoutCents + baseCents;

    // Insert job
    const timeoutSec = pricing?.dispatch_timeout_seconds ?? pricing?.fallback_seconds ?? 60;
    const expireSec = pricing?.expire_seconds ?? 900;
    const deadline = new Date(Date.now() + timeoutSec * 1000).toISOString();
    const expiresAt = new Date(Date.now() + expireSec * 1000).toISOString();

    const totalMeters = Math.round(70 * 1609.344);
    const totalSeconds = 2 * 3600 + 18 * 60;

    const { data: job, error: jErr } = await service
      .from("cx_jobs")
      .insert({
        courier_restaurant_id: courierRest.id,
        created_by: callerId,
        job_type: jobType,
        status: "offered",
        driver_payout_offer_cents: payoutCents,
        platform_base_cents: baseCents,
        notes: notes ?? "TEST: Pet Supplies MUST READ: Please review item descriptions/dimensions and ensure you have a vehicle large enough and can independently load and unload the Gig items before offering.",
        region_id: null,
        dispatch_deadline_at: deadline,
        next_broadcast_at: deadline,
        expires_at: expiresAt,
        dispatch_round: 2,
        tier_open: true,
        estimated_distance_meters: totalMeters,
        estimated_duration_seconds: totalSeconds,
      })
      .select().single();
    if (jErr) return new Response(JSON.stringify({ error: jErr.message }), { status: 500, headers: jsonHeaders });

    const stopsPayload = [
      { job_id: job.id, sequence: 0, stop_type: "pickup", ...pickupStop },
      ...drops.map((d, i) => ({ job_id: job.id, sequence: i + 1, stop_type: "dropoff", ...d })),
    ];
    const { error: e2 } = await service.from("cx_job_stops").insert(stopsPayload);
    if (e2) {
      await service.from("cx_jobs").delete().eq("id", job.id);
      return new Response(JSON.stringify({ error: e2.message }), { status: 500, headers: jsonHeaders });
    }

    await service.from("cx_job_events").insert({
      job_id: job.id,
      actor_id: callerId,
      event_type: "posted",
      metadata: { test: true, stops: stopsPayload.length, payout_cents: payoutCents },
    });

    // Broadcast direct offer to a feeder if specified
    if (feederId) {
      try {
        const ch = service.channel(`cx_driver_${feederId}`);
        await ch.subscribe();
        await ch.send({
          type: "broadcast",
          event: "cx_job_offer",
          payload: { job_id: job.id, payout_cents: payoutCents, courier_name: courierRest.name },
        });
        await service.removeChannel(ch);

        const userCh = service.channel(`user_notifications_${feederId}`);
        await userCh.subscribe();
        await userCh.send({
          type: "broadcast",
          event: "push_notification",
          payload: {
            title: `CX TEST — ${courierRest.name}`,
            message: `$${(payoutCents / 100).toFixed(2)} courier gig available`,
            data: { job_id: job.id, kind: "cx_test" },
          },
        });
        await service.removeChannel(userCh);
      } catch (broadcastErr) {
        console.warn("broadcast failed", broadcastErr);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      job_id: job.id,
      courier_restaurant: { id: courierRest.id, name: courierRest.name },
      payout_cents: payoutCents,
      total_charge_cents: totalCharge,
    }), { status: 200, headers: jsonHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});