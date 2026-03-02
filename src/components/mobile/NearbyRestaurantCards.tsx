import React, { useState, useEffect, useCallback } from 'react';
import feederNavButton from '@/assets/feeder_nav_button_compressed.png';
import { supabase } from '@/integrations/supabase/client';
import { MAPBOX_CONFIG } from '@/config/mapbox';

/** Flame icon URL from public/assets (root: public/assets, feeder: copy to apps/feeder/public/assets). */
const CRAVEN_POPULAR_FLAME_ICON = '/assets/craven-popular-flame-icon.png';

interface Restaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distanceMinutes: number;
  distanceMiles: number;
  image: string;
  rating: number;
  activeOrders: number;
  avgPayout: number;
  cuisineType: string;
  /** Set in Craven admin (restaurants.is_promoted). When true, card shows "POPULAR TODAY" in bottom right. */
  is_promoted?: boolean;
}

interface NearbyRestaurantCardsProps {
  driverLocation: { latitude: number; longitude: number } | null;
}

// Fallback when driver location unavailable (uses app default from mapbox config)
const DEFAULT_LOCATION = {
  latitude: MAPBOX_CONFIG.center[1],
  longitude: MAPBOX_CONFIG.center[0],
};

const formatRestaurantAddress = (r: { address?: string | null; city?: string | null; state?: string | null; zip_code?: string | null }): string => {
  const parts = [r.address, r.city, r.state, r.zip_code].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
};

// Calculate distance in miles and minutes
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): { miles: number; minutes: number } => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  
  // Estimate: average 30 mph in city = 0.5 miles per minute
  // So 1 mile ≈ 2 minutes
  const minutes = Math.round(miles * 2);
  
  return { miles: parseFloat(miles.toFixed(1)), minutes };
};

const getTimeColor = (minutes: number): string => {
  if (minutes < 5) return 'text-green-500';
  if (minutes < 10) return 'text-orange-500';
  return 'text-red-500';
};

/** Order-count thresholds: popularity label + flame only show when orders > 10. */
const POPULARITY_GOOD_ORDERS = 10;   // > 10: "GETTING POPULAR" (orange); flame shows
const POPULARITY_LARGE_ORDERS = 15;  // >= 15: "POPULAR TODAY" (red)

const NavigationIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-16 h-16 flex items-center justify-center active:scale-95 transition-all"
    aria-label="Navigate to restaurant"
  >
    <img 
      src={feederNavButton} 
      alt="Navigate" 
      className="w-full h-full object-contain"
      loading="eager"
      decoding="async"
    />
  </button>
);

const RestaurantCard: React.FC<{ restaurant: Restaurant; onNavigate: (restaurant: Restaurant) => void }> = ({ 
  restaurant, 
  onNavigate 
}) => {
  const timeColor = getTimeColor(restaurant.distanceMinutes);
  const demandLevel = restaurant.activeOrders >= 15 ? 'high' : restaurant.activeOrders >= 10 ? 'medium' : 'low';
  const demandColor = demandLevel === 'high' ? 'text-green-600' : demandLevel === 'medium' ? 'text-orange-500' : 'text-gray-500';
  const demandBg = demandLevel === 'high' ? 'bg-green-50' : demandLevel === 'medium' ? 'bg-orange-50' : 'bg-gray-50';
  const isHighDemand = restaurant.activeOrders >= 15;
  const isHighValue = restaurant.avgPayout >= 9.00;

  // Popularity label + flame only when restaurant has more than 10 orders
  const popularityLabel =
    restaurant.activeOrders >= POPULARITY_LARGE_ORDERS
      ? { text: 'POPULAR TODAY' as const, className: 'text-xs font-bold text-red-500 flex-shrink-0' }
      : restaurant.activeOrders > POPULARITY_GOOD_ORDERS
        ? { text: 'GETTING POPULAR' as const, className: 'text-xs font-bold text-orange-500 flex-shrink-0' }
        : null;
  const showFlame = popularityLabel !== null; // flame only when we show GETTING POPULAR or POPULAR TODAY
  
  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-200" style={{ minHeight: '120px' }}>
      <div className="p-3">
        {/* Top Row: Food picture left, then restaurant name, badges, rating */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <img 
              src={restaurant.image} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&background=f97316&color=fff&size=100`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {restaurant.name}
            </h3>
            {showFlame && (
              <span className="inline-flex flex-shrink-0 w-5 h-5 items-center justify-center" style={{ mixBlendMode: 'screen' }}>
                <img
                  src={CRAVEN_POPULAR_FLAME_ICON}
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  loading="eager"
                  aria-hidden
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </span>
            )}
            {isHighValue && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                💰
              </span>
            )}
            <div className="flex items-center gap-0.5 text-xs text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{restaurant.rating}</span>
            </div>
          </div>
        </div>

        {/* Stats Row: Inline stats with navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {/* Distance */}
            <div className="bg-gray-50 rounded px-2 py-1 border border-gray-200">
              <span className={`text-sm font-bold ${timeColor}`}>{restaurant.distanceMinutes}m</span>
              <span className="text-xs text-gray-500 ml-0.5">({restaurant.distanceMiles}mi)</span>
            </div>
            
            {/* Active Orders */}
            <div className={`${demandBg} rounded px-2 py-1 border ${demandLevel === 'high' ? 'border-green-300' : demandLevel === 'medium' ? 'border-orange-300' : 'border-gray-200'}`}>
              <span className={`text-sm font-bold ${demandColor}`}>{restaurant.activeOrders}</span>
              <span className="text-xs text-gray-500 ml-0.5">orders</span>
            </div>
            
            {/* Avg Payout */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded px-2 py-1 border border-green-300">
              <span className="text-sm font-bold text-green-700">${restaurant.avgPayout.toFixed(2)}</span>
            </div>
          </div>

          {/* Navigate Button */}
          <button
            onClick={() => onNavigate(restaurant)}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Navigate to restaurant"
          >
            <img 
              src={feederNavButton} 
              alt="Navigate" 
              className="w-full h-full object-contain"
              loading="eager"
              decoding="async"
            />
          </button>
        </div>

        {/* Address Row + popularity label by order count (bottom right) */}
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500 truncate min-w-0">
            📍 {restaurant.address}
          </p>
          {popularityLabel && (
            <span className={popularityLabel.className}>{popularityLabel.text}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const NearbyRestaurantCards: React.FC<NearbyRestaurantCardsProps> = ({ driverLocation }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Use provided location or fallback to default for development
  const effectiveLocation = driverLocation || DEFAULT_LOCATION;

  const fetchNearbyRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('restaurants')
        .select('id, name, latitude, longitude, address, city, state, zip_code, logo_url, image_url, rating, cuisine_type, is_promoted')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (error) {
        console.warn('NearbyRestaurantCards fetch error:', error);
        setRestaurants([]);
        return;
      }

      const withDistance = (rows || [])
        .map((r) => {
          const lat = r.latitude ?? 0;
          const lon = r.longitude ?? 0;
          const distance = calculateDistance(effectiveLocation.latitude, effectiveLocation.longitude, lat, lon);
          return {
            id: r.id,
            name: r.name,
            latitude: lat,
            longitude: lon,
            address: formatRestaurantAddress(r),
            distanceMinutes: distance.minutes,
            distanceMiles: distance.miles,
            image: r.logo_url || r.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f97316&color=fff&size=100`,
            rating: r.rating ?? 0,
            activeOrders: 0,
            avgPayout: 0,
            cuisineType: r.cuisine_type || 'Restaurant',
            is_promoted: r.is_promoted ?? false,
          } as Restaurant;
        })
        .sort((a, b) => a.distanceMinutes - b.distanceMinutes)
        .slice(0, 5);

      setRestaurants(withDistance);
      setLastRefresh(new Date());
    } catch (e) {
      console.warn('NearbyRestaurantCards error:', e);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveLocation]);

  // Initial fetch
  useEffect(() => {
    fetchNearbyRestaurants();
  }, [fetchNearbyRestaurants]);

  // Refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNearbyRestaurants();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [fetchNearbyRestaurants]);

  const handleNavigate = (restaurant: Restaurant) => {
    // Open navigation in Google Maps or Apple Maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading || restaurants.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 text-center">
          {loading ? 'Loading nearby restaurants...' : 'No nearby restaurants found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Horizontal scrolling container - each card is full width */}
      <div 
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {restaurants.map((restaurant) => (
          <div 
            key={restaurant.id} 
            className="flex-shrink-0 w-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            <RestaurantCard 
              restaurant={restaurant} 
              onNavigate={handleNavigate} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NearbyRestaurantCards;

