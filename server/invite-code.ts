import crypto from "crypto";

function chunk(str: string, size: number): string[] {
  return str.match(new RegExp(`.{1,${size}}`, "g")) || [];
}

export function generateInviteCode(): string {
  // 6 bytes => 12 hex chars, chunked into CRV-XXXX-XXXX-XXXX format
  const raw = crypto.randomBytes(6).toString("hex").toUpperCase(); // 12 chars
  const parts = chunk(raw, 4);
  return `CRV-${parts[0]}-${parts[1]}-${parts[2]}`;
}

