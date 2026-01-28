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
      
      try {
        // Get invite details
        const { data: invite, error: inviteError } = await sb
          .from("invites")
          .select("*")
          .eq("id", inviteId)
          .single();

        if (inviteError || !invite) {
          console.error("Invite not found for webhook:", inviteId);
          return res.status(404).json({ error: "Invite not found" });
        }

        // Prevent duplicate processing
        if (invite.status === "paid") {
          console.log("Invite already processed:", inviteId);
          return res.json({ received: true, message: "Already processed" });
        }

        const amountCents = session.amount_total || 0;
        const contributorEmail = invite.email;
        const contributorName = invite.full_name || contributorEmail;

        // Calculate tier and shares
        const { data: tierData, error: tierError } = await sb.rpc(
          "calculate_foundational_tier",
          { p_amount_cents: amountCents }
        );

        if (tierError || !tierData) {
          console.error("Error calculating tier:", tierError);
          // Still mark invite as paid, but log error
          await sb
            .from("invites")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_amount_cents: amountCents,
            })
            .eq("id", inviteId);
          return res.status(500).json({ 
            error: "Failed to calculate tier",
            received: true 
          });
        }

        const tierInfo = tierData as {
          equity_percentage: number;
          tier_name: string;
          shares: number;
        };

        // Create contribution order
        const { data: contributionOrder, error: orderError } = await sb
          .from("contribution_orders")
          .insert({
            invite_id: inviteId,
            contributor_email: contributorEmail,
            contributor_name: contributorName,
            amount_cents: amountCents,
            shares_promised: tierInfo.shares,
            tier_name: tierInfo.tier_name,
            equity_percentage: tierInfo.equity_percentage,
            payment_status: "paid",
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string | null,
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (orderError || !contributionOrder) {
          console.error("Error creating contribution order:", orderError);
          // Still mark invite as paid
          await sb
            .from("invites")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_amount_cents: amountCents,
            })
            .eq("id", inviteId);
          return res.status(500).json({ 
            error: "Failed to create contribution order",
            received: true 
          });
        }

        // Issue equity from micro-equity pool (atomic operation)
        const { data: issuanceResult, error: issuanceError } = await sb.rpc(
          "issue_micro_equity_from_pool",
          {
            p_contribution_order_id: contributionOrder.id,
            p_contributor_email: contributorEmail,
            p_contributor_name: contributorName,
            p_shares_promised: tierInfo.shares,
          }
        );

        if (issuanceError || !issuanceResult?.success) {
          console.error("Error issuing equity:", issuanceError, issuanceResult);
          // This is critical - equity issuance failed
          // Mark contribution order as failed for manual review
          await sb
            .from("contribution_orders")
            .update({
              payment_status: "failed",
            })
            .eq("id", contributionOrder.id);
          
          // Still mark invite as paid (payment succeeded)
          await sb
            .from("invites")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_amount_cents: amountCents,
            })
            .eq("id", inviteId);

          return res.status(500).json({ 
            error: "Payment processed but equity issuance failed",
            contribution_order_id: contributionOrder.id,
            received: true 
          });
        }

        // Success: Mark invite as paid
        await sb
          .from("invites")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount_cents: amountCents,
          })
          .eq("id", inviteId);

        // Generate documentation layer (4 PDFs) via Supabase Edge Function
        try {
          const { data: docsResult, error: docsError } = await sb.functions.invoke(
            "foundational-generate-docs",
            {
              body: {
                contribution_order_id: contributionOrder.id,
                equity_issuance_id: issuanceResult.issuance_id ?? null,
                contributor_id: contributionOrder.contributor_id ?? null,
                contributor_name: contributorName,
                contributor_email: contributorEmail,
                amount_cents: amountCents,
                shares_issued: tierInfo.shares,
                tier_name: tierInfo.tier_name,
                pool_code: "family_micro_equity_pool",
              },
            }
          );

          if (docsError || !docsResult?.ok) {
            console.error("Error generating foundational documents:", docsError || docsResult);
          } else {
            console.log("Foundational documents generated:", docsResult.docs);
          }
        } catch (docErr) {
          console.error("Unexpected error during foundational document generation:", docErr);
        }

        console.log("Successfully processed contribution, issued equity, and triggered docs:", {
          inviteId,
          contributionOrderId: contributionOrder.id,
          issuanceId: issuanceResult.issuance_id,
          shares: tierInfo.shares,
        });

      } catch (error: any) {
        console.error("Error processing webhook:", error);
        // Mark invite as paid even if equity issuance fails
        // Admin can manually review and fix
        await sb
          .from("invites")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount_cents: session.amount_total || 0,
          })
          .eq("id", inviteId);
        
        return res.status(500).json({ 
          error: "Error processing contribution",
          received: true 
        });
      }
    }
  }

  return res.json({ received: true });
});

export default r;

