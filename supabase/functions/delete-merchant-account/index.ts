// Permanently delete a merchant account: their restaurants (and related data) and auth user.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin ?? undefined);

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email ?? "";
    console.log(`Processing merchant account deletion: ${userId} (${userEmail})`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all restaurants owned by this user
    const { data: ownedRestaurants, error: restErr } = await adminClient
      .from("restaurants")
      .select("id")
      .eq("owner_id", userId);

    if (restErr) {
      console.error("Error fetching restaurants:", restErr);
      return new Response(JSON.stringify({ error: "Failed to load account data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurantIds = (ownedRestaurants ?? []).map((r) => r.id);

    // Delete in order (child tables first where we have no cascade, then restaurants)
    const tablesToCleanByRestaurant: { table: string; column: string }[] = [
      { table: "restaurant_integrations", column: "restaurant_id" },
      { table: "restaurant_users", column: "restaurant_id" },
      { table: "restaurant_hours", column: "restaurant_id" },
      { table: "restaurant_go_live_checklist", column: "restaurant_id" },
    ];

    for (const rid of restaurantIds) {
      for (const { table, column } of tablesToCleanByRestaurant) {
        try {
          await adminClient.from(table).delete().eq(column, rid);
        } catch {
          // table may not exist or column name may differ
        }
      }
    }

    // Anonymize orders that reference these restaurants (keep for records)
    try {
      await adminClient
        .from("orders")
        .update({
          delivery_notes: `[MERCHANT ACCOUNT DELETED: ${userEmail}]`,
        })
        .in("restaurant_id", restaurantIds);
    } catch {
      // ignore
    }

    // Delete restaurants (cascade will remove menu_items, etc. if configured)
    for (const rid of restaurantIds) {
      try {
        await adminClient.from("restaurants").delete().eq("id", rid);
      } catch (e) {
        console.error(`Error deleting restaurant ${rid}:`, e);
      }
    }

    // Remove user profile
    try {
      await adminClient.from("user_profiles").delete().eq("user_id", userId);
    } catch {
      // ignore
    }

    // Audit log
    try {
      await adminClient.from("audit_logs").insert({
        operation: "DELETE",
        table_name: "auth.users",
        details: {
          action: "merchant_account_deletion",
          user_email: userEmail,
          deleted_restaurant_ids: restaurantIds,
          deleted_at: new Date().toISOString(),
        },
        user_id: userId,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Your account has been permanently deleted." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-merchant-account error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
