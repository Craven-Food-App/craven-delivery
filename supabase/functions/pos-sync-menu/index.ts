// Sync menu from connected POS (Square, then Toast/Clover) into Crave'n menu_items.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SQUARE_API_BASE = "https://connect.squareup.com";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      restaurant_id?: string;
      provider?: string;
    };
    const restaurantId = body.restaurant_id;
    const provider = (body.provider ?? "square").toLowerCase();

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providerDisplayName =
      provider === "square" ? "Square POS" : provider === "toast" ? "Toast" : "Clover";

    const { data: integration } = await supabase
      .from("restaurant_integrations")
      .select("credentials_encrypted")
      .eq("restaurant_id", restaurantId)
      .eq("integration_type", "pos")
      .eq("provider_name", providerDisplayName)
      .eq("status", "connected")
      .single();

    if (!integration?.credentials_encrypted) {
      return new Response(
        JSON.stringify({
          error: `No connected ${providerDisplayName} integration. Connect your POS first in Settings → Integrations.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creds = integration.credentials_encrypted as Record<string, unknown>;
    const accessToken = creds.access_token as string | undefined;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "POS connection missing credentials. Try disconnecting and reconnecting." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "square" || provider === "square pos") {
      const result = await syncFromSquare(supabase, restaurantId, accessToken);
      await supabase
        .from("restaurant_integrations")
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurantId)
        .eq("provider_name", providerDisplayName);

      return new Response(
        JSON.stringify({
          success: true,
          provider: "square",
          synced: result.synced,
          errors: result.errors,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "toast" || provider === "clover") {
      return new Response(
        JSON.stringify({
          error: `Menu sync for ${providerDisplayName} is not yet supported. Square is supported.`,
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pos-sync-menu error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncFromSquare(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  accessToken: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Square-Version": "2024-01-18",
  };

  let cursor: string | null = null;
  const items: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    priceCents: number;
  }> = [];

  do {
    const url = `${SQUARE_API_BASE}/v2/catalog/list?types=ITEM,ITEM_VARIATION${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Square API error: ${res.status} ${text}`);
    }
    const data = await res.json() as {
      objects?: Array<{
        type: string;
        id: string;
        item_data?: {
          name?: string;
          description?: string;
          variations?: Array<{ id: string }>;
          category_id?: string;
          image_ids?: string[];
        };
        item_variation_data?: {
          item_id?: string;
          price_money?: { amount?: number; currency?: string };
        };
      }>;
      cursor?: string;
    };
    cursor = data.cursor ?? null;

    const objects = data.objects ?? [];
      const variationPrices = new Map<string, number>();
      const itemIdsToVariations = new Map<string, string[]>();

      for (const obj of objects) {
        if (obj.type === "ITEM_VARIATION" && obj.item_variation_data?.item_id) {
          const itemId = obj.item_variation_data.item_id;
          const amount = obj.item_variation_data.price_money?.amount ?? 0;
          if (!variationPrices.has(obj.id)) variationPrices.set(obj.id, amount);
          const list = itemIdsToVariations.get(itemId) ?? [];
          list.push(obj.id);
          itemIdsToVariations.set(itemId, list);
        }
      }

      for (const obj of objects) {
        if (obj.type !== "ITEM" || !obj.item_data) continue;
        const name = (obj.item_data.name ?? "").trim();
        if (!name) continue;
        const variationIds = obj.item_data.variations ?? [];
        const firstVariationId = variationIds[0]?.id;
        const priceCents = firstVariationId
          ? (variationPrices.get(firstVariationId) ?? 0)
          : 0;
        const description = (obj.item_data.description ?? "").trim() || name;
        const category = (obj.item_data.category_id ?? "").trim() || "Uncategorized";
        items.push({
          id: obj.id,
          name,
          description,
          category,
          imageUrl: null,
          priceCents,
        });
      }
  } while (cursor);

  for (const item of items) {
    try {
      const { data: existing } = await supabase
        .from("menu_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("name", item.name)
        .limit(1)
        .maybeSingle();

      const row: Record<string, unknown> = {
        description: item.description,
        price_cents: item.priceCents > 0 ? item.priceCents : 999,
        image_url: item.imageUrl,
        is_available: true,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from("menu_items")
          .update(row)
          .eq("id", existing.id);
        if (!updateErr) synced++;
        else errors.push(`${item.name}: ${updateErr.message}`);
      } else {
        const { error: insertErr } = await supabase.from("menu_items").insert({
          restaurant_id: restaurantId,
          name: item.name,
          description: row.description,
          price_cents: row.price_cents,
          image_url: row.image_url,
          is_available: row.is_available,
          updated_at: row.updated_at,
        });
        if (!insertErr) synced++;
        else errors.push(`${item.name}: ${insertErr.message}`);
      }
    } catch (e) {
      errors.push(`${item.name}: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }

  return { synced, errors };
}
