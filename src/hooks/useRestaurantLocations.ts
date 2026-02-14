import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RestaurantLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cuisine_type: string | null;
  rating: number | null;
  restaurant_type: string | null;
  logo_url: string | null;
}

export function useRestaurantLocations() {
  return useQuery({
    queryKey: ['restaurant-locations'],
    queryFn: async (): Promise<RestaurantLocation[]> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, latitude, longitude, cuisine_type, rating, restaurant_type, logo_url')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      return (data || []) as RestaurantLocation[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function restaurantsToGeoJSON(restaurants: RestaurantLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: restaurants.map((r) => ({
      type: 'Feature' as const,
      properties: {
        id: r.id,
        name: r.name,
        cuisine_type: r.cuisine_type || 'General',
        rating: r.rating || 0,
        restaurant_type: r.restaurant_type || 'default',
        logo_url: r.logo_url || '',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(r.longitude), Number(r.latitude)],
      },
    })),
  };
}
