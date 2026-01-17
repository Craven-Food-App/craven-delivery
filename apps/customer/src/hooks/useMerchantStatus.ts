import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMerchantStatusReturn {
  isMerchant: boolean;
  merchantLoading: boolean;
  error: string | null;
}

export const useMerchantStatus = (userId: string | null): UseMerchantStatusReturn => {
  const [isMerchant, setIsMerchant] = useState(false);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMerchantStatus = async () => {
      if (!userId) {
        setIsMerchant(false);
        setError(null);
        return;
      }

      try {
        setMerchantLoading(true);
        setError(null);
        
        // Check if user has any restaurants (is a restaurant owner)
        const { data: restaurants, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', userId)
          .limit(1);

        if (restaurantError) {
          console.error('Error checking restaurant ownership:', restaurantError);
          setError('Failed to check restaurant ownership');
          setIsMerchant(false);
          return;
        }

        // Also check user profile role
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking user profile:', profileError);
          // Don't set error for profile check failure, just log it
        }

        // User is a merchant if they own restaurants OR have restaurant_owner role
        const hasRestaurants = restaurants && restaurants.length > 0;
        const hasRestaurantRole = profile?.role === 'restaurant_owner';
        
        setIsMerchant(hasRestaurants || hasRestaurantRole);
      } catch (err) {
        console.error('Error checking merchant status:', err);
        setError('Failed to check merchant status');
        setIsMerchant(false);
      } finally {
        setMerchantLoading(false);
      }
    };

    checkMerchantStatus();
  }, [userId]);

  return { isMerchant, merchantLoading, error };
};
