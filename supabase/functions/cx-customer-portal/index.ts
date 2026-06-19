import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({ restaurant_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

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

    const { data: rest } = await admin
      .from("restaurants")
      .select("id, owner_id, cx_stripe_customer_id")
      .eq("id", parsed.data.restaurant_id)
      .maybeSingle();
    if (!rest) return json({ error: "Restaurant not found" }, 404);
    if (rest.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!rest.cx_stripe_customer_id) return json({ error: "No Stripe customer on file yet. Start a subscription first." }, 400);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") ?? "https://cravenusa.com";
    const portal = await stripe.billingPortal.sessions.create({
      customer: rest.cx_stripe_customer_id,
      return_url: `${origin}/merchant-portal?tab=settings`,
    });
    return json({ url: portal.url });
  } catch (e: any) {
    return json({ error: e?.message ?? "Portal failed" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}