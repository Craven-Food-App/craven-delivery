// Edge Function: manage-merchant-inventory
// CRUD operations for SKU-based inventory (grocery, retail, convenience, etc.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client (respects RLS)
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    // Admin client (bypasses RLS for inventory operations)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, restaurant_id } = body;

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, merchant_category")
      .eq("id", restaurant_id)
      .eq("owner_id", user.id)
      .limit(1);

    if (restErr || !restaurant || restaurant.length === 0) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check that this category supports inventory
    const { data: config } = await supabaseAdmin.rpc("get_merchant_category_config", {
      p_restaurant_id: restaurant_id,
    });

    if (!config?.requires_inventory) {
      return new Response(
        JSON.stringify({
          error: "Inventory management not available for this merchant category",
          category: restaurant[0].merchant_category,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (action) {
      // ── LIST all inventory for a merchant ─────────────────────────
      case "list": {
        const { data, error } = await supabaseAdmin
          .from("merchant_inventory")
          .select("*, menu_items(name, price_cents, image_url)")
          .eq("restaurant_id", restaurant_id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        result = { items: data, count: data?.length || 0 };
        break;
      }

      // ── UPSERT inventory records (bulk) ───────────────────────────
      case "upsert": {
        const { items } = body;
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error("items array is required for upsert action");
        }

        const records = items.map((item: any) => ({
          restaurant_id,
          menu_item_id: item.menu_item_id || null,
          sku: item.sku || null,
          barcode: item.barcode || null,
          quantity_on_hand: item.quantity_on_hand ?? 0,
          quantity_reserved: 0,
          reorder_point: item.reorder_point ?? 5,
          is_perishable: item.is_perishable ?? false,
          expiry_date: item.expiry_date || null,
          unit_of_measure: item.unit_of_measure || "each",
          cost_cents: item.cost_cents || null,
          last_restocked_at: (item.quantity_on_hand ?? 0) > 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabaseAdmin
          .from("merchant_inventory")
          .upsert(records, { onConflict: "restaurant_id,sku" })
          .select();
        if (error) throw error;
        result = { updated: data?.length || 0, items: data };
        break;
      }

      // ── ADJUST stock for a single item ────────────────────────────
      case "adjust_stock": {
        const { menu_item_id, sku, adjustment } = body;
        if (adjustment === undefined || adjustment === null) {
          throw new Error("adjustment (integer) is required");
        }
        if (!menu_item_id && !sku) {
          throw new Error("menu_item_id or sku is required");
        }

        // Find existing inventory record
        let query = supabaseAdmin
          .from("merchant_inventory")
          .select("*")
          .eq("restaurant_id", restaurant_id);

        if (menu_item_id) query = query.eq("menu_item_id", menu_item_id);
        else query = query.eq("sku", sku);

        const { data: current, error: findErr } = await query.limit(1);
        if (findErr) throw findErr;
        if (!current || current.length === 0) throw new Error("Inventory record not found");

        const record = current[0];
        const newQty = Math.max(0, record.quantity_on_hand + adjustment);
        const { data, error } = await supabaseAdmin
          .from("merchant_inventory")
          .update({
            quantity_on_hand: newQty,
            last_restocked_at: adjustment > 0 ? new Date().toISOString() : record.last_restocked_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", record.id)
          .select()
          .single();
        if (error) throw error;
        result = { item: data };
        break;
      }

      // ── LOW STOCK report ──────────────────────────────────────────
      case "low_stock_report": {
        // Items at or below reorder point, or out of stock
        const { data: allInventory, error: invErr } = await supabaseAdmin
          .from("merchant_inventory")
          .select("*, menu_items(name, price_cents)")
          .eq("restaurant_id", restaurant_id);

        if (invErr) throw invErr;

        const lowStock = (allInventory || []).filter(
          (item: any) => item.quantity_on_hand <= item.reorder_point
        );
        const outOfStock = (allInventory || []).filter(
          (item: any) => item.quantity_on_hand === 0
        );
        const expiringSoon = (allInventory || []).filter((item: any) => {
          if (!item.is_perishable || !item.expiry_date) return false;
          const daysUntilExpiry = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry <= 3;
        });

        result = {
          total_items: allInventory?.length || 0,
          low_stock_items: lowStock,
          low_stock_count: lowStock.length,
          out_of_stock_items: outOfStock,
          out_of_stock_count: outOfStock.length,
          expiring_soon_items: expiringSoon,
          expiring_soon_count: expiringSoon.length,
        };
        break;
      }

      // ── DELETE inventory record ───────────────────────────────────
      case "delete": {
        const { inventory_id } = body;
        if (!inventory_id) throw new Error("inventory_id is required");

        const { error } = await supabaseAdmin
          .from("merchant_inventory")
          .delete()
          .eq("id", inventory_id)
          .eq("restaurant_id", restaurant_id);
        if (error) throw error;
        result = { deleted: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Valid actions: list, upsert, adjust_stock, low_stock_report, delete`);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("manage-merchant-inventory error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

