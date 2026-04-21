import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { decryptSecret } from "./crypto.js";
import type { MailProvider, MailboxConfig, ParsedMailMessage, SendMailInput } from "./provider.js";

const DEFAULT_SYNC_LIMIT = 50;

function formatAddressList(input: any): string[] {
  if (!input?.value || !Array.isArray(input.value)) {
    return [];
  }

  return input.value.map((entry: any) => entry?.address).filter(Boolean);
}

export class ICloudMailProvider implements MailProvider {
  async connect(mailbox: MailboxConfig): Promise<void> {
    const client = new ImapFlow({
      host: mailbox.imap_host,
      port: mailbox.imap_port,
      secure: mailbox.imap_secure,
      auth: {
        user: mailbox.username,
        pass: decryptSecret(mailbox.encrypted_app_password),
      },
    });

    await client.connect();
    await client.logout();
  }

  async syncFolder(
    mailbox: MailboxConfig,
    folderName: string,
    options?: { since?: Date; sinceUid?: number },
  ): Promise<{ messages: ParsedMailMessage[]; maxUid: number }> {
    const client = new ImapFlow({
      host: mailbox.imap_host,
      port: mailbox.imap_port,
      secure: mailbox.imap_secure,
      auth: {
        user: mailbox.username,
        pass: decryptSecret(mailbox.encrypted_app_password),
      },
    });

    await client.connect();
    await client.mailboxOpen(folderName);

    const fetchRange =
      options?.sinceUid && options.sinceUid > 0
        ? `${options.sinceUid + 1}:*`
        : `${Math.max(1, client.mailbox.exists - DEFAULT_SYNC_LIMIT + 1)}:*`;
    const messages: ParsedMailMessage[] = [];
    let maxUid = options?.sinceUid || 0;

    for await (const msg of client.fetch(fetchRange, { uid: true, envelope: true, source: true, flags: true, internalDate: true })) {
      if (!msg.source || !msg.envelope) continue;
      const parsed = await simpleParser(msg.source);
      const messageId = parsed.messageId || msg.envelope.messageId || `uid-${msg.uid}`;
      maxUid = Math.max(maxUid, Number(msg.uid || 0));

      messages.push({
        externalMessageId: messageId,
        externalUid: String(msg.uid),
        inReplyTo: parsed.inReplyTo || null,
        referencesHeader: Array.isArray(parsed.references) ? parsed.references.join(" ") : (parsed.references as string | undefined) || null,
        fromName: parsed.from?.value?.[0]?.name || null,
        fromEmail: parsed.from?.value?.[0]?.address || null,
        to: formatAddressList(parsed.to),
        cc: formatAddressList(parsed.cc),
        bcc: formatAddressList(parsed.bcc),
        subject: parsed.subject || null,
        previewText: parsed.text?.slice(0, 280) || null,
        textBody: parsed.text || null,
        htmlBody: typeof parsed.html === "string" ? parsed.html : null,
        sentAt: parsed.date ? parsed.date.toISOString() : null,
        receivedAt: msg.internalDate ? msg.internalDate.toISOString() : null,
        isRead: Boolean(msg.flags?.has("\\Seen")),
        folderName,
        hasAttachments: Boolean(parsed.attachments?.length),
        rawHeaders: Object.fromEntries(parsed.headers.entries()).reduce(
          (acc, [key, value]) => ({ ...acc, [String(key)]: String(value) }),
          {} as Record<string, string>,
        ),
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename || "attachment",
          mimeType: a.contentType || "application/octet-stream",
          fileSize: a.size || 0,
          contentId: a.cid || null,
          content: Buffer.isBuffer(a.content) ? a.content : undefined,
        })),
      });
    }

    await client.logout();
    return { messages, maxUid };
  }

  async sendMail(input: SendMailInput): Promise<{ messageId: string }> {
    const transport = nodemailer.createTransport({
      host: input.mailbox.smtp_host,
      port: input.mailbox.smtp_port,
      secure: input.mailbox.smtp_secure,
      auth: {
        user: input.mailbox.username,
        pass: decryptSecret(input.mailbox.encrypted_app_password),
      },
      requireTLS: !input.mailbox.smtp_secure,
    });

    const result = await transport.sendMail({
      from: input.mailbox.email_address,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
      inReplyTo: input.inReplyTo,
      references: input.references,
    });

    return { messageId: result.messageId };
  }

  async testConnection(mailbox: MailboxConfig): Promise<void> {
    await this.connect(mailbox);
    const transport = nodemailer.createTransport({
      host: mailbox.smtp_host,
      port: mailbox.smtp_port,
      secure: mailbox.smtp_secure,
      auth: {
        user: mailbox.username,
        pass: decryptSecret(mailbox.encrypted_app_password),
      },
      requireTLS: !mailbox.smtp_secure,
    });

    await transport.verify();
  }
}
