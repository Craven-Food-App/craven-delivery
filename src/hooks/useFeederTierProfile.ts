import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RatingTier } from '@/types/diamond-orders';
import { getTierConfig, getNextTier, TIER_PERKS } from '@/utils/ratingHelpers';

interface TierHistoryEntry {
  id: string;
  old_tier: RatingTier;
  new_tier: RatingTier;
  reason: string | null;
  created_at: string;
}

interface TierMetrics {
  rolling_rating: number;
  rolling_completion_rate: number;
  rolling_on_time_rate: number;
  rolling_cancel_rate: number;
  rolling_deliveries: number;
}

interface NextTierProgress {
  nextTier: RatingTier | null;
  nextTierConfig: ReturnType<typeof getTierConfig> | null;
  requirements: Array<{
    label: string;
    current: number;
    required: number;
    met: boolean;
    unit: string;
  }>;
}

export interface FeederTierProfile {
  tier: RatingTier;
  tierConfig: ReturnType<typeof getTierConfig>;
  metrics: TierMetrics;
  progress: NextTierProgress;
  perks: string[];
  nextPerks: string[];
  history: TierHistoryEntry[];
  graceActive: boolean;
  loading: boolean;
}

export const useFeederTierProfile = (): FeederTierProfile => {
  const [tier, setTier] = useState<RatingTier>('Feeder');
  const [metrics, setMetrics] = useState<TierMetrics>({
    rolling_rating: 0,
    rolling_completion_rate: 0,
    rolling_on_time_rate: 0,
    rolling_cancel_rate: 0,
    rolling_deliveries: 0,
  });
  const [history, setHistory] = useState<TierHistoryEntry[]>([]);
  const [graceActive, setGraceActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch profile and history in parallel
      const [profileResult, historyResult] = await Promise.all([
        supabase
          .from('driver_profiles')
          .select('tier_status, rolling_rating, rolling_completion_rate, rolling_on_time_rate, rolling_cancel_rate, rolling_deliveries, tier_grace_period_start')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('tier_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (profileResult.data) {
        const p = profileResult.data;
        setTier((p.tier_status as RatingTier) || 'Feeder');
        setMetrics({
          rolling_rating: p.rolling_rating || 0,
          rolling_completion_rate: p.rolling_completion_rate || 0,
          rolling_on_time_rate: p.rolling_on_time_rate || 0,
          rolling_cancel_rate: p.rolling_cancel_rate || 0,
          rolling_deliveries: p.rolling_deliveries || 0,
        });
        setGraceActive(!!p.tier_grace_period_start);
      }

      if (historyResult.data) {
        setHistory(historyResult.data as unknown as TierHistoryEntry[]);
      }
    } catch (error) {
      console.error('Error fetching tier profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const tierConfig = getTierConfig(tier);
  const nextTierKey = getNextTier(tier);
  const nextTierConfig = nextTierKey ? getTierConfig(nextTierKey) : null;

  const requirements = nextTierConfig ? [
    { label: 'Deliveries', current: metrics.rolling_deliveries, required: nextTierConfig.minDeliveries, met: metrics.rolling_deliveries >= nextTierConfig.minDeliveries, unit: '' },
    { label: 'Rating', current: metrics.rolling_rating, required: nextTierConfig.minRating, met: metrics.rolling_rating >= nextTierConfig.minRating, unit: '/5.00' },
    { label: 'Completion', current: metrics.rolling_completion_rate, required: nextTierConfig.minCompletion, met: metrics.rolling_completion_rate >= nextTierConfig.minCompletion, unit: '%' },
    { label: 'On-Time', current: metrics.rolling_on_time_rate, required: nextTierConfig.minOnTime, met: metrics.rolling_on_time_rate >= nextTierConfig.minOnTime, unit: '%' },
    { label: 'Cancellation', current: metrics.rolling_cancel_rate, required: nextTierConfig.maxCancel, met: metrics.rolling_cancel_rate < nextTierConfig.maxCancel, unit: '% (max)' },
  ] : [];

  const progress: NextTierProgress = {
    nextTier: nextTierKey,
    nextTierConfig,
    requirements,
  };

  return {
    tier,
    tierConfig,
    metrics,
    progress,
    perks: TIER_PERKS[tier] || [],
    nextPerks: nextTierKey ? TIER_PERKS[nextTierKey] || [] : [],
    history,
    graceActive,
    loading,
  };
};
