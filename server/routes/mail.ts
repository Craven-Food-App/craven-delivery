import { Router } from "express";
import { z } from "zod";
import { getAuthContext } from "../auth.js";
import {
  canUserAccessMailbox,
  createMailbox,
  getMailboxById,
  getMailboxPermissions,
  getThreadDetail,
  listAllowedMailboxes,
  listThreads,
  sendReply,
  syncMailbox,
  upsertMailboxPermission,
  forwardMessage,
  updateMailbox,
} from "../mail/service.js";
import { ICloudMailProvider } from "../mail/icloud-provider.js";
import { assertMailCredentialsKeyConfigured } from "../mail/crypto.js";

const r = Router();
const provider = new ICloudMailProvider();

async function requireAuth(req: any, res: any) {
  const auth = await getAuthContext(req);
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return auth;
}

r.get("/mailboxes", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const rows = await listAllowedMailboxes(auth.userId);
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load mailboxes" });
  }
});

r.get("/threads", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const schema = z.object({
      mailboxId: z.string().uuid(),
      folder: z.string().optional(),
      search: z.string().optional(),
      unreadOnly: z.coerce.boolean().optional(),
      assignedToMe: z.coerce.boolean().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(25),
    });
    const query = schema.parse(req.query);
    const permission = await canUserAccessMailbox(auth.userId, query.mailboxId);
    if (!permission?.can_read) return res.status(403).json({ error: "Permission denied" });
    const result = await listThreads({ ...query, userId: auth.userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load threads" });
  }
});

r.get("/threads/:threadId", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const schema = z.object({ threadId: z.string().uuid() });
    const { threadId } = schema.parse(req.params);
    const detail = await getThreadDetail(threadId);
    const permission = await canUserAccessMailbox(auth.userId, detail.thread.mailbox_id);
    if (!permission?.can_read) return res.status(403).json({ error: "Permission denied" });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load thread" });
  }
});

r.post("/threads/:threadId/reply", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z
      .object({
        mailboxId: z.string().uuid(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
      })
      .parse(req.body);
    const permission = await canUserAccessMailbox(auth.userId, body.mailboxId);
    if (!permission?.can_reply) return res.status(403).json({ error: "Permission denied" });
    await sendReply({
      threadId: req.params.threadId,
      mailboxId: body.mailboxId,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      cc: body.cc,
      bcc: body.bcc,
      userId: auth.userId,
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send reply" });
  }
});

r.post("/threads/:threadId/forward", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z
      .object({
        mailboxId: z.string().uuid(),
        to: z.array(z.string().email()).min(1),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
      })
      .parse(req.body);
    const permission = await canUserAccessMailbox(auth.userId, body.mailboxId);
    if (!permission?.can_reply) return res.status(403).json({ error: "Permission denied" });
    await forwardMessage({
      threadId: req.params.threadId,
      mailboxId: body.mailboxId,
      to: body.to,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      cc: body.cc,
      bcc: body.bcc,
      userId: auth.userId,
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to forward" });
  }
});

r.post("/threads/:threadId/assign", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z.object({ mailboxId: z.string().uuid(), assignedUserId: z.string().uuid() }).parse(req.body);
    const permission = await canUserAccessMailbox(auth.userId, body.mailboxId);
    if (!permission?.can_assign) return res.status(403).json({ error: "Permission denied" });
    const sb = (await import("../supabase-admin.js")).supabaseAdmin();
    await sb.from("mail_threads").update({ assigned_user_id: body.assignedUserId }).eq("id", req.params.threadId);
    await sb.from("mail_thread_activity").insert({
      thread_id: req.params.threadId,
      user_id: auth.userId,
      activity_type: "assign",
      activity_meta_json: { assignedUserId: body.assignedUserId },
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to assign thread" });
  }
});

r.post("/threads/:threadId/note", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z.object({ note: z.string().min(1) }).parse(req.body);
    const sb = (await import("../supabase-admin.js")).supabaseAdmin();
    await sb.from("mail_thread_notes").insert({ thread_id: req.params.threadId, user_id: auth.userId, note: body.note });
    await sb.from("mail_thread_activity").insert({
      thread_id: req.params.threadId,
      user_id: auth.userId,
      activity_type: "note",
      activity_meta_json: { noteLength: body.note.length },
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add note" });
  }
});

for (const [path, fields, activityType] of [
  ["/threads/:threadId/archive", { is_archived: true }, "archive"],
  ["/threads/:threadId/delete", { is_deleted: true }, "delete"],
  ["/threads/:threadId/mark-read", { unread_count: 0 }, "mark_read"],
  ["/threads/:threadId/mark-unread", { unread_count: 1 }, "mark_unread"],
] as const) {
  r.post(path, async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const sb = (await import("../supabase-admin.js")).supabaseAdmin();
      await sb.from("mail_threads").update(fields).eq("id", req.params.threadId);
      await sb.from("mail_thread_activity").insert({
        thread_id: req.params.threadId,
        user_id: auth.userId,
        activity_type: activityType,
        activity_meta_json: {},
      });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Action failed" });
    }
  });
}

r.post("/mailboxes/:mailboxId/manual-sync", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const permission = await canUserAccessMailbox(auth.userId, req.params.mailboxId);
    if (!permission?.can_read) return res.status(403).json({ error: "Permission denied" });
    const result = await syncMailbox(req.params.mailboxId, auth.userId);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Sync failed" });
  }
});

r.post("/mailboxes", async (req, res) => {
  try {
    assertMailCredentialsKeyConfigured();
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z
      .object({
        displayName: z.string().min(1),
        emailAddress: z.string().email(),
        username: z.string().email(),
        appPassword: z.string().min(8),
        imapHost: z.string().default("imap.mail.me.com"),
        imapPort: z.number().default(993),
        imapSecure: z.boolean().default(true),
        smtpHost: z.string().default("smtp.mail.me.com"),
        smtpPort: z.number().default(587),
        smtpSecure: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);
    const mailbox = await createMailbox(body);
    res.json({ data: mailbox });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create mailbox" });
  }
});

r.patch("/mailboxes/:mailboxId", async (req, res) => {
  try {
    assertMailCredentialsKeyConfigured();
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z
      .object({
        displayName: z.string().min(1),
        emailAddress: z.string().email(),
        username: z.string().email(),
        appPassword: z.string().min(8).optional(),
        imapHost: z.string().default("imap.mail.me.com"),
        imapPort: z.number().default(993),
        imapSecure: z.boolean().default(true),
        smtpHost: z.string().default("smtp.mail.me.com"),
        smtpPort: z.number().default(587),
        smtpSecure: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);
    const mailbox = await updateMailbox(req.params.mailboxId, body);
    res.json({ data: mailbox });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update mailbox" });
  }
});

r.post("/mailboxes/:mailboxId/test-connection", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const mailbox = await getMailboxById(req.params.mailboxId);
    await provider.testConnection(mailbox);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Connection test failed" });
  }
});

r.get("/mailboxes/:mailboxId/permissions", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const rows = await getMailboxPermissions(req.params.mailboxId);
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch mailbox permissions" });
  }
});

r.post("/mailboxes/:mailboxId/permissions", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = z
      .object({
        userId: z.string().uuid(),
        role: z.string().min(1),
        canRead: z.boolean(),
        canReply: z.boolean(),
        canAssign: z.boolean(),
        canArchive: z.boolean(),
        canDelete: z.boolean(),
      })
      .parse(req.body);
    const result = await upsertMailboxPermission({
      mailboxId: req.params.mailboxId,
      ...body,
    });
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update mailbox permission" });
  }
});

r.get("/attachments/:attachmentId/download-url", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const sb = (await import("../supabase-admin.js")).supabaseAdmin();
    const { data: attachment, error } = await sb
      .from("mail_attachments")
      .select("id, storage_path, message_id, mail_messages!inner(mailbox_id)")
      .eq("id", req.params.attachmentId)
      .single();
    if (error || !attachment) return res.status(404).json({ error: "Attachment not found" });

    const mailboxId = (attachment as any).mail_messages.mailbox_id;
    const permission = await canUserAccessMailbox(auth.userId, mailboxId);
    if (!permission?.can_read) return res.status(403).json({ error: "Permission denied" });

    const signed = await sb.storage.from("mail-attachments").createSignedUrl((attachment as any).storage_path, 60 * 10);
    if (signed.error || !signed.data) throw signed.error || new Error("Unable to sign URL");
    res.json({ data: signed.data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate download URL" });
  }
});

export default r;
