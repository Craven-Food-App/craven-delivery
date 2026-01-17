import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDiamondPoints = () => {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiamondPoints();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('diamond_points')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'diamond_points_history' },
        () => {
          fetchDiamondPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDiamondPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('driver_profiles')
        .select('diamond_points')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setPoints(data?.diamond_points || 0);
    } catch (error) {
      console.error('Error fetching diamond points:', error);
    } finally {
      setLoading(false);
    }
  };

  return { points, loading };
};

