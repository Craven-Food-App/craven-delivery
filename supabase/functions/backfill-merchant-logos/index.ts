import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

/**
 * Admin: backfill restaurants_master (+ some restaurants) logos from curated Brandfetch domains.
 * Preserves hand-uploaded Supabase "seed logos" storage URLs.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const gate = await requireAdmin(req, ["admin", "ceo", "coo", "cfo", "chro", "super_admin", "executive"]);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: gate.error }), {
        status: gate.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const overwriteBrandfetch = body?.overwrite_brandfetch !== false;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Prefer RPC when available (runs as SECURITY DEFINER with caller auth).
    // Service-role call bypasses auth.uid() checks, so we apply the same SQL logic here.
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: rpcData, error: rpcError } = await userClient.rpc(
      "backfill_seeded_merchant_logos",
      { p_overwrite_brandfetch: overwriteBrandfetch },
    );

    if (!rpcError && rpcData) {
      return new Response(JSON.stringify(rpcData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if RPC missing / not migrated yet: update via service role with curated map
    const pairs: [string, string][] = [
      ["McDonald's", "mcdonalds.com"],
      ["Wendy's", "wendys.com"],
      ["Burger King", "burgerking.com"],
      ["Taco Bell", "tacobell.com"],
      ["KFC", "kfc.com"],
      ["Subway", "subway.com"],
      ["Chipotle", "chipotle.com"],
      ["Five Guys", "fiveguys.com"],
      ["Popeyes", "popeyes.com"],
      ["Chick-fil-A", "chick-fil-a.com"],
      ["Panera Bread", "panerabread.com"],
      ["Target", "target.com"],
      ["Walmart", "walmart.com"],
      ["Starbucks", "starbucks.com"],
      ["7-Eleven", "7-eleven.com"],
      ["Sephora", "sephora.com"],
      ["Ulta Beauty", "ulta.com"],
      ["PetSmart", "petsmart.com"],
      ["Petco", "petco.com"],
      ["Foot Locker", "footlocker.com"],
      ["Balance Grille", "balancegrille.com"],
      ["Tony Packo's", "tonypackos.com"],
      ["Home Slice Pizza", "homeslicepizza.com"],
    ];

    let updated = 0;
    for (const [name, domain] of pairs) {
      const logo = `https://cdn.brandfetch.io/${domain}/logo`;
      const { data: rows } = await admin
        .from("restaurants_master")
        .select("id, logo_url, image_url")
        .eq("name", name);

      for (const row of rows || []) {
        const current = row.logo_url as string | null;
        const isSeed = current && /seed(%20|\s)?logos/i.test(current);
        if (isSeed) continue;
        const shouldWrite =
          !current ||
          !String(current).trim() ||
          (overwriteBrandfetch &&
            String(current).startsWith("https://cdn.brandfetch.io/") &&
            current !== logo);
        if (!shouldWrite) continue;

        const imageUrl = row.image_url as string | null;
        const nextImage =
          !imageUrl ||
          !String(imageUrl).trim() ||
          String(imageUrl).includes("images.unsplash.com") ||
          (overwriteBrandfetch && String(imageUrl).startsWith("https://cdn.brandfetch.io/"))
            ? logo
            : imageUrl;

        const { error } = await admin
          .from("restaurants_master")
          .update({ logo_url: logo, image_url: nextImage })
          .eq("id", row.id);
        if (!error) updated += 1;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        restaurants_master_updated: updated,
        restaurants_updated: 0,
        fallback: true,
        rpc_error: rpcError?.message ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("backfill-merchant-logos error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
