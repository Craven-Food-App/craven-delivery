import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RatingTier } from '@/types/diamond-orders';

const TIER_ORDER: RatingTier[] = ['Feeder', 'Gold', 'Platinum', 'Diamond', 'Ultimate'];
const DISPATCH_WEIGHTS: Record<RatingTier, number> = {
  Feeder: 0, Gold: 5, Platinum: 10, Diamond: 18, Ultimate: 30,
};

export const useDriverTier = () => {
  const [tier, setTier] = useState<RatingTier>('Feeder');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverTier();
  }, []);

  const fetchDriverTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('driver_profiles')
        .select('tier_status, rating_tier')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching driver tier:', error);
        setTier('Feeder');
        setLoading(false);
        return;
      }

      // Use tier_status (new) with fallback to rating_tier (legacy)
      const tierValue = (data?.tier_status as RatingTier) || (data?.rating_tier as RatingTier) || 'Feeder';
      setTier(tierValue);
    } catch (error) {
      console.error('Error fetching driver tier:', error);
      setTier('Feeder');
    } finally {
      setLoading(false);
    }
  };

  const tierIndex = TIER_ORDER.indexOf(tier);

  return {
    tier,
    dispatchWeight: DISPATCH_WEIGHTS[tier],
    isUltimate: tier === 'Ultimate',
    isDiamond: tier === 'Diamond' || tier === 'Ultimate',
    isAtLeastDiamond: tierIndex >= TIER_ORDER.indexOf('Diamond'),
    isAtLeastPlatinum: tierIndex >= TIER_ORDER.indexOf('Platinum'),
    isAtLeastGold: tierIndex >= TIER_ORDER.indexOf('Gold'),
    loading,
  };
};
