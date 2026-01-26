import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase-admin.js";
import Stripe from "stripe";

const r = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Verify access code and get invite
r.post("/verify-access", async (req, res) => {
  try {
    const body = z.object({
      accessCode: z.string(),
      email: z.string().email(),
    }).parse(req.body);

    const sb = supabaseAdmin();
    const { data: invite, error } = await sb
      .from("invites")
      .select("*")
      .eq("access_code", body.accessCode.toUpperCase())
      .eq("email", body.email.trim().toLowerCase())
      .single();

    if (error || !invite) {
      return res.status(404).json({ error: "Invalid access code or email." });
    }

    if (invite.status === "revoked") {
      return res.status(403).json({ error: "This invite has been revoked." });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(403).json({ error: "This invite has expired." });
    }

    if (invite.status === "paid") {
      return res.status(403).json({ error: "This invite has already been used." });
    }

    // Mark as accepted if not already
    if (invite.status === "invited") {
      await sb
        .from("invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
    }

    // Return invite info (without sensitive data)
    return res.json({
      invite: {
        id: invite.id,
        min_amount_cents: invite.min_amount_cents,
        max_amount_cents: invite.max_amount_cents,
        email: invite.email,
        full_name: invite.full_name,
      },
    });
  } catch (e: any) {
    console.error("Error verifying access:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request." });
    }
    return res.status(500).json({ error: "Unable to verify access." });
  }
});

// Create Stripe Checkout session for allocation
r.post("/create-checkout", async (req, res) => {
  try {
    const body = z.object({
      inviteId: z.string().uuid(),
      amountCents: z.number().int().min(5000).max(50000),
      email: z.string().email(),
    }).parse(req.body);

    // Verify invite exists and is valid
    const sb = supabaseAdmin();
    const { data: invite, error: inviteError } = await sb
      .from("invites")
      .select("*")
      .eq("id", body.inviteId)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: "Invite not found." });
    }

    if (invite.status === "revoked" || invite.status === "paid") {
      return res.status(403).json({ error: "This invite is no longer valid." });
    }

    if (body.amountCents < invite.min_amount_cents || body.amountCents > invite.max_amount_cents) {
      return res.status(400).json({ 
        error: `Amount must be between $${(invite.min_amount_cents / 100).toFixed(2)} and $${(invite.max_amount_cents / 100).toFixed(2)}.` 
      });
    }

    // Create Stripe Checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.ORIGIN || "https://cravenusa.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Foundational Support",
              description: "Friends & Family Support Contribution",
            },
            unit_amount: body.amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&invite_id=${body.inviteId}`,
      cancel_url: `${appUrl}/allocate?invite_id=${body.inviteId}`,
      customer_email: body.email,
      metadata: {
        invite_id: body.inviteId,
        type: "foundational_support",
      },
    });

    return res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (e: any) {
    console.error("Error creating checkout:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request." });
    }
    return res.status(500).json({ error: "Unable to create checkout session." });
  }
});

// Webhook handler for Stripe (to mark invite as paid)
// Note: This route must use raw body parsing (configured in server/index.ts)
r.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: "Webhook secret not configured." });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const inviteId = session.metadata?.invite_id;

    if (inviteId) {
      const sb = supabaseAdmin();
      await sb
        .from("invites")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_amount_cents: session.amount_total || 0,
        })
        .eq("id", inviteId);
    }
  }

  return res.json({ received: true });
});

export default r;

