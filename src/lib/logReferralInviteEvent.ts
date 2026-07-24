import { supabase } from '@/integrations/supabase/client';
import { isValidPersonalReferralCode } from '@/lib/referralCodeGuards';

export type ReferralInviteChannel =
  | 'email'
  | 'sms'
  | 'copy_link'
  | 'copy_code'
  | 'share'
  | 'landing_open';

/** Persist a share / open event for Refer & Earn tracking. */
export async function logReferralInviteEvent(args: {
  channel: ReferralInviteChannel;
  referralCode?: string | null;
  inviteeHint?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const code = (args.referralCode || '').trim().toUpperCase();
  if (code && !isValidPersonalReferralCode(code) && args.channel === 'landing_open') {
    return { ok: false as const, error: 'invalid_code' };
  }

  try {
    const { data, error } = await supabase.rpc('log_referral_invite_event', {
      p_channel: args.channel,
      p_referral_code: code || null,
      p_invitee_hint: args.inviteeHint || null,
      p_metadata: args.metadata || {},
    });

    if (error) {
      console.warn('log_referral_invite_event:', error.message);
      return { ok: false as const, error: error.message };
    }

    return (data || { ok: false }) as { ok: boolean; code?: string; error?: string };
  } catch (err: any) {
    console.warn('log_referral_invite_event:', err?.message);
    return { ok: false as const, error: err?.message || 'failed' };
  }
}
