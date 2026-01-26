import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase-admin.js";
import { generateInviteCode } from "../invite-code.js";

const r = Router();

// Helper to check if user is admin (Torrance or admin role)
async function assertHubAdmin(req: any): Promise<void> {
  // For now, we'll use a simple check - in production, verify session/auth
  // Torrance has universal access per user rules
  const authHeader = req.headers.authorization;
  
  // TODO: Implement proper session/auth verification
  // For MVP, we'll allow if service role is used or if we add session verification
  // This should be replaced with actual auth check
  return;
}

// Create invite
r.post("/create", async (req, res) => {
  try {
    await assertHubAdmin(req);

    const body = z.object({
      email: z.string().email(),
      fullName: z.string().optional(),
      relationshipNote: z.string().optional(),
      expiresAt: z.string().optional(),
    }).parse(req.body);

    const email = body.email.trim().toLowerCase();
    const accessCode = generateInviteCode();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("invites")
      .insert({
        access_code: accessCode,
        email,
        full_name: body.fullName?.trim() || null,
        relationship_note: body.relationshipNote?.trim() || null,
        status: "invited",
        min_amount_cents: 5000,
        max_amount_cents: 50000,
        expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
      })
      .select("id, access_code, email, status, created_at")
      .single();

    if (error) {
      console.error("Error creating invite:", error);
      return res.status(500).json({ error: "Unable to create invite." });
    }

    return res.json({ invite: data });
  } catch (e: any) {
    console.error("Error in create invite:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request." });
    }
    return res.status(401).json({ error: "Unauthorized." });
  }
});

// List invites
r.get("/list", async (req, res) => {
  try {
    await assertHubAdmin(req);
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("invites")
      .select("id, access_code, email, full_name, status, accepted_at, paid_at, paid_amount_cents, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error listing invites:", error);
      return res.status(500).json({ error: "Unable to load invites." });
    }

    return res.json({ invites: data || [] });
  } catch (e: any) {
    console.error("Error in list invites:", e);
    return res.status(401).json({ error: "Unauthorized." });
  }
});

// Revoke invite
r.post("/revoke", async (req, res) => {
  try {
    await assertHubAdmin(req);

    const body = z.object({
      id: z.string().uuid(),
    }).parse(req.body);

    const sb = supabaseAdmin();
    const { error } = await sb
      .from("invites")
      .update({ status: "revoked" })
      .eq("id", body.id);

    if (error) {
      console.error("Error revoking invite:", error);
      return res.status(500).json({ error: "Unable to revoke invite." });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("Error in revoke invite:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Missing invite id." });
    }
    return res.status(401).json({ error: "Unauthorized." });
  }
});

export default r;

