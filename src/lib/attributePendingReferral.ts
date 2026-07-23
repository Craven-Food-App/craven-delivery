import { supabase } from '@/integrations/supabase/client';
import {
  clearPendingReferralCode,
  getPendingReferralCode,
} from '@/lib/referralInviteStorage';

/** After signup, attribute pending invite code to this user (idempotent). */
export async function attributePendingReferralIfAny(userId?: string) {
  const code = getPendingReferralCode();
  if (!code) return { ok: false, skipped: true };

  const { data: { user } } = await supabase.auth.getUser();
  const uid = userId || user?.id;
  if (!uid) return { ok: false, error: 'no_user' };

  const { data, error } = await supabase.rpc('attribute_customer_referral', {
    p_referral_code: code,
    p_referred_id: uid,
  });

  if (error) {
    console.warn('attribute_customer_referral:', error.message);
    return { ok: false, error: error.message };
  }

  if ((data as any)?.ok) {
    clearPendingReferralCode();
  }

  return data as { ok: boolean; error?: string; referral_id?: string };
}
