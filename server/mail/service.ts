import { supabaseAdmin } from "../supabase-admin.js";
import type { MailboxConfig } from "./provider.js";
import { ICloudMailProvider } from "./icloud-provider.js";
import { assertMailCredentialsKeyConfigured, encryptSecret } from "./crypto.js";
import { sanitizeInboundHtml } from "./sanitize.js";

const provider = new ICloudMailProvider();

export async function listAllowedMailboxes(userId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("mailbox_permissions")
    .select("mailbox_id, can_read, can_reply, can_assign, can_archive, can_delete, role, mailboxes(id,display_name,email_address,provider,is_active,last_sync_at,last_sync_status,created_at,updated_at)")
    .eq("user_id", userId)
    .eq("can_read", true);
  if (error) throw error;
  return data ?? [];
}

export async function getMailboxById(mailboxId: string): Promise<MailboxConfig> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("mailboxes").select("*").eq("id", mailboxId).single();
  if (error) throw error;
  return data as MailboxConfig;
}

export async function canUserAccessMailbox(userId: string, mailboxId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("mailbox_permissions")
    .select("*")
    .eq("user_id", userId)
    .eq("mailbox_id", mailboxId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listThreads(params: {
  mailboxId: string;
  folder?: string;
  search?: string;
  unreadOnly?: boolean;
  assignedToMe?: boolean;
  userId: string;
  page: number;
  pageSize: number;
}) {
  const sb = supabaseAdmin();
  const folder = params.folder || "inbox";
  let q = sb.from("mail_threads").select("*", { count: "exact" }).eq("mailbox_id", params.mailboxId);

  if (folder === "archived") {
    q = q.eq("is_archived", true);
  } else if (folder === "trash") {
    q = q.eq("is_deleted", true);
  } else if (folder === "inbox" || folder === "sent") {
    const { data: threadIds, error: rpcError } = await sb.rpc("mail_thread_ids_for_folder", {
      p_mailbox_id: params.mailboxId,
      p_folder: folder,
    });
    if (rpcError) throw rpcError;
    const ids = (threadIds || []).filter(Boolean) as string[];
    if (ids.length === 0) return { data: [], count: 0 };
    q = q.in("id", ids);
  } else if (folder === "unread") {
    q = q.eq("is_archived", false).eq("is_deleted", false);
  } else {
    q = q.eq("is_archived", false).eq("is_deleted", false);
  }

  if (params.unreadOnly) q = q.gt("unread_count", 0);
  if (params.assignedToMe) q = q.eq("assigned_user_id", params.userId);
  if (params.search) q = q.or(`subject.ilike.%${params.search}%,participants_json::text.ilike.%${params.search}%`);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  const { data, error, count } = await q.order("last_message_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getThreadDetail(threadId: string) {
  const sb = supabaseAdmin();
  const [thread, messages, notes, activity] = await Promise.all([
    sb.from("mail_threads").select("*").eq("id", threadId).single(),
    sb.from("mail_messages").select("*").eq("thread_id", threadId).order("received_at", { ascending: true }),
    sb.from("mail_thread_notes").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }),
    sb.from("mail_thread_activity").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }),
  ]);
  if (thread.error) throw thread.error;
  return {
    thread: thread.data,
    messages: messages.data ?? [],
    notes: notes.data ?? [],
    activity: activity.data ?? [],
  };
}

export async function syncMailbox(mailboxId: string, userId?: string) {
  const sb = supabaseAdmin();
  const mailbox = await getMailboxById(mailboxId);
  const folders = ["INBOX", "Sent", "Archive", "Trash"];
  let processed = 0;
  const checkpoints = (mailbox as any).last_synced_uid_by_folder_json || {};
  const nextCheckpoints: Record<string, number> = { ...checkpoints };

  for (const folder of folders) {
    const sinceUid = Number(checkpoints[folder] || 0);
    const synced = await provider.syncFolder(mailbox, folder, { sinceUid });
    for (const msg of synced.messages) {
      const threadKey = msg.referencesHeader || msg.inReplyTo || (msg.subject || "no-subject").toLowerCase().replace(/^re:\s*/i, "");
      const { data: thread } = await sb
        .from("mail_threads")
        .upsert(
          {
            mailbox_id: mailboxId,
            thread_key: threadKey,
            subject: msg.subject || "(No subject)",
            participants_json: [msg.fromEmail, ...msg.to, ...msg.cc].filter(Boolean),
            last_message_at: msg.receivedAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "mailbox_id,thread_key" },
        )
        .select("*")
        .single();

      if (!thread) continue;

      const sanitizedHtml = sanitizeInboundHtml(msg.htmlBody);

      await sb.from("mail_messages").upsert(
        {
          mailbox_id: mailboxId,
          thread_id: thread.id,
          external_message_id: msg.externalMessageId,
          external_uid: msg.externalUid,
          in_reply_to: msg.inReplyTo,
          references_header: msg.referencesHeader,
          from_name: msg.fromName,
          from_email: msg.fromEmail,
          to_json: JSON.stringify(msg.to),
          cc_json: JSON.stringify(msg.cc),
          bcc_json: JSON.stringify(msg.bcc),
          subject: msg.subject,
          preview_text: msg.previewText,
          text_body: msg.textBody,
          html_body: sanitizedHtml,
          sent_at: msg.sentAt,
          received_at: msg.receivedAt,
          is_read: msg.isRead,
          is_inbound: true,
          is_outbound: false,
          folder_name: msg.folderName,
          has_attachments: msg.hasAttachments,
          raw_headers_json: JSON.stringify(msg.rawHeaders),
        },
        { onConflict: "mailbox_id,external_message_id,external_uid" },
      );
      const { data: insertedMessage } = await sb
        .from("mail_messages")
        .select("id")
        .eq("mailbox_id", mailboxId)
        .eq("external_message_id", msg.externalMessageId)
        .eq("external_uid", msg.externalUid)
        .single();

      if (insertedMessage?.id && msg.attachments?.length) {
        for (const attachment of msg.attachments) {
          const safeFileName = attachment.filename.replace(/[^\w.\-]/g, "_");
          const storagePath = `${mailboxId}/${insertedMessage.id}/${Date.now()}-${safeFileName}`;
          if (attachment.content) {
            await sb.storage.from("mail-attachments").upload(storagePath, attachment.content, {
              contentType: attachment.mimeType,
              upsert: false,
            });
          }
          await sb.from("mail_attachments").insert({
            message_id: insertedMessage.id,
            filename: attachment.filename,
            mime_type: attachment.mimeType,
            file_size: attachment.fileSize || 0,
            storage_path: storagePath,
            content_id: attachment.contentId || null,
          });
        }
      }
      processed += 1;
    }
    nextCheckpoints[folder] = Math.max(sinceUid, synced.maxUid || sinceUid);
  }

  await sb
    .from("mailboxes")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "ok",
      last_synced_uid_by_folder_json: nextCheckpoints,
    })
    .eq("id", mailboxId);
  if (userId) {
    const { data: touchedThread } = await sb
      .from("mail_threads")
      .select("id")
      .eq("mailbox_id", mailboxId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (touchedThread?.id) {
      await sb.from("mail_thread_activity").insert({
        thread_id: touchedThread.id,
        user_id: userId,
        activity_type: "manual_sync",
        activity_meta_json: { mailboxId, processed },
      });
    }
  }
  return { processed };
}

export async function sendReply(params: {
  threadId: string;
  mailboxId: string;
  bodyHtml?: string;
  bodyText?: string;
  cc?: string[];
  bcc?: string[];
  userId: string;
}) {
  const sb = supabaseAdmin();
  const mailbox = await getMailboxById(params.mailboxId);
  const { data: latest } = await sb
    .from("mail_messages")
    .select("*")
    .eq("thread_id", params.threadId)
    .order("received_at", { ascending: false })
    .limit(1)
    .single();
  if (!latest) throw new Error("Thread has no messages");
  const to = latest.from_email ? [latest.from_email] : [];
  const subject = latest.subject?.startsWith("Re:") ? latest.subject : `Re: ${latest.subject || ""}`.trim();
  const sent = await provider.sendMail({
    mailbox,
    to,
    cc: params.cc,
    bcc: params.bcc,
    subject,
    html: params.bodyHtml,
    text: params.bodyText,
    inReplyTo: latest.external_message_id,
    references: latest.references_header || latest.external_message_id,
  });

  await sb.from("mail_messages").insert({
    mailbox_id: params.mailboxId,
    thread_id: params.threadId,
    external_message_id: sent.messageId,
    external_uid: null,
    in_reply_to: latest.external_message_id,
    references_header: latest.references_header || latest.external_message_id,
    from_name: mailbox.email_address,
    from_email: mailbox.email_address,
    to_json: JSON.stringify(to),
    cc_json: JSON.stringify(params.cc || []),
    bcc_json: JSON.stringify(params.bcc || []),
    subject,
    preview_text: (params.bodyText || "").slice(0, 280),
    text_body: params.bodyText || null,
    html_body: params.bodyHtml || null,
    sent_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    is_read: true,
    is_inbound: false,
    is_outbound: true,
    folder_name: "Sent",
    has_attachments: false,
    raw_headers_json: {},
  });

  await sb
    .from("mail_threads")
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", params.threadId);
  await sb.from("mail_thread_activity").insert({
    thread_id: params.threadId,
    user_id: params.userId,
    activity_type: "reply",
    activity_meta_json: { mailboxId: params.mailboxId },
  });
}

export async function forwardMessage(params: {
  threadId: string;
  mailboxId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  bodyHtml?: string;
  bodyText?: string;
  userId: string;
}) {
  const sb = supabaseAdmin();
  const mailbox = await getMailboxById(params.mailboxId);
  const { data: latest } = await sb
    .from("mail_messages")
    .select("*")
    .eq("thread_id", params.threadId)
    .order("received_at", { ascending: false })
    .limit(1)
    .single();
  if (!latest) throw new Error("Thread has no messages");

  const subject = latest.subject?.startsWith("Fwd:") ? latest.subject : `Fwd: ${latest.subject || ""}`.trim();
  const sent = await provider.sendMail({
    mailbox,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject,
    html: params.bodyHtml,
    text: params.bodyText,
  });

  await sb.from("mail_messages").insert({
    mailbox_id: params.mailboxId,
    thread_id: params.threadId,
    external_message_id: sent.messageId,
    external_uid: null,
    from_name: mailbox.email_address,
    from_email: mailbox.email_address,
    to_json: JSON.stringify(params.to),
    cc_json: JSON.stringify(params.cc || []),
    bcc_json: JSON.stringify(params.bcc || []),
    subject,
    preview_text: (params.bodyText || "").slice(0, 280),
    text_body: params.bodyText || null,
    html_body: params.bodyHtml || null,
    sent_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    is_read: true,
    is_inbound: false,
    is_outbound: true,
    folder_name: "Sent",
    has_attachments: false,
    raw_headers_json: {},
  });

  await sb.from("mail_thread_activity").insert({
    thread_id: params.threadId,
    user_id: params.userId,
    activity_type: "forward",
    activity_meta_json: { mailboxId: params.mailboxId, recipients: params.to.length },
  });
}

export async function createMailbox(payload: any) {
  assertMailCredentialsKeyConfigured();
  const sb = supabaseAdmin();
  const encrypted = encryptSecret(payload.appPassword);
  const { data, error } = await sb
    .from("mailboxes")
    .insert({
      display_name: payload.displayName,
      email_address: payload.emailAddress,
      provider: "icloud",
      username: payload.username,
      encrypted_app_password: encrypted,
      imap_host: payload.imapHost,
      imap_port: payload.imapPort,
      imap_secure: payload.imapSecure,
      smtp_host: payload.smtpHost,
      smtp_port: payload.smtpPort,
      smtp_secure: payload.smtpSecure,
      is_active: payload.isActive ?? true,
      last_sync_status: "never",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMailbox(mailboxId: string, payload: any) {
  const sb = supabaseAdmin();
  const updateData: Record<string, unknown> = {
    display_name: payload.displayName,
    email_address: payload.emailAddress,
    username: payload.username,
    imap_host: payload.imapHost,
    imap_port: payload.imapPort,
    imap_secure: payload.imapSecure,
    smtp_host: payload.smtpHost,
    smtp_port: payload.smtpPort,
    smtp_secure: payload.smtpSecure,
    is_active: payload.isActive,
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.appPassword === "string" && payload.appPassword.trim().length > 0) {
    assertMailCredentialsKeyConfigured();
    updateData.encrypted_app_password = encryptSecret(payload.appPassword.trim());
  }

  const { data, error } = await sb
    .from("mailboxes")
    .update(updateData)
    .eq("id", mailboxId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getMailboxPermissions(mailboxId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("mailbox_permissions")
    .select("id, mailbox_id, user_id, role, can_read, can_reply, can_assign, can_archive, can_delete, updated_at")
    .eq("mailbox_id", mailboxId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertMailboxPermission(payload: {
  mailboxId: string;
  userId: string;
  role: string;
  canRead: boolean;
  canReply: boolean;
  canAssign: boolean;
  canArchive: boolean;
  canDelete: boolean;
}) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("mailbox_permissions")
    .upsert(
      {
        mailbox_id: payload.mailboxId,
        user_id: payload.userId,
        role: payload.role,
        can_read: payload.canRead,
        can_reply: payload.canReply,
        can_assign: payload.canAssign,
        can_archive: payload.canArchive,
        can_delete: payload.canDelete,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mailbox_id,user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
