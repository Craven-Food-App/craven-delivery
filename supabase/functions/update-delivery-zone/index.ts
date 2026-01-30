import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id, name, city, state, zip_code, geojson, active } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "Zone id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables are not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const updates: Record<string, unknown> = {};

    if (typeof name === "string") updates.name = name;
    if (typeof city === "string") updates.city = city;
    if (typeof state === "string") updates.state = state;
    if (typeof zip_code === "string") updates.zip_code = zip_code;
    if (typeof active === "boolean") updates.active = active;

    if (geojson) {
      const { data: geomResult, error: geomError } = await supabase.rpc(
        "st_geomfromgeojson_text",
        { geojson: JSON.stringify(geojson) },
      );

      if (geomError) {
        return new Response(JSON.stringify({ error: geomError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      updates.geom = geomResult;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No update fields provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("delivery_zones")
      .update(updates)
      .eq("id", id)
      .select("id, name, city, state, zip_code, active");

    if (error) {
      return new Response(JSON.stringify({ error: error.message || "Failed to update zone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: "Delivery zone not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ zone: data[0] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
