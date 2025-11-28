import { encode as encodeBase64Url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AddressList = string | string[];

export interface GoogleWorkspaceAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface GoogleWorkspaceEmailOptions {
  to: AddressList;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: AddressList;
  bcc?: AddressList;
  attachments?: GoogleWorkspaceAttachment[];
  headers?: Record<string, string>;
}

export interface GoogleWorkspaceConfig {
  serviceAccountEmail: string;
  privateKey: string;
  delegatedUser: string;
  defaultFrom: string;
  executiveFrom?: string;
  treasuryFrom?: string;
  scope?: string;
}

interface CachedAccessToken {
  token: string;
  expiresAt: number;
}

interface CachedConfig {
  config: GoogleWorkspaceConfig;
  expiresAt: number;
}

const textEncoder = new TextEncoder();

let cachedToken: CachedAccessToken | null = null;
let cachedConfig: CachedConfig | null = null;
let cachedPrivateKey: { pem: string; promise: Promise<CryptoKey> } | null = null;

const DEFAULT_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

function coerceAddressList(value?: AddressList): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(", ") : value;
}

function base64EncodeString(input: string): string {
  const bytes = textEncoder.encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  return encodeBase64Url(bytes.buffer as ArrayBuffer);
}

function normalizePrivateKey(pem: string): string {
  return pem.replace(/\\n/g, "\n");
}

function pemToUint8Array(pem: string): Uint8Array {
  const normalized = normalizePrivateKey(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function collectEnvConfig(): Partial<GoogleWorkspaceConfig> {
  return {
    serviceAccountEmail: Deno.env.get("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL") ?? undefined,
    privateKey: Deno.env.get("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_PRIVATE_KEY") ?? undefined,
    delegatedUser: Deno.env.get("GOOGLE_WORKSPACE_DELEGATED_USER") ?? undefined,
    defaultFrom: Deno.env.get("GOOGLE_WORKSPACE_DEFAULT_FROM") ?? undefined,
    executiveFrom: Deno.env.get("GOOGLE_WORKSPACE_EXECUTIVE_FROM") ?? undefined,
    treasuryFrom: Deno.env.get("GOOGLE_WORKSPACE_TREASURY_FROM") ?? undefined,
    scope: Deno.env.get("GOOGLE_WORKSPACE_GMAIL_SCOPE") ?? undefined,
  };
}

function hasRequiredFields(config: Partial<GoogleWorkspaceConfig>): config is GoogleWorkspaceConfig {
  return Boolean(
    config.serviceAccountEmail?.trim() &&
      config.privateKey?.trim() &&
      config.delegatedUser?.trim() &&
      config.defaultFrom?.trim(),
  );
}

async function fetchConfigFromDatabase(): Promise<Partial<GoogleWorkspaceConfig>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured for Google Workspace email.");
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabaseClient
    .from("ceo_system_settings")
    .select("setting_value")
    .eq("setting_key", "google_workspace_email")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Google Workspace configuration: ${error.message}`);
  }

  if (!data?.setting_value) {
    return {};
  }

  const value = data.setting_value as Record<string, unknown>;

  return {
    serviceAccountEmail: typeof value.serviceAccountEmail === "string" ? value.serviceAccountEmail : undefined,
    privateKey: typeof value.privateKey === "string" ? value.privateKey : undefined,
    delegatedUser: typeof value.delegatedUser === "string" ? value.delegatedUser : undefined,
    defaultFrom: typeof value.defaultFrom === "string" ? value.defaultFrom : undefined,
    executiveFrom: typeof value.executiveFrom === "string" ? value.executiveFrom : undefined,
    treasuryFrom: typeof value.treasuryFrom === "string" ? value.treasuryFrom : undefined,
    scope: typeof value.scope === "string" ? value.scope : undefined,
  };
}

export async function getGoogleWorkspaceConfig(): Promise<GoogleWorkspaceConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.config;
  }

  const envConfig = collectEnvConfig();

  if (hasRequiredFields(envConfig)) {
    cachedConfig = {
      config: { ...envConfig, scope: envConfig.scope || DEFAULT_SCOPE },
      expiresAt: now + CONFIG_CACHE_TTL_MS,
    };
    return cachedConfig.config;
  }

  const dbConfig = await fetchConfigFromDatabase();
  const merged: Partial<GoogleWorkspaceConfig> = { ...dbConfig, ...envConfig };

  if (!hasRequiredFields(merged)) {
    throw new Error("Google Workspace email configuration is incomplete. Please configure it in the admin portal.");
  }

  const completeConfig: GoogleWorkspaceConfig = {
    serviceAccountEmail: merged.serviceAccountEmail.trim(),
    privateKey: merged.privateKey.trim(),
    delegatedUser: merged.delegatedUser.trim(),
    defaultFrom: merged.defaultFrom.trim(),
    executiveFrom: merged.executiveFrom?.trim() || undefined,
    treasuryFrom: merged.treasuryFrom?.trim() || undefined,
    scope: (merged.scope?.trim() || DEFAULT_SCOPE),
  };

  cachedConfig = {
    config: completeConfig,
    expiresAt: now + CONFIG_CACHE_TTL_MS,
  };

  // reset token and private key cache when configuration changes
  cachedToken = null;
  cachedPrivateKey = null;

  return completeConfig;
}

async function importPrivateKey(): Promise<CryptoKey> {
  const config = await getGoogleWorkspaceConfig();

  if (cachedPrivateKey && cachedPrivateKey.pem === config.privateKey) {
    return cachedPrivateKey.promise;
  }

  const keyData = pemToUint8Array(config.privateKey);

  const promise = crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  cachedPrivateKey = {
    pem: config.privateKey,
    promise,
  };

  return promise;
}

function encodeSubject(subject: string): string {
  if (!subject) return "";
  const encoded = base64EncodeString(subject);
  return `=?UTF-8?B?${encoded}?=`;
}

function chunkString(value: string, size = 76): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

function randomBoundary(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildMimeMessage(options: Required<Pick<GoogleWorkspaceEmailOptions, "to" | "subject" | "html">> &
  Omit<GoogleWorkspaceEmailOptions, "to" | "subject" | "html"> &
  { from: string }): string {
  const lines: string[] = [];

  lines.push(`From: ${options.from}`);
  lines.push(`To: ${coerceAddressList(options.to)}`);

  const cc = coerceAddressList(options.cc);
  if (cc) lines.push(`Cc: ${cc}`);

  const bcc = coerceAddressList(options.bcc);
  if (bcc) lines.push(`Bcc: ${bcc}`);

  if (options.replyTo) {
    lines.push(`Reply-To: ${options.replyTo}`);
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (!key) continue;
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push(`Subject: ${encodeSubject(options.subject)}`);
  lines.push("MIME-Version: 1.0");

  const attachments = options.attachments ?? [];

  if (attachments.length === 0) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(options.html);
  } else {
    const boundary = randomBoundary();
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");

    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(options.html);
    lines.push("");

    for (const attachment of attachments) {
      lines.push(`--${boundary}`);
      const contentType = attachment.contentType ?? "application/octet-stream";
      lines.push(`Content-Type: ${contentType}; name="${attachment.filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      chunkString(attachment.content).forEach((chunk) => lines.push(chunk));
      lines.push("");
    }

    lines.push(`--${boundary}--`);
  }

  return lines.join("\r\n");
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const config = await getGoogleWorkspaceConfig();

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: config.serviceAccountEmail,
    scope: config.scope || DEFAULT_SCOPE,
    aud: TOKEN_ENDPOINT,
    sub: config.delegatedUser,
    iat,
    exp,
  };

  const headerSegment = base64UrlEncodeBytes(textEncoder.encode(JSON.stringify(header)));
  const claimSegment = base64UrlEncodeBytes(textEncoder.encode(JSON.stringify(claimSet)));
  const unsignedJwt = `${headerSegment}.${claimSegment}`;

  const key = await importPrivateKey();

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      textEncoder.encode(unsignedJwt),
    ),
  );

  const signedJwt = `${unsignedJwt}.${base64UrlEncodeBytes(signature)}`;

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!tokenResponse.ok) {
    const message = await tokenResponse.text();
    throw new Error(`Failed to obtain Google Workspace access token: ${tokenResponse.status} ${message}`);
  }

  const tokenJson = await tokenResponse.json() as { access_token: string; expires_in: number };

  cachedToken = {
    token: tokenJson.access_token,
    expiresAt: now + (tokenJson.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export async function sendGoogleWorkspaceEmail(options: GoogleWorkspaceEmailOptions): Promise<{ id: string; threadId?: string }> {
  const config = await getGoogleWorkspaceConfig();

  const from = options.from ?? config.defaultFrom;

  const mimeMessage = buildMimeMessage({
    ...options,
    from,
  });

  const raw = base64UrlEncodeBytes(textEncoder.encode(mimeMessage));

  const accessToken = await getAccessToken();

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(config.delegatedUser)}/messages/send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Workspace email send failed: ${response.status} ${errorText}`);
  }

  const json = await response.json() as { id: string; threadId?: string };
  return json;
}

