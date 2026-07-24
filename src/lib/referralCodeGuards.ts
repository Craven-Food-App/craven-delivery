/** Known placeholder / marketing codes that must never be treated as personal invites. */
export const PLACEHOLDER_REFERRAL_CODES = new Set(['CRAVEN10', 'CRAVE10']);

export function isValidPersonalReferralCode(code: string | null | undefined): boolean {
  const cleaned = (code || '').trim().toUpperCase();
  if (!cleaned) return false;
  if (PLACEHOLDER_REFERRAL_CODES.has(cleaned)) return false;
  return true;
}

export function normalizeReferralCode(code: string | null | undefined): string | null {
  const cleaned = (code || '').trim().toUpperCase();
  if (!isValidPersonalReferralCode(cleaned)) return null;
  return cleaned;
}
