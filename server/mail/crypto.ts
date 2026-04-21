import crypto from "crypto";
import { env } from "../env.js";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!env.MAIL_CREDENTIALS_KEY) {
    const detail =
      env.NODE_ENV === "production"
        ? "Missing required mail encryption configuration."
        : "Configuration error: MAIL_CREDENTIALS_KEY is missing. Add MAIL_CREDENTIALS_KEY=<long-random-secret> to backend .env and restart the server.";
    throw new Error(detail);
  }

  return crypto.createHash("sha256").update(env.MAIL_CREDENTIALS_KEY).digest();
}

export function assertMailCredentialsKeyConfigured(): void {
  getKey();
}

export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivBase64, tagBase64, encryptedBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
