import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'craven-hub:keep-signed-in';

export function keepSignedIn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setKeepSignedIn(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // A blocked storage write only costs the preference, not the session.
  }
}

/**
 * Supabase always persists sessions into the desktop session partition, so
 * "keep me signed in = off" is honored by clearing the stored session on the
 * next app launch. Must run before the app renders so route guards see the
 * final auth state.
 */
export async function enforceSessionPreference(): Promise<void> {
  if (keepSignedIn()) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Startup must continue even if the sign-out call fails.
  }
}
