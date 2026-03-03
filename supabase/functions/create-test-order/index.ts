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
    const orderType: string = (body.orderType as string) || "restaurant";
    
    // Randomize distance: 1-3 miles ($0.67-$2.00 mileage pay cap)
    const distanceMiles = Math.random() * 2 + 1; // 1-3 miles
    const distanceKm: number = Number(body.distanceKm ?? (distanceMiles / 0.621371)); // Convert to km
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

    // Pick a specific restaurant for testing:
    // - "restaurant" orders use CMIH Kitchen (driver delivery flow)
    // - "retail" orders use Crave'n Stylz (retail driver flow)
    let restaurantQuery = service
      .from("restaurants")
      .select("*")
      .eq("is_active", true);

    if (orderType === "retail") {
      restaurantQuery = restaurantQuery.eq("name", "Crave'n Stylz");
    } else {
      // Default: restaurant flow
      restaurantQuery = restaurantQuery.eq("name", "CMIH Kitchen");
    }

    const { data: restaurant, error: restErr } = await restaurantQuery
      .limit(1)
      .maybeSingle();

    if (restErr) {
      console.error("Restaurant lookup failed:", restErr.message);
      return new Response(JSON.stringify({ error: "Restaurant lookup failed" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!restaurant) {
      return new Response(JSON.stringify({ error: "Required test restaurant not found" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    const estimatedTime = Math.ceil(distanceKm * 3);

    // Derive store type for driver flows:
    // - "retail" test orders should always drive the retail pickup flow
    // - restaurant orders fall back to restaurant.restaurant_type, if present
    const storeType: string | null =
      orderType === "retail"
        ? "retail_store"
        : (restaurant as any).restaurant_type ?? null;

    // Get real customer profile data
    const { data: customerProfile } = await service
      .from("user_profiles")
      .select("full_name, phone, email")
      .eq("user_id", callerId)
      .maybeSingle();

    // Get real delivery address for customer
    const { data: deliveryAddresses } = await service
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", callerId)
      .order("is_default", { ascending: false })
      .limit(1);

    // Use real customer address if available, otherwise create realistic address near restaurant
    let delivery_address: any;
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
        latitude: addr.latitude || (restaurant.latitude ? restaurant.latitude + (Math.random() - 0.5) * 0.01 : 41.6528),
        longitude: addr.longitude || (restaurant.longitude ? restaurant.longitude + (Math.random() - 0.5) * 0.01 : -83.5555),
        address: `${addr.street_address}${addr.apt_suite ? `, ${addr.apt_suite}` : ''}, ${addr.city}, ${addr.state} ${addr.zip_code}`,
      };
    } else {
      // Create realistic address near restaurant
      const streetNumbers = ["123", "456", "789", "234", "567", "890"];
      const streetNames = ["Main St", "Oak Ave", "Elm St", "Park Ave", "Maple Dr", "Cedar Ln"];
      const randomStreet = `${streetNumbers[Math.floor(Math.random() * streetNumbers.length)]} ${streetNames[Math.floor(Math.random() * streetNames.length)]}`;
      
      delivery_address = {
        name: customerProfile?.full_name || "Customer",
        street: randomStreet,
        city: restaurant.city || "Test City",
        state: restaurant.state || "TS",
        zip: restaurant.zip_code || "12345",
        zip_code: restaurant.zip_code || "12345",
        apt_suite: null,
        latitude: restaurant.latitude ? restaurant.latitude + (Math.random() - 0.5) * 0.01 : 41.6528,
        longitude: restaurant.longitude ? restaurant.longitude + (Math.random() - 0.5) * 0.01 : -83.5555,
        address: `${randomStreet}, ${restaurant.city || "Test City"}, ${restaurant.state || "TS"} ${restaurant.zip_code || "12345"}`,
      };
    }

    // Fetch menu items from restaurant to create realistic order items
    const { data: menuItems, error: menuItemsErr } = await service
      .from("menu_items")
      .select("id, name, price_cents, description")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .limit(10); // Get up to 10 items to have more variety

    let orderItems: any[] = [];
    let subtotalCents = 0;

    // Create realistic order items from menu items
    if (menuItems && menuItems.length > 0) {
      // Randomly select 2-4 items for a more realistic order
      const numItems = Math.min(Math.floor(Math.random() * 3) + 2, menuItems.length);
      
      // Shuffle and select random items
      const shuffled = [...menuItems].sort(() => Math.random() - 0.5);
      const selectedItems = shuffled.slice(0, numItems);
      
      orderItems = selectedItems.map((item: any) => {
        // More realistic quantities: 1-3, with 1 being most common
        const quantityOptions = [1, 1, 1, 2, 2, 3]; // Weighted towards 1
        const quantity = quantityOptions[Math.floor(Math.random() * quantityOptions.length)];
        const itemTotal = item.price_cents * quantity;
        subtotalCents += itemTotal;
        
        // Occasionally add special instructions (20% chance)
        const specialInstructions = Math.random() > 0.8 
          ? ["No onions", "Extra sauce", "Well done", "Light on spices"][Math.floor(Math.random() * 4)]
          : null;
        
        return {
          menu_item_id: item.id,
          quantity: quantity,
          price_cents: item.price_cents,
          special_instructions: specialInstructions,
        };
      });
    } else {
      // Fallback: create realistic test items if no menu items exist
      const fallbackItems = [
        { name: "Burger", price: 1299 },
        { name: "Fries", price: 599 },
        { name: "Drink", price: 299 },
      ];
      const numItems = Math.floor(Math.random() * 2) + 2; // 2-3 items
      const selected = fallbackItems.slice(0, numItems);
      
      orderItems = selected.map((item) => {
        const quantity = Math.floor(Math.random() * 2) + 1;
        subtotalCents += item.price * quantity;
        return {
          menu_item_id: null,
          quantity: quantity,
          price_cents: item.price,
          special_instructions: null,
        };
      });
    }

    const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
    // Randomize tip: 10-25%
    const tipPercentage = Math.random() * 0.15 + 0.10; // 10-25%
    const tipCents = Math.round(subtotalCents * tipPercentage);
    const totalCents = subtotalCents + taxCents + tipCents;

    // Calculate mileage pay: $0.67 per mile (IRS standard rate)
    const distanceMilesActual = distanceKm * 0.621371;
    const mileagePayCents = Math.round(distanceMilesActual * 67); // $0.67 per mile = 67 cents
    
    // Test orders pay $5 base + mileage
    const basePayCents = 500; // $5.00 base
    const totalDriverPayCents = basePayCents + mileagePayCents;

    // Create order as delivered (immediately complete for test orders)
    const { data: order, error: orderErr } = await service
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_id: callerId,
        driver_id: driverId,
        is_test: true,
        order_status: "delivered", // Mark as delivered immediately to trigger mileage accumulation
        total_cents: totalCents,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        tip_cents: tipCents,
        delivery_fee_cents: 0,
        mileage_pay_cents: mileagePayCents,
        distance_km: distanceKm, // Set distance_km so it shows in earnings
        delivery_address,
        customer_name: customerProfile?.full_name || "Test Customer",
        customer_phone: customerProfile?.phone || null,
        pickup_address: {
          name: restaurant.name || "Restaurant",
          street: restaurant.address || restaurant.street_address || "Restaurant Address",
          city: restaurant.city || "City",
          state: restaurant.state || "ST",
          zip: restaurant.zip_code || "00000",
          zip_code: restaurant.zip_code || "00000",
          latitude: restaurant.latitude || 41.6528,
          longitude: restaurant.longitude || -83.5555,
          address: restaurant.address || `${restaurant.street_address || "Restaurant Address"}, ${restaurant.city || "City"}, ${restaurant.state || "ST"} ${restaurant.zip_code || "00000"}`,
          phone: restaurant.phone || null,
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

    // Create order items
    if (orderItems.length > 0) {
      const orderItemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price_cents: item.price_cents,
        special_instructions: item.special_instructions,
      }));

      const { error: itemsErr } = await service
        .from("order_items")
        .insert(orderItemsToInsert);

      if (itemsErr) {
        console.warn("Failed to create order items:", itemsErr.message);
        // Non-fatal - order is created, items just won't be detailed
      }
    }

    // Create driver_earnings record immediately for test orders
    // This ensures earnings show up right away without needing to complete the order flow
    const { error: earningsErr } = await service
      .from("driver_earnings")
      .insert({
        driver_id: driverId,
        order_id: order.id,
        amount_cents: basePayCents, // $5 base pay
        tip_cents: tipCents,
        total_cents: totalDriverPayCents, // $5 + mileage
        payout_cents: totalDriverPayCents,
      });

    if (earningsErr) {
      console.error("Failed to create driver_earnings:", earningsErr.message);
      // Non-fatal but log it
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

    // Fetch order items with menu item names for notification payload
    const { data: orderItemsWithNames } = await service
      .from("order_items")
      .select(`
        id,
        quantity,
        price_cents,
        special_instructions,
        menu_items (
          name
        )
      `)
      .eq("order_id", order.id);

    // Format items for notification payload
    const formattedItems = (orderItemsWithNames || []).map((item: any) => ({
      id: item.id,
      name: item.menu_items?.name || "Menu Item",
      quantity: item.quantity,
      price_cents: item.price_cents,
      special_instructions: item.special_instructions,
    }));

    // Test orders pay $5 base + mileage as compensation for participation
    const payoutCents = totalDriverPayCents; // $5.00 + mileage

    const notificationPayload = {
      type: "order_assignment",
      assignment_id: assignment.id,
      order_id: order.id,
      restaurant_name: restaurant.name || "Test Restaurant",
      restaurant_id: restaurant.id,
      store_type: storeType,
      pickup_address: {
        name: restaurant.name || "Restaurant",
        street: restaurant.address || restaurant.street_address || "Restaurant Address",
        city: restaurant.city || "City",
        state: restaurant.state || "ST",
        zip: restaurant.zip_code || "12345",
        zip_code: restaurant.zip_code || "12345",
        latitude: restaurant.latitude || 41.6528,
        longitude: restaurant.longitude || -83.5555,
        address: restaurant.address || `${restaurant.street_address || "Restaurant Address"}, ${restaurant.city || "City"}, ${restaurant.state || "ST"} ${restaurant.zip_code || "12345"}`,
        phone: restaurant.phone || null,
      },
      dropoff_address: delivery_address,
      customer_name: customerProfile?.full_name || "Test Customer",
      payout_cents: payoutCents,
      mileage_pay_cents: mileagePayCents,
      distance_km: distanceKm,
      distance_mi: (distanceKm * 0.621371).toFixed(1),
      expires_at: expiresAt,
      estimated_time: estimatedTime,
      isTestOrder: true,
      items: formattedItems, // Include order items in payload
      subtotal_cents: subtotalCents,
      tip_cents: tipCents,
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