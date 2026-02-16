import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  evaluateFeederTier,
  getNextTier,
  FEEDER_TIERS,
  TIER_BADGE_STYLES,
  type FeederTierName,
  type TierRequirements,
} from '@/utils/ratingHelpers';

export interface FeederMetrics {
  rolling_rating: number;
  rolling_completion_rate: number;
  rolling_on_time_rate: number;
  rolling_cancel_rate: number;
  rolling_deliveries: number;
  total_deliveries: number;
  rating: number;
  has_fraud_flag: boolean;
}

export interface UseFeederTierResult {
  tier: FeederTierName;
  tierConfig: typeof FEEDER_TIERS[number];
  metrics: FeederMetrics;
  nextTier: TierRequirements | null;
  badgeStyle: typeof TIER_BADGE_STYLES[keyof typeof TIER_BADGE_STYLES];
  loading: boolean;
}

const DEFAULT_METRICS: FeederMetrics = {
  rolling_rating: 0,
  rolling_completion_rate: 0,
  rolling_on_time_rate: 0,
  rolling_cancel_rate: 0,
  rolling_deliveries: 0,
  total_deliveries: 0,
  rating: 0,
  has_fraud_flag: false,
};

export function useFeederTier(): UseFeederTierResult {
  const { data: user } = useQuery({
    queryKey: ['current-user-feeder'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['feeder-tier-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile, error } = await supabase
        .from('driver_profiles')
        .select('rolling_rating, rolling_completion_rate, rolling_on_time_rate, rolling_cancel_rate, rolling_deliveries, total_deliveries, rating, rating_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching feeder metrics:', error);
        return null;
      }

      return profile;
    },
    enabled: !!user?.id,
  });

  const metrics: FeederMetrics = data
    ? {
        rolling_rating: Number(data.rolling_rating) || 0,
        rolling_completion_rate: Number(data.rolling_completion_rate) || 0,
        rolling_on_time_rate: Number(data.rolling_on_time_rate) || 0,
        rolling_cancel_rate: Number(data.rolling_cancel_rate) || 0,
        rolling_deliveries: Number(data.rolling_deliveries) || 0,
        total_deliveries: Number(data.total_deliveries) || 0,
        rating: Number(data.rating) || 0,
        has_fraud_flag: false,
      }
    : DEFAULT_METRICS;

  const tier = evaluateFeederTier({
    totalDeliveries: metrics.rolling_deliveries || metrics.total_deliveries,
    averageRating: metrics.rolling_rating || metrics.rating,
    completionRate: metrics.rolling_completion_rate,
    onTimeRate: metrics.rolling_on_time_rate,
    cancellationRate: metrics.rolling_cancel_rate,
    hasFraudFlag: metrics.has_fraud_flag,
  });

  const tierConfig = FEEDER_TIERS.find(t => t.name === tier) || FEEDER_TIERS[FEEDER_TIERS.length - 1];
  const nextTier = getNextTier(tier);
  const badgeStyleKey = tier.toUpperCase() as keyof typeof TIER_BADGE_STYLES;
  const badgeStyle = TIER_BADGE_STYLES[badgeStyleKey] || TIER_BADGE_STYLES.FEEDER;

  return {
    tier,
    tierConfig,
    metrics,
    nextTier,
    badgeStyle,
    loading: isLoading,
  };
}
