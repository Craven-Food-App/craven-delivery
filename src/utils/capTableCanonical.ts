import { supabase } from '@/integrations/supabase/client';
import { TORRANCE_EMAIL } from '@/utils/torranceAccess';

/** Single display labels for the founder row (matches cap table UI). */
export const FOUNDER_CEO_LABEL = 'Founder CEO';
export const FOUNDER_BOARD_ROLES_LINE = 'Secretary · Board Chair · Director';

/** Canonical founder equity is shown as a single row; ledger grants for this user are excluded from executive lines. */
export async function fetchTorranceUserId(): Promise<string | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('email', TORRANCE_EMAIL.toLowerCase())
    .maybeSingle();
  return data?.user_id ?? null;
}
