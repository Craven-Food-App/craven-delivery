import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  setup_deadline: string | null;
  logo_url: string | null;
  header_image_url: string | null;
  instagram_handle: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  business_verified_at: string | null;
  merchant_welcome_shown: boolean;
  restaurant_type: string | null;
}

export const useRestaurantSelector = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    const fetchRestaurants = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, description, business_verified_at, merchant_welcome_shown, restaurant_type')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Fetched restaurants for user:', user.id, 'data:', data);
        setRestaurants(data || []);

        // Load selected restaurant from localStorage or use CMIH Kitchen or first one
        const stored = localStorage.getItem('selected_restaurant_id');
        const validStored = stored && data?.find(r => r.id === stored);
        
        if (validStored) {
          setSelectedRestaurantId(stored);
        } else {
          // Prefer CMIH Kitchen if it exists, otherwise use first restaurant
          const cmihKitchen = data?.find(r => r.name === 'CMIH Kitchen');
          if (cmihKitchen) {
            setSelectedRestaurantId(cmihKitchen.id);
            localStorage.setItem('selected_restaurant_id', cmihKitchen.id);
          } else if (data && data.length > 0) {
            setSelectedRestaurantId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();

    // Subscribe to real-time updates for restaurants table
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel('restaurants-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'restaurants',
            filter: `owner_id=eq.${user.id}`
          },
          () => {
            fetchRestaurants();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const selectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    localStorage.setItem('selected_restaurant_id', restaurantId);
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || null;

  return { 
    restaurants, 
    selectedRestaurant, 
    loading,
    selectRestaurant
  };
};
