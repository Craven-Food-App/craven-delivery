import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavorites();

    // Set up real-time subscription
    const subscription = supabase
      .channel('customer_favorites')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customer_favorites' }, 
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customer_favorites')
        .select('restaurant_id')
        .eq('customer_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(fav => fav.restaurant_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save favorites',
          variant: 'destructive'
        });
        return;
      }

      const isFavorite = favorites.includes(restaurantId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('customer_favorites')
          .delete()
          .eq('customer_id', user.id)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== restaurantId));
        toast({
          title: 'Removed from favorites',
          description: 'Restaurant removed from your favorites'
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('customer_favorites')
          .insert({
            customer_id: user.id,
            restaurant_id: restaurantId
          });

        if (error) throw error;

        setFavorites(prev => [...prev, restaurantId]);
        toast({
          title: 'Added to favorites',
          description: 'Restaurant added to your favorites'
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive'
      });
    }
  };

  const isFavorite = (restaurantId: string) => favorites.includes(restaurantId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite
  };
};