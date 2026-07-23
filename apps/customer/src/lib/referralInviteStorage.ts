const STORAGE_KEY = 'craven_pending_referral_code';

/** Persist invite code from /r/:code until signup completes attribution. */
export function savePendingReferralCode(code: string) {
  const cleaned = (code || '').trim().toUpperCase();
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
    return (
      localStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem(STORAGE_KEY) ||
      null
    );
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
