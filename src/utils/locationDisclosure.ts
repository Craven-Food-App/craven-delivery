export const LOCATION_DISCLOSURE_KEY = 'craven_location_disclosure_v1';

export function hasLocationDisclosureConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOCATION_DISCLOSURE_KEY) === 'true';
  } catch {
    return false;
  }
}
