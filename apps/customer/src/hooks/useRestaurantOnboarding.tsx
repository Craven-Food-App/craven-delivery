import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingProgress {
  business_info_verified: boolean;
  business_verified_at: string | null;
  menu_preparation_status: 'not_started' | 'in_progress' | 'ready';
  menu_ready_at: string | null;
  tablet_shipped: boolean;
  tablet_shipped_at: string | null;
  tablet_delivered_at: string | null;
  tablet_preparing_shipment: boolean;
  tablet_preparing_at: string | null;
  tablet_tracking_number: string | null;
  tablet_shipping_carrier: string | null;
  tablet_shipping_label_url: string | null;
  go_live_ready: boolean;
  admin_notes: string | null;
}

interface ReadinessData {
  score: number;
  ready: boolean;
  blockers: string[];
  missing_items: string[];
  estimated_go_live: string;
  details: {
    menu_score: number;
    menu_items_count: number;
    has_logo: boolean;
    has_header: boolean;
    business_verified: boolean;
    banking_complete: boolean;
    hours_set: boolean;
  };
}

export const useRestaurantOnboarding = (restaurantId: string | undefined) => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOnboardingProgress = async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from('restaurant_onboarding_progress')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) throw error;
      setProgress(data);
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    }
  };

  const calculateReadiness = async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase.functions.invoke('calculate-restaurant-readiness', {
        body: { restaurant_id: restaurantId }
      });

      if (error) throw error;
      setReadiness(data);
    } catch (error) {
      console.error('Error calculating readiness:', error);
      toast({
        title: "Error",
        description: "Failed to calculate readiness score",
        variant: "destructive"
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOnboardingProgress(),
      calculateReadiness()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();

    if (!restaurantId) return;

    // Subscribe to real-time updates for onboarding progress
    const progressChannel = supabase
      .channel('onboarding-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_onboarding_progress',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for restaurant table changes
    const restaurantChannel = supabase
      .channel('restaurant-changes-readiness')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${restaurantId}`
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to menu_items changes to recalculate when items are added
    const menuChannel = supabase
      .channel('menu-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(restaurantChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [restaurantId]);

  return {
    progress,
    readiness,
    loading,
    refreshData
  };
};
