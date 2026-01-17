import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMenuItemFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavorites();

    // Set up real-time subscription
    const subscription = supabase
      .channel('menu_item_favorites')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'menu_item_favorites' }, 
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
        .from('menu_item_favorites')
        .select('menu_item_id')
        .eq('customer_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(fav => fav.menu_item_id) || []);
    } catch (error) {
      console.error('Error fetching menu item favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (menuItemId: string) => {
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

      const isFavorite = favorites.includes(menuItemId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('menu_item_favorites')
          .delete()
          .eq('customer_id', user.id)
          .eq('menu_item_id', menuItemId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== menuItemId));
        toast({
          title: 'Removed from favorites',
          description: 'Menu item removed from your favorites'
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('menu_item_favorites')
          .insert({
            customer_id: user.id,
            menu_item_id: menuItemId
          });

        if (error) throw error;

        setFavorites(prev => [...prev, menuItemId]);
        toast({
          title: 'Added to favorites',
          description: 'Menu item added to your favorites'
        });
      }
    } catch (error) {
      console.error('Error toggling menu item favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive'
      });
    }
  };

  const isFavorite = (menuItemId: string) => favorites.includes(menuItemId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite
  };
};