export interface MailboxConfig {
  id: string;
  email_address: string;
  username: string;
  encrypted_app_password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
}

export interface ParsedMailMessage {
  externalMessageId: string;
  externalUid: string;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject?: string | null;
  previewText?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  isRead: boolean;
  folderName: string;
  hasAttachments: boolean;
  rawHeaders: Record<string, string>;
  attachments: Array<{
    filename: string;
    mimeType: string;
    fileSize: number;
    contentId?: string | null;
    content?: Buffer;
  }>;
}

export interface SendMailInput {
  mailbox: MailboxConfig;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string;
}

export interface MailProvider {
  connect(mailbox: MailboxConfig): Promise<void>;
  syncFolder(
    mailbox: MailboxConfig,
    folderName: string,
    options?: { since?: Date; sinceUid?: number },
  ): Promise<{ messages: ParsedMailMessage[]; maxUid: number }>;
  sendMail(input: SendMailInput): Promise<{ messageId: string }>;
  testConnection(mailbox: MailboxConfig): Promise<void>;
}
