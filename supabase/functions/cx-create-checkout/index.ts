import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  restaurant_id: z.string().uuid(),
  plan_slug: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Stripe not configured" }, 500);
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid body" }, 400);
    const { restaurant_id, plan_slug } = parsed.data;

    // Verify caller owns this courier restaurant
    const { data: rest } = await admin
      .from("restaurants")
      .select("id, owner_id, name, business_type, cx_stripe_customer_id, contact_email, email")
      .eq("id", restaurant_id)
      .maybeSingle();
    if (!rest) return json({ error: "Restaurant not found" }, 404);
    if (rest.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (rest.business_type !== "courier_service") {
      return json({ error: "Only courier merchants can subscribe to CX" }, 400);
    }

    // Pick plan
    let plan: any;
    if (plan_slug) {
      const { data } = await admin.from("cx_subscription_plans").select("*").eq("slug", plan_slug).maybeSingle();
      plan = data;
    } else {
      const { data } = await admin
        .from("cx_subscription_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      plan = data;
    }
    if (!plan?.stripe_price_id) {
      return json({ error: "No Stripe price configured for this plan. Ask an admin to set stripe_price_id on cx_subscription_plans." }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Reuse or create Stripe customer
    let customerId = rest.cx_stripe_customer_id as string | null;
    if (!customerId) {
      const email = (rest.contact_email as string) || (rest.email as string) || user.email!;
      const cust = await stripe.customers.create({
        email,
        name: rest.name as string,
        metadata: { restaurant_id, owner_user_id: user.id, cx: "true" },
      });
      customerId = cust.id;
      await admin.from("restaurants").update({ cx_stripe_customer_id: customerId }).eq("id", restaurant_id);
    }

    const origin = req.headers.get("origin") ?? "https://cravenusa.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/merchant-portal?tab=settings&cx_billing=success`,
      cancel_url: `${origin}/merchant-portal?tab=settings&cx_billing=cancelled`,
      subscription_data: { metadata: { restaurant_id, plan_id: plan.id } },
      metadata: { restaurant_id, plan_id: plan.id },
    });

    return json({ url: session.url });
  } catch (e: any) {
    return json({ error: e?.message ?? "Checkout failed" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}