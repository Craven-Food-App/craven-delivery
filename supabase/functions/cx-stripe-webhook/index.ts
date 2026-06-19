import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

// NOTE: Stripe webhooks must NOT require JWT. This function runs with verify_jwt=false.
// Signature verification done in-code using STRIPE_WEBHOOK_SECRET.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("CX_STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e: any) {
    return new Response(`Bad signature: ${e?.message ?? "unknown"}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = (session.metadata as any)?.restaurant_id;
        const planId = (session.metadata as any)?.plan_id;
        if (restaurantId && session.subscription) {
          await admin.from("restaurants").update({
            cx_stripe_subscription_id: session.subscription as string,
            cx_stripe_customer_id: session.customer as string,
            cx_plan_id: planId ?? null,
            cx_subscription_status: "active",
          }).eq("id", restaurantId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const restaurantId = (sub.metadata as any)?.restaurant_id;
        if (!restaurantId) break;
        await admin.from("restaurants").update({
          cx_stripe_subscription_id: sub.id,
          cx_subscription_status: sub.status,
          cx_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", restaurantId);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          await admin
            .from("restaurants")
            .update({ cx_subscription_status: "past_due" })
            .eq("cx_stripe_subscription_id", inv.subscription as string);
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(`Handler error: ${e?.message ?? "unknown"}`, { status: 500 });
  }
});