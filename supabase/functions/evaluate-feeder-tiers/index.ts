import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { feeder_id } = body;

    if (feeder_id) {
      // Evaluate single feeder
      const { error } = await supabase.rpc("evaluate_feeder_tier", { p_feeder_id: feeder_id });
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: `Evaluated feeder ${feeder_id}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch: evaluate all active feeders
    const { data: feeders, error: fetchError } = await supabase
      .from("driver_profiles")
      .select("id")
      .not("user_id", "is", null);

    if (fetchError) throw fetchError;

    let evaluated = 0;
    let errors = 0;

    for (const feeder of feeders || []) {
      const { error } = await supabase.rpc("evaluate_feeder_tier", { p_feeder_id: feeder.id });
      if (error) {
        console.error(`Error evaluating feeder ${feeder.id}:`, error);
        errors++;
      } else {
        evaluated++;
      }
    }

    // Check for Ultimate downgrades and create notifications
    const { data: recentDemotions } = await supabase
      .from("tier_history")
      .select("*")
      .eq("old_tier", "Ultimate")
      .neq("new_tier", "Ultimate")
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

    if (recentDemotions && recentDemotions.length > 0) {
      for (const demotion of recentDemotions) {
        await supabase.from("notifications").insert({
          title: "Ultimate Feeder Downgraded",
          message: `Feeder ${demotion.feeder_id} was demoted from Ultimate to ${demotion.new_tier}. Reason: ${demotion.reason}`,
          type: "admin_alert",
        }).catch(() => {}); // notification table may not exist yet
      }
    }

    return new Response(
      JSON.stringify({ success: true, evaluated, errors, total: feeders?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
