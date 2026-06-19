// @ts-nocheck
// Server-side gate for posting CX jobs.
// - Verifies caller owns the courier restaurant
// - Verifies subscription is active or trialing
// - Verifies insurance is approved (cx_insurance_approved)
// - Enforces pricing floors from cx_pricing_config
// - Inserts the job + stops + initial event, then triggers cx-dispatch-job
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const StopSchema = z.object({
  address: z.string().min(3).max(300),
  contact_name: z.string().max(120).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  package_description: z.string().max(300).optional().nullable(),
});

const Body = z.object({
  restaurant_id: z.string().uuid(),
  job_type: z.enum(["on_demand", "scheduled", "bulk_route"]),
  pickup_at: z.string().datetime().optional().nullable(),
  driver_payout_offer_cents: z.number().int().nonnegative(),
  notes: z.string().max(1000).optional().nullable(),
  pickup: StopSchema,
  dropoffs: z.array(StopSchema).min(1).max(20),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const b = parsed.data;

    // Verify restaurant + ownership + courier type + subscription + insurance
    const { data: rest } = await admin
      .from("restaurants")
      .select("id, owner_id, business_type, region_id, cx_subscription_status, cx_insurance_approved")
      .eq("id", b.restaurant_id)
      .maybeSingle();
    if (!rest) return json({ error: "Restaurant not found" }, 404);
    if (rest.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (rest.business_type !== "courier_service") {
      return json({ error: "Only courier merchants can post CX jobs" }, 400);
    }
    if (!["active", "trialing"].includes(rest.cx_subscription_status ?? "")) {
      return json({ error: "Your CX subscription must be active to post jobs." }, 402);
    }
    if (!rest.cx_insurance_approved) {
      return json({ error: "Insurance approval is required before posting jobs." }, 412);
    }

    // Pricing config
    const { data: pricing } = await admin
      .from("cx_pricing_config")
      .select("*")
      .eq("active", true)
      .eq("job_type", b.job_type)
      .maybeSingle();

    const baseCents = pricing?.platform_base_cents ?? 0;
    const minDriver = pricing?.minimum_driver_payout_cents ?? 0;
    const perStop = pricing?.per_stop_floor_cents ?? 0;
    const floor = minDriver + perStop * b.dropoffs.length;

    if (b.driver_payout_offer_cents < floor) {
      return json({
        error: `Driver payout must be at least $${(floor / 100).toFixed(2)} for this job.`,
        floor_cents: floor,
      }, 422);
    }

    if (b.job_type === "scheduled" && !b.pickup_at) {
      return json({ error: "Scheduled jobs require pickup_at" }, 400);
    }

    const totalCharge = b.driver_payout_offer_cents + baseCents;

    const { data: job, error: jErr } = await admin
      .from("cx_jobs")
      .insert({
        courier_restaurant_id: rest.id,
        created_by: user.id,
        job_type: b.job_type,
        status: "posted",
        pickup_at: b.job_type === "scheduled" ? b.pickup_at : null,
        driver_payout_offer_cents: b.driver_payout_offer_cents,
        platform_base_cents: baseCents,
        total_charge_cents: totalCharge,
        notes: b.notes ?? null,
        region_id: rest.region_id ?? null,
      })
      .select()
      .single();
    if (jErr) return json({ error: jErr.message }, 500);

    const stopsPayload = [
      { job_id: job.id, sequence: 0, stop_type: "pickup", ...b.pickup },
      ...b.dropoffs.map((d, i) => ({ job_id: job.id, sequence: i + 1, stop_type: "dropoff", ...d })),
    ];
    const { error: e2 } = await admin.from("cx_job_stops").insert(stopsPayload);
    if (e2) {
      await admin.from("cx_jobs").delete().eq("id", job.id);
      return json({ error: e2.message }, 500);
    }

    await admin.from("cx_job_events").insert({
      job_id: job.id,
      actor_id: user.id,
      event_type: "posted",
      metadata: { stops: stopsPayload.length, payout_cents: b.driver_payout_offer_cents, total_cents: totalCharge },
    });

    // Kick off dispatch (best effort)
    admin.functions.invoke("cx-dispatch-job", { body: { job_id: job.id } }).catch(() => {});

    return json({ ok: true, job_id: job.id, total_charge_cents: totalCharge, floor_cents: floor });
  } catch (e: any) {
    return json({ error: e?.message ?? "Post job failed" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}