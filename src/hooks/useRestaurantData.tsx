import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Restaurant {
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
  auto_descriptions_enabled?: boolean;
  chat_enabled?: boolean;
  cravemore_eligible?: boolean;
  verification_notes?: Record<string, unknown>;
}

export const useRestaurantData = (restaurantId?: string) => {
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

        let query = supabase
          .from('restaurants')
          .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, city, state, zip_code, description, restaurant_type, auto_descriptions_enabled, chat_enabled, cravemore_eligible, alcohol_enabled, verification_notes')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // When a specific restaurantId is provided (e.g. from merchant-portal
        // store selector), fetch that exact store instead of the most recent.
        if (restaurantId) {
          query = supabase
            .from('restaurants')
            .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, city, state, zip_code, description, restaurant_type, auto_descriptions_enabled, chat_enabled, cravemore_eligible, alcohol_enabled, verification_notes')
            .eq('owner_id', user.id)
            .eq('id', restaurantId)
            .limit(1);
        }

        const { data, error } = await query;

        if (error) throw error;
        setRestaurant((data?.[0] as unknown as Restaurant) ?? null);
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  const refetch = () => {
    setLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      let query = supabase
        .from('restaurants')
        .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, city, state, zip_code, description, restaurant_type, auto_descriptions_enabled, chat_enabled, cravemore_eligible, alcohol_enabled, verification_notes')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (restaurantId) {
        query = supabase
          .from('restaurants')
          .select('id, name, owner_id, setup_deadline, logo_url, header_image_url, instagram_handle, phone, address, city, state, zip_code, description, restaurant_type, auto_descriptions_enabled, chat_enabled, cravemore_eligible, alcohol_enabled, verification_notes')
          .eq('owner_id', user.id)
          .eq('id', restaurantId)
          .limit(1);
      }

      (query as any)
        .then(({ data, error }: any) => {
          if (error) console.error('Error refetching restaurant:', error);
          else setRestaurant((data?.[0] as unknown as Restaurant) ?? null);
        })
        .finally(() => setLoading(false));
    });
  };

  return { restaurant, loading, refetch };
};