import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Admin-only: create a test order for a chosen restaurant so the merchant tablet
 * can exercise the receiving flow. Order stays "live" (pending), not pre-delivered.
 * Optional driverId: assigns feeder + creates pending order_assignment (feeder offer).
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json().catch(() => ({}));
    const restaurantId: string | undefined = body.restaurantId;
    const orderType: string = (body.orderType as string) || "restaurant";
    const driverId: string | undefined = body.driverId;
    const expiresInMs: number = Number(body.expiresInMs ?? 30_000);
    const distanceMiles = Math.random() * 2 + 1;
    const distanceKm: number = Number(body.distanceKm ?? (distanceMiles / 0.621371));

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurantId is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
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

    const { data: roles, error: rolesErr } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .limit(1);
    if (rolesErr) console.error("rolesErr", rolesErr);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const { data: restaurant, error: restErr } = await service
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();

    if (restErr || !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found or inactive" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const storeType: string | null =
      orderType === "retail"
        ? "retail_store"
        : (restaurant as { restaurant_type?: string | null }).restaurant_type ?? null;

    const { data: customerProfile } = await service
      .from("user_profiles")
      .select("full_name, phone, email")
      .eq("user_id", callerId)
      .maybeSingle();

    const { data: deliveryAddresses } = await service
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", callerId)
      .order("is_default", { ascending: false })
      .limit(1);

    let delivery_address: Record<string, unknown>;
    if (deliveryAddresses?.[0]) {
      const addr = deliveryAddresses[0];
      delivery_address = {
        name: customerProfile?.full_name || "Customer",
        street: addr.street_address,
        city: addr.city,
        state: addr.state,
        zip: addr.zip_code,
        zip_code: addr.zip_code,
        apt_suite: addr.apt_suite || null,
        latitude: addr.latitude || (restaurant as { latitude?: number }).latitude,
        longitude: addr.longitude || (restaurant as { longitude?: number }).longitude,
        address: `${addr.street_address}, ${addr.city}, ${addr.state} ${addr.zip_code}`,
      };
    } else {
      const r = restaurant as {
        address?: string;
        street_address?: string;
        city?: string;
        state?: string;
        zip_code?: string;
        latitude?: number;
        longitude?: number;
      };
      delivery_address = {
        name: customerProfile?.full_name || "Test Customer",
        street: "100 Test St",
        city: r.city || "City",
        state: r.state || "ST",
        zip: r.zip_code || "00000",
        zip_code: r.zip_code || "00000",
        latitude: r.latitude,
        longitude: r.longitude,
        address: `100 Test St, ${r.city || "City"}, ${r.state || "ST"} ${r.zip_code || "00000"}`,
      };
    }

    const { data: menuItems } = await service
      .from("menu_items")
      .select("id, name, price_cents, description")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .limit(10);

    let orderItems: {
      menu_item_id: string | null;
      quantity: number;
      price_cents: number;
      special_instructions: string | null;
    }[] = [];
    let subtotalCents = 0;

    if (menuItems && menuItems.length > 0) {
      const n = Math.min(Math.floor(Math.random() * 3) + 2, menuItems.length);
      const shuffled = [...menuItems].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, n);
      orderItems = selected.map((item: { id: string; price_cents: number }) => {
        const q = 1;
        const t = item.price_cents * q;
        subtotalCents += t;
        return {
          menu_item_id: item.id,
          quantity: q,
          price_cents: item.price_cents,
          special_instructions: null,
        };
      });
    } else {
      subtotalCents = 1299 + 599;
      orderItems = [
        { menu_item_id: null, quantity: 1, price_cents: 1299, special_instructions: null },
        { menu_item_id: null, quantity: 1, price_cents: 599, special_instructions: null },
      ];
    }

    const taxCents = Math.round(subtotalCents * 0.08);
    const tipCents = Math.min(500, Math.max(100, Math.round(subtotalCents * 0.15)));
    const totalCents = subtotalCents + taxCents + tipCents;
    const mileagePayCents = Math.round(distanceKm * 0.621371 * 67);
    const basePayCents = 500;
    const totalDriverPayCents = basePayCents + mileagePayCents;
    const estimatedTime = Math.ceil(distanceKm * 3);
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

    const { data: order, error: orderErr } = await service
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_id: callerId,
        driver_id: driverId ?? null,
        is_test: true,
        order_status: "pending",
        total_cents: totalCents,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        tip_cents: tipCents,
        delivery_fee_cents: 0,
        mileage_pay_cents: mileagePayCents,
        distance_km: distanceKm,
        delivery_address,
        customer_name: customerProfile?.full_name || "Test Customer",
        customer_phone: customerProfile?.phone || null,
        pickup_address: {
          name: restaurant.name || "Restaurant",
          street: (restaurant as { address?: string; street_address?: string }).address || (restaurant as { street_address?: string }).street_address || "Address",
          city: (restaurant as { city?: string }).city || "City",
          state: (restaurant as { state?: string }).state || "ST",
          zip: (restaurant as { zip_code?: string }).zip_code || "00000",
          zip_code: (restaurant as { zip_code?: string }).zip_code || "00000",
          latitude: (restaurant as { latitude?: number }).latitude || 41.6528,
          longitude: (restaurant as { longitude?: number }).longitude || -83.5555,
          address: (restaurant as { address?: string }).address || "Pickup",
          phone: (restaurant as { phone?: string | null }).phone || null,
        },
      } as Record<string, unknown>)
      .select("*")
      .single();

    if (orderErr || !order) {
      console.error("orderErr", orderErr?.message);
      return new Response(
        JSON.stringify({ error: "Failed to create order", details: orderErr?.message }),
        { status: 500, headers: jsonHeaders },
      );
    }

    if (orderItems.length > 0) {
      const toInsert = orderItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price_cents: item.price_cents,
        special_instructions: item.special_instructions,
      }));
      const { error: itemsErr } = await service.from("order_items").insert(toInsert);
      if (itemsErr) console.warn("order_items insert:", itemsErr.message);
    }

    const { data: orderItemsWithNames } = await service
      .from("order_items")
      .select(
        `id, quantity, price_cents, special_instructions, menu_items (name)`,
      )
      .eq("order_id", order.id);

    const formattedItems = (orderItemsWithNames || []).map((item: { id: string; quantity: number; price_cents: number; special_instructions?: string; menu_items?: { name?: string } }) => ({
      id: item.id,
      name: item.menu_items?.name || "Menu Item",
      quantity: item.quantity,
      price_cents: item.price_cents,
      special_instructions: item.special_instructions,
    }));

    const parkingSpotCount = (restaurant as { curbside_spot_count?: number; parking_spot_count?: number })
      .parking_spot_count ?? (restaurant as { curbside_spot_count?: number }).curbside_spot_count ?? 6;

    let assignment: { id: string } | null = null;
    if (driverId) {
      const { data: ass, error: assignErr } = await service
        .from("order_assignments")
        .insert({
          order_id: order.id,
          driver_id: driverId,
          status: "pending",
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (!assignErr && ass) {
        assignment = ass;
      } else {
        console.warn("order_assignments insert (optional):", assignErr?.message);
      }
    }

    const notificationPayload = {
      type: "order_assignment",
      order_id: order.id,
      order_number: (order as { order_number?: string }).order_number,
      restaurant_name: (restaurant as { name?: string }).name || "Restaurant",
      restaurant_id: restaurant.id,
      store_type: storeType,
      assignment_id: assignment?.id ?? null,
      pickup_address: {
        name: (restaurant as { name?: string }).name,
        address: (restaurant as { address?: string }).address,
        city: (restaurant as { city?: string }).city,
        state: (restaurant as { state?: string }).state,
        zip_code: (restaurant as { zip_code?: string }).zip_code,
        latitude: (restaurant as { latitude?: number }).latitude,
        longitude: (restaurant as { longitude?: number }).longitude,
      },
      store_logo_url: (restaurant as { logo_url?: string; image_url?: string }).logo_url || (restaurant as { image_url?: string }).image_url,
      dropoff_address: delivery_address,
      customer_name: customerProfile?.full_name || "Test Customer",
      payout_cents: totalDriverPayCents,
      mileage_pay_cents: mileagePayCents,
      distance_km: distanceKm,
      distance_mi: (distanceKm * 0.621371).toFixed(1),
      expires_at: expiresAt,
      estimated_time: estimatedTime,
      isTestOrder: true,
      isMerchantTestOrder: true,
      items: formattedItems,
      subtotal_cents: subtotalCents,
      tip_cents: tipCents,
      parking_spot_count: parkingSpotCount,
    };

    return new Response(
      JSON.stringify({
        order,
        restaurant,
        notificationPayload,
        assignment: assignment ? { id: assignment.id } : null,
      }),
      { headers: jsonHeaders },
    );
  } catch (e) {
    console.error("create-merchant-test-order", e);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
