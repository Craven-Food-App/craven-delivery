import { normalizeReferralCode } from '@/lib/referralCodeGuards';

const STORAGE_KEY = 'craven_pending_referral_code';

/** Persist invite code from /r/:code until signup completes attribution. */
export function savePendingReferralCode(code: string) {
  const cleaned = normalizeReferralCode(code);
  if (!cleaned) return;
  try {
    localStorage.setItem(STORAGE_KEY, cleaned);
    sessionStorage.setItem(STORAGE_KEY, cleaned);
  } catch {
    // ignore storage failures
  }
}

export function getPendingReferralCode(): string | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem(STORAGE_KEY) ||
      null;
    const cleaned = normalizeReferralCode(raw);
    if (raw && !cleaned) {
      clearPendingReferralCode();
      return null;
    }
    return cleaned;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
