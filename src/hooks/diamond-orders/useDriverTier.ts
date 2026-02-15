import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RatingTier } from '@/types/diamond-orders';
import { evaluateFeederTier } from '@/utils/ratingHelpers';

export const useDriverTier = () => {
  const [tier, setTier] = useState<RatingTier>('Feeder');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverTier();
  }, []);

  const fetchDriverTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('driver_profiles')
        .select('rating, total_deliveries')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching driver tier:', error);
        setTier('Feeder');
        setLoading(false);
        return;
      }

      const totalDeliveries = profile.total_deliveries || 0;
      const rating = profile.rating || 0;

      // Get order stats for completion/on-time rates
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_status')
        .eq('assigned_craver_id', user.id);

      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter(o => o.order_status === 'delivered').length || 0;
      const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
      const onTimeRate = totalDeliveries > 0 ? Math.max(0, Math.min(100, rating * 20)) : 0;

      // Use centralized evaluator — single source of truth
      const evaluatedTier = evaluateFeederTier({
        totalDeliveries,
        averageRating: rating,
        completionRate,
        onTimeRate,
        cancellationRate: totalOrders > 0 ? 100 - completionRate : 0,
        hasFraudFlag: false,
      });

      console.log('Driver tier evaluated:', evaluatedTier, 'deliveries:', totalDeliveries, 'rating:', rating);
      setTier(evaluatedTier as RatingTier);
    } catch (error) {
      console.error('Error fetching driver tier:', error);
      setTier('Feeder');
    } finally {
      setLoading(false);
    }
  };

  return { tier, isDiamond: tier === 'Diamond' || tier === 'Ultimate', loading };
};
