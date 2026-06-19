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
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader }}}
    );
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claimed, error } = await admin
      .from("cx_jobs")
      .update({ assigned_driver_id: user.id, status: "accepted" })
      .eq("id", job_id).is("assigned_driver_id", null)
      .in("status", ["posted", "offered"])
      .select().maybeSingle();

    if (error) throw error;
    if (!claimed) {
      return new Response(JSON.stringify({ error: "Job already taken" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    await admin.from("cx_job_events").insert({
      job_id, actor_id: user.id, event_type: "accepted",
    });

    return new Response(JSON.stringify({ ok: true, job: claimed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});