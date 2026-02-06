import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RestaurantCard from "./RestaurantCard";

// Module-level geolocation cache — request location once, share across all instances
let _geoCache: { lat: number; lng: number } | null = null;
let _geoRequested = false;
let _geoCallbacks: Array<(loc: { lat: number; lng: number } | null) => void> = [];

function getSharedUserLocation(cb: (loc: { lat: number; lng: number } | null) => void) {
  if (_geoCache) { cb(_geoCache); return; }
  _geoCallbacks.push(cb);
  if (_geoRequested) return; // already in-flight
  _geoRequested = true;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _geoCache = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        _geoCallbacks.forEach((fn) => fn(_geoCache));
        _geoCallbacks = [];
      },
      (error) => {
        // Denied / unavailable — resolve all waiters with null
        // Only log if not a user denial (error.code !== 1)
        if (error.code !== 1) {
          console.warn('Location access unavailable:', error.message || 'Unknown error');
        }
        _geoCallbacks.forEach((fn) => fn(null));
        _geoCallbacks = [];
      }
    );
  } else {
    _geoCallbacks.forEach((fn) => fn(null));
    _geoCallbacks = [];
  }
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  is_promoted: boolean;
  rating: number;
  image_url: string;
  delivery_radius_miles?: number;
  latitude?: number;
  longitude?: number;
}
interface RestaurantGridProps {
  searchQuery?: string;
  deliveryAddress?: string;
  cuisineFilter?: string;
  excludeCuisine?: string; // Exclude specific cuisine type (e.g., 'apparel') or comma-separated list
  sectionTitle?: string; // Optional section title
  horizontal?: boolean; // Display as horizontal scrollable row
  categoryFilter?: string; // For filtering by menu category (e.g., 'Accessories', 'Shoes')
  customRestaurants?: Restaurant[]; // Pre-fetched restaurants to display (skips fetch)
  columns?: number; // Number of columns for grid layout (default: responsive)
}
const RestaurantGrid = ({
  searchQuery,
  deliveryAddress,
  cuisineFilter,
  excludeCuisine,
  sectionTitle,
  horizontal = false,
  categoryFilter,
  customRestaurants,
  columns
}: RestaurantGridProps = {}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get user's current location for delivery radius filtering (shared across instances)
  useEffect(() => {
    getSharedUserLocation((loc) => {
      if (loc) setUserLocation(loc);
    });
  }, []);
  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (customRestaurants) {
      // Use custom restaurants if provided - format them
      const formatted = customRestaurants.map((restaurant: any) => ({
        ...restaurant,
        min_delivery_time: restaurant.min_delivery_time || 20,
        max_delivery_time: restaurant.max_delivery_time || 30,
        is_promoted: restaurant.is_promoted || false
      }));
      setRestaurants(formatted);
      setLoading(false);
    } else {
      fetchRestaurants();
    }
  }, [searchQuery, deliveryAddress, cuisineFilter, userLocation, categoryFilter, customRestaurants]);
  const fetchRestaurants = async () => {
    try {
      let query = (supabase as any)
        .from("restaurants")
        .select(`
          *,
          delivery_radius_miles,
          latitude,
          longitude
        `)
        .eq("is_active", true);

      // Filter by cuisine if provided and not 'all'
      // Note: We'll filter in JavaScript for case-insensitive matching
      // since Supabase eq() is case-sensitive

      const { data, error } = await query
        .order("is_promoted", { ascending: false })
        .order("rating", { ascending: false });
      
      if (error) throw error;
      
      let filteredData = (data || []).map((restaurant: any) => ({
        ...restaurant,
        min_delivery_time: restaurant.min_delivery_time || 20,
        max_delivery_time: restaurant.max_delivery_time || 30,
        is_promoted: restaurant.is_promoted || false
      }));

      // Filter by cuisine if provided and not 'all' (case-insensitive)
      if (cuisineFilter && cuisineFilter !== 'all') {
        filteredData = filteredData.filter((restaurant: Restaurant) =>
          restaurant.cuisine_type?.toLowerCase() === cuisineFilter.toLowerCase()
        );
      }

      // Exclude specific cuisine types if provided (supports comma-separated list)
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map(c => c.trim().toLowerCase());
        filteredData = filteredData.filter((restaurant: Restaurant) => {
          const restaurantCuisine = restaurant.cuisine_type?.toLowerCase();
          return !restaurantCuisine || !excludeList.includes(restaurantCuisine);
        });
      }

      // Filter by search query if provided
      if (searchQuery) {
        filteredData = filteredData.filter((restaurant: Restaurant) =>
          restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter by delivery radius if user location is available
      if (userLocation && filteredData.length > 0) {
        filteredData = filteredData.filter((restaurant: Restaurant) => {
          if (!restaurant.latitude || !restaurant.longitude || !restaurant.delivery_radius_miles) {
            return true; // Include restaurants without location data
          }

          // Calculate distance using Haversine formula
          const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            restaurant.latitude, 
            restaurant.longitude
          );
          
          return distance <= restaurant.delivery_radius_miles;
        });
      }

      // Filter by menu category if categoryFilter is provided
      if (categoryFilter && categoryFilter !== 'all' && filteredData.length > 0) {
        try {
          // Fetch restaurants with menu items in the specified category
          const { data: categoryData } = await supabase
            .from('menu_categories')
            .select('restaurant_id')
            .eq('name', categoryFilter)
            .eq('is_active', true);
          
          if (categoryData && categoryData.length > 0) {
            const restaurantIds = categoryData.map((cat: any) => cat.restaurant_id);
            filteredData = filteredData.filter((restaurant: Restaurant) =>
              restaurantIds.includes(restaurant.id)
            );
          } else {
            filteredData = []; // No restaurants with this category
          }
        } catch (error) {
          console.error('Error filtering by category:', error);
          // Continue with unfiltered data if category filter fails
        }
      }

      setRestaurants(filteredData);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <section className="py-6 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {searchQuery || deliveryAddress ? "Searching..." : "Popular Restaurants Near You"}
            </h2>
            <p className="text-muted-foreground text-lg">
              Loading restaurants...
            </p>
          </div>
        </div>
      </section>;
  }
  const formatRestaurantData = (restaurant: Restaurant) => {
    // Calculate distance from user if location available
    let distanceStr: string | undefined;
    if (userLocation && restaurant.latitude && restaurant.longitude) {
      const miles = calculateDistance(
        userLocation.lat, userLocation.lng,
        restaurant.latitude, restaurant.longitude
      );
      distanceStr = `${miles.toFixed(1)} mi`;
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      image: restaurant.image_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
      rating: restaurant.rating,
      deliveryTime: `${restaurant.min_delivery_time} min`,
      deliveryFee: restaurant.delivery_fee_cents === 0 ? "Free" : `$${(restaurant.delivery_fee_cents / 100).toFixed(2)}`,
      cuisine: restaurant.cuisine_type,
      distance: distanceStr,
      isPromoted: restaurant.is_promoted
    };
  };
  // Don't render if no restaurants (conditional rendering)
  if (restaurants.length === 0 && !loading) {
    return null;
  }

  return <section className="py-6" style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}>
      {horizontal ? (
        <>
          {sectionTitle && (
            <div className="container mx-auto px-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{sectionTitle}</h2>
            </div>
          )}
          <div className="w-full overflow-x-auto scrollbar-hide" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}>
            <div className="flex space-x-4 px-4 pb-4" style={{ minWidth: 'max-content' }}>
              {restaurants.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground text-lg">
                    {cuisineFilter && cuisineFilter !== 'all' 
                      ? "Sorry there is nothing available in this category as of yet. Please check back at a later date"
                      : searchQuery 
                        ? `No restaurants found for "${searchQuery}"${deliveryAddress ? ` near ${deliveryAddress}` : ''}` 
                        : deliveryAddress 
                          ? `No restaurants found within ${deliveryAddress}` 
                          : "No restaurants available right now. Be the first to register your restaurant!"}
                  </p>
                </div>
              ) : (
                restaurants.map((restaurant, index) => (
                  <div key={restaurant.id} className="flex-shrink-0 w-[280px] animate-slide-up" style={{
                    animationDelay: `${index * 100}ms`
                  }}>
                    <RestaurantCard {...formatRestaurantData(restaurant)} />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="container mx-auto px-4">
          {sectionTitle && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{sectionTitle}</h2>
            </div>
          )}
          {!searchQuery && !deliveryAddress && !sectionTitle && <div className="text-center mb-8">
            
            
          </div>}

          {restaurants.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {cuisineFilter && cuisineFilter !== 'all' 
                ? "Sorry there is nothing available in this category as of yet. Please check back at a later date"
                : searchQuery 
                  ? `No restaurants found for "${searchQuery}"${deliveryAddress ? ` near ${deliveryAddress}` : ''}` 
                  : deliveryAddress 
                    ? `No restaurants found within ${deliveryAddress}` 
                    : "No restaurants available right now. Be the first to register your restaurant!"}
            </p>
          </div> : (
            <div className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
              {restaurants.map((restaurant, index) => <div key={restaurant.id} className="animate-slide-up" style={{
                animationDelay: `${index * 100}ms`
              }}>
                <RestaurantCard {...formatRestaurantData(restaurant)} />
              </div>)}
            </div>
          )}
        </div>
      )}
    </section>;
};
export default RestaurantGrid;