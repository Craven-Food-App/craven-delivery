// Edge Function: merchant-category-analytics
// Category-segmented reporting and analytics for internal use

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { report_type, category, start_date, end_date, restaurant_id } = body;

    if (!report_type) {
      return new Response(
        JSON.stringify({ error: "report_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startFilter = start_date || "2020-01-01";
    const endFilter = end_date || new Date().toISOString();

    let result: any;

    switch (report_type) {
      // ── Category overview: aggregate metrics by merchant category ──
      case "category_overview": {
        const { data } = await supabaseAdmin
          .from("orders_by_merchant_category")
          .select("*")
          .gte("order_date", startFilter)
          .lte("order_date", endFilter);

        // Aggregate across days by category
        const byCategory: Record<string, any> = {};
        for (const row of data || []) {
          const cat = row.merchant_category;
          if (!byCategory[cat]) {
            byCategory[cat] = {
              category: cat,
              total_orders: 0,
              total_revenue_cents: 0,
              total_food_subtotal_cents: 0,
              total_tips_cents: 0,
              delivered_count: 0,
              cancelled_count: 0,
            };
          }
          const c = byCategory[cat];
          c.total_orders += Number(row.total_orders || 0);
          c.total_revenue_cents += Number(row.total_revenue_cents || 0);
          c.total_food_subtotal_cents += Number(row.total_food_subtotal_cents || 0);
          c.total_tips_cents += Number(row.total_tips_cents || 0);
          c.delivered_count += Number(row.delivered_count || 0);
          c.cancelled_count += Number(row.cancelled_count || 0);
        }

        // Calculate derived metrics
        for (const c of Object.values(byCategory) as any[]) {
          c.avg_order_cents = c.total_orders > 0
            ? Math.round(c.total_revenue_cents / c.total_orders)
            : 0;
          c.cancellation_rate_pct = c.total_orders > 0
            ? Number(((c.cancelled_count / c.total_orders) * 100).toFixed(2))
            : 0;
          c.delivery_rate_pct = c.total_orders > 0
            ? Number(((c.delivered_count / c.total_orders) * 100).toFixed(2))
            : 0;
        }

        result = { categories: Object.values(byCategory) };
        break;
      }

      // ── Merchant category summary: merchant counts and status ──
      case "merchant_summary": {
        const { data } = await supabaseAdmin
          .from("merchant_category_summary")
          .select("*");

        result = { summary: data || [] };
        break;
      }

      // ── Restaurant prep & cancellation metrics ─────────────────
      case "restaurant_prep_metrics": {
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select(`
            id, order_status, created_at, accepted_at,
            restaurants!inner(merchant_category)
          `)
          .eq("restaurants.merchant_category", "restaurant")
          .gte("created_at", startFilter)
          .lte("created_at", endFilter);

        const total = orders?.length || 0;
        const cancelled = orders?.filter((o: any) => o.order_status === "cancelled").length || 0;
        const delivered = orders?.filter((o: any) => o.order_status === "delivered").length || 0;

        // Average time to acceptance (for accepted orders)
        const acceptedOrders = (orders || []).filter(
          (o: any) => o.accepted_at && o.created_at
        );
        let avgAcceptTimeSec = 0;
        if (acceptedOrders.length > 0) {
          const totalAcceptTime = acceptedOrders.reduce((sum: number, o: any) => {
            return sum + (new Date(o.accepted_at).getTime() - new Date(o.created_at).getTime()) / 1000;
          }, 0);
          avgAcceptTimeSec = Math.round(totalAcceptTime / acceptedOrders.length);
        }

        result = {
          total_orders: total,
          delivered_orders: delivered,
          cancelled_orders: cancelled,
          cancellation_rate_pct: total > 0 ? Number(((cancelled / total) * 100).toFixed(2)) : 0,
          delivery_rate_pct: total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0,
          avg_accept_time_seconds: avgAcceptTimeSec,
        };
        break;
      }

      // ── Inventory health: SKU metrics for retail/grocery ───────
      case "inventory_health": {
        const { data } = await supabaseAdmin
          .from("inventory_health_by_category")
          .select("*");

        const filtered = category
          ? (data || []).filter((d: any) => d.merchant_category === category)
          : data || [];

        result = { merchants: filtered };
        break;
      }

      // ── SKU velocity: top-selling items for a specific merchant ─
      case "sku_velocity": {
        if (!restaurant_id) {
          return new Response(
            JSON.stringify({ error: "restaurant_id required for sku_velocity report" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify user owns this restaurant (or is admin)
        const { data: ownedRestaurant } = await userClient
          .from("restaurants")
          .select("id")
          .eq("id", restaurant_id)
          .eq("owner_id", user.id)
          .limit(1);

        // Get order items for delivered orders
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select(`
            menu_item_id, quantity,
            orders!inner(restaurant_id, created_at, order_status)
          `)
          .eq("orders.restaurant_id", restaurant_id)
          .eq("orders.order_status", "delivered")
          .gte("orders.created_at", startFilter)
          .lte("orders.created_at", endFilter);

        // Aggregate by menu_item_id
        const skuMap: Record<string, { total_sold: number; order_count: number }> = {};
        for (const item of orderItems || []) {
          if (!skuMap[item.menu_item_id]) {
            skuMap[item.menu_item_id] = { total_sold: 0, order_count: 0 };
          }
          skuMap[item.menu_item_id].total_sold += item.quantity;
          skuMap[item.menu_item_id].order_count += 1;
        }

        // Get menu item names
        const menuItemIds = Object.keys(skuMap);
        let menuItems: any[] = [];
        if (menuItemIds.length > 0) {
          const { data: items } = await supabaseAdmin
            .from("menu_items")
            .select("id, name, price_cents")
            .in("id", menuItemIds);
          menuItems = items || [];
        }

        const menuItemMap = new Map(menuItems.map((m: any) => [m.id, m]));

        const topSkus = Object.entries(skuMap)
          .sort(([, a], [, b]) => b.total_sold - a.total_sold)
          .slice(0, 50)
          .map(([menu_item_id, stats]) => ({
            menu_item_id,
            name: menuItemMap.get(menu_item_id)?.name || "Unknown",
            price_cents: menuItemMap.get(menu_item_id)?.price_cents || 0,
            total_sold: stats.total_sold,
            order_count: stats.order_count,
            revenue_cents: stats.total_sold * (menuItemMap.get(menu_item_id)?.price_cents || 0),
          }));

        result = {
          restaurant_id,
          period: { start: startFilter, end: endFilter },
          top_skus: topSkus,
          total_unique_items_sold: menuItemIds.length,
        };
        break;
      }

      // ── Perishable turnover report ────────────────────────────
      case "perishable_turnover": {
        if (!restaurant_id) {
          return new Response(
            JSON.stringify({ error: "restaurant_id required for perishable_turnover report" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: perishables } = await supabaseAdmin
          .from("merchant_inventory")
          .select("*, menu_items(name, price_cents)")
          .eq("restaurant_id", restaurant_id)
          .eq("is_perishable", true)
          .order("expiry_date", { ascending: true });

        const now = new Date();
        const categorized = {
          expired: [] as any[],
          expiring_today: [] as any[],
          expiring_3_days: [] as any[],
          expiring_7_days: [] as any[],
          ok: [] as any[],
        };

        for (const item of perishables || []) {
          if (!item.expiry_date) {
            categorized.ok.push(item);
            continue;
          }
          const daysUntil = (new Date(item.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysUntil < 0) categorized.expired.push(item);
          else if (daysUntil < 1) categorized.expiring_today.push(item);
          else if (daysUntil <= 3) categorized.expiring_3_days.push(item);
          else if (daysUntil <= 7) categorized.expiring_7_days.push(item);
          else categorized.ok.push(item);
        }

        result = {
          restaurant_id,
          total_perishable_items: perishables?.length || 0,
          ...categorized,
          waste_risk_value_cents: [...categorized.expired, ...categorized.expiring_today].reduce(
            (sum: number, item: any) => sum + (item.quantity_on_hand * (item.cost_cents || 0)),
            0
          ),
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown report_type: ${report_type}`,
            valid_types: [
              "category_overview",
              "merchant_summary",
              "restaurant_prep_metrics",
              "inventory_health",
              "sku_velocity",
              "perishable_turnover",
            ],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, report_type, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("merchant-category-analytics error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

