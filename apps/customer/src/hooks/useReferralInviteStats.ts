import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralInviteStats {
  shares: number;
  landingOpens: number;
  signups: number;
  qualified: number;
}

const EMPTY: ReferralInviteStats = {
  shares: 0,
  landingOpens: 0,
  signups: 0,
  qualified: 0,
};

export function useReferralInviteStats() {
  const [stats, setStats] = useState<ReferralInviteStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStats(EMPTY);
        return;
      }

      const { data, error } = await supabase.rpc('get_my_referral_invite_stats', {
        p_user_id: user.id,
      });

      if (error) {
        console.warn('get_my_referral_invite_stats:', error.message);
        setStats(EMPTY);
        return;
      }

      const payload = (data || {}) as {
        ok?: boolean;
        shares?: number;
        landing_opens?: number;
        signups?: number;
        qualified?: number;
      };

      if (payload.ok === false) {
        setStats(EMPTY);
        return;
      }

      setStats({
        shares: Number(payload.shares || 0),
        landingOpens: Number(payload.landing_opens || 0),
        signups: Number(payload.signups || 0),
        qualified: Number(payload.qualified || 0),
      });
    } catch (err) {
      console.warn('useReferralInviteStats:', err);
      setStats(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

/** Rank ladder for Refer & Earn — progress without gimmicks. */
export function inviteRankFromQualified(qualified: number): {
  rank: string;
  nextAt: number | null;
  progressToNext: number;
} {
  const tiers = [
    { rank: 'Rookie', at: 0 },
    { rank: 'Contender', at: 1 },
    { rank: 'Established', at: 3 },
    { rank: 'Veteran', at: 5 },
    { rank: 'Apex', at: 10 },
  ];

  let current = tiers[0];
  for (const t of tiers) {
    if (qualified >= t.at) current = t;
  }

  const idx = tiers.findIndex((t) => t.rank === current.rank);
  const next = idx < tiers.length - 1 ? tiers[idx + 1] : null;
  if (!next) {
    return { rank: current.rank, nextAt: null, progressToNext: 100 };
  }

  const span = next.at - current.at;
  const progressToNext =
    span <= 0 ? 100 : Math.min(100, Math.round(((qualified - current.at) / span) * 100));

  return { rank: current.rank, nextAt: next.at, progressToNext };
}
