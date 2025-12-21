import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json().catch(() => ({}));
    const driverId: string | undefined = body.driverId;
    const distanceKm: number = Number(body.distanceKm ?? 3.2);
    const expiresInMs: number = Number(body.expiresInMs ?? 30_000);

    if (!driverId) {
      return new Response(JSON.stringify({ error: "driverId is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    // Service role client (bypasses RLS intentionally for server-side actions)
    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth client to resolve the caller's user
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const callerId = userRes.user.id;

    // Ensure caller is admin (testing tool)
    const { data: roles, error: rolesErr } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .limit(1);

    if (rolesErr) {
      console.error("rolesErr", rolesErr);
    }

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    // Pick a restaurant (active preferred)
    let { data: restaurant, error: restErr } = await service
      .from("restaurants")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (restErr) {
      console.warn("Active restaurant lookup failed:", restErr.message);
    }

    if (!restaurant) {
      const { data: fallback, error: restAnyErr } = await service
        .from("restaurants")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (restAnyErr) {
        console.error("Restaurant lookup failed:", restAnyErr.message);
      }
      restaurant = fallback as any;
    }

    if (!restaurant) {
      return new Response(JSON.stringify({ error: "No restaurants found" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    const estimatedTime = Math.ceil(distanceKm * 3);

    // Get real customer profile data
    const { data: customerProfile } = await service
      .from("user_profiles")
      .select("full_name, phone")
      .eq("user_id", callerId)
      .single();

    // Get real delivery address for customer or use restaurant location as fallback
    const { data: deliveryAddresses } = await service
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", callerId)
      .order("is_default", { ascending: false })
      .limit(1);

    const delivery_address = deliveryAddresses?.[0] 
      ? {
          street: deliveryAddresses[0].street_address,
          city: deliveryAddresses[0].city,
          state: deliveryAddresses[0].state,
          zip: deliveryAddresses[0].zip_code,
          latitude: restaurant.latitude || 40.7128,
          longitude: restaurant.longitude || -74.0060,
        }
      : {
          street: restaurant.address || "123 Test Street",
          city: restaurant.city || "Test City",
          state: restaurant.state || "TS",
          zip: restaurant.zip_code || "12345",
          latitude: restaurant.latitude || 40.7128,
          longitude: restaurant.longitude || -74.0060,
        };

    // Create order as confirmed and assigned to selected driver
    const { data: order, error: orderErr } = await service
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_id: callerId,
        driver_id: driverId,
        order_status: "confirmed",
        total_cents: 2599,
        subtotal_cents: 2299,
        tax_cents: 200,
        tip_cents: 100,
        delivery_fee_cents: 0,
        delivery_address,
        customer_name: customerProfile?.full_name || "Test Customer",
        customer_phone: customerProfile?.phone || null,
        pickup_address: {
          street: restaurant.address || "Restaurant Address",
          city: restaurant.city || "City",
          state: restaurant.state || "ST",
          zip: restaurant.zip_code || "00000",
          latitude: restaurant.latitude || 40.7128,
          longitude: restaurant.longitude || -74.0060,
        },
      })
      .select("*")
      .single();

    if (orderErr) {
      console.error("orderErr", orderErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to create order", details: orderErr.message }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const { data: assignment, error: assignErr } = await service
      .from("order_assignments")
      .insert({
        order_id: order.id,
        driver_id: driverId,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (assignErr) {
      console.error("assignErr", assignErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to create assignment", details: assignErr.message }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const notificationPayload = {
      type: "order_assignment",
      assignment_id: assignment.id,
      order_id: order.id,
      restaurant_name: restaurant.name || "Test Restaurant",
      pickup_address: {
        street: restaurant.address || "Test Pickup Address",
        city: restaurant.city || "Test City",
        state: restaurant.state || "TS",
        zip: restaurant.zip_code || "12345",
      },
      dropoff_address: delivery_address,
      payout_cents: 500,
      distance_km: distanceKm,
      distance_mi: (distanceKm * 0.621371).toFixed(1),
      expires_at: expiresAt,
      estimated_time: estimatedTime,
      isTestOrder: true,
    } as const;

    // Best-effort log notification in DB (non-fatal)
    const { error: notifErr } = await service.from("order_notifications").insert({
      user_id: driverId,
      order_id: order.id,
      title: `Test Order: ${restaurant.name || "Test Restaurant"}`,
      message: "Test pickup - this is a test order",
      notification_type: "order_assignment",
    });
    if (notifErr) {
      console.warn("order_notifications insert failed:", notifErr.message);
    }

    return new Response(
      JSON.stringify({ notificationPayload, restaurant }),
      { headers: jsonHeaders },
    );
  } catch (e) {
    console.error("Unexpected error in create-test-order:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(e) }),
      { status: 500, headers: jsonHeaders },
    );
  }
});