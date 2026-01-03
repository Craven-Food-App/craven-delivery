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
  city: string | null;
  state: string | null;
  zip_code: string | null;
  description: string | null;
  restaurant_type: string | null;
}

export const useRestaurantData = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, city, state, zip_code, description, restaurant_type, auto_descriptions_enabled, chat_enabled, alcohol_enabled, verification_notes')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setRestaurant(data);
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, []);

  return { restaurant, loading };
};