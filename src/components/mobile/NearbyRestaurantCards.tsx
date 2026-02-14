import React, { useState, useEffect, useCallback } from 'react';
import feederNavButton from '@/assets/feeder_nav_button_compressed.png';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

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
}

interface NearbyRestaurantCardsProps {
  driverLocation: { latitude: number; longitude: number } | null;
}

// Default location for development (Atlanta, GA)
const DEFAULT_DEV_LOCATION = {
  latitude: 33.7490,
  longitude: -84.3880
};

// Mock restaurant data - in production this would come from Supabase
const MOCK_RESTAURANTS: Omit<Restaurant, 'distanceMinutes' | 'distanceMiles'>[] = [
  { id: '1', name: "Chick-fil-A", latitude: 33.7490, longitude: -84.3880, address: "123 Peachtree St", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop", rating: 4.8, activeOrders: 12, avgPayout: 8.50, cuisineType: "Fast Food" },
  { id: '2', name: "McDonald's", latitude: 33.7510, longitude: -84.3900, address: "456 Main St", image: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=100&h=100&fit=crop", rating: 4.2, activeOrders: 18, avgPayout: 6.75, cuisineType: "Fast Food" },
  { id: '3', name: "Wendy's", latitude: 33.7530, longitude: -84.3850, address: "789 Oak Ave", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=100&h=100&fit=crop", rating: 4.5, activeOrders: 8, avgPayout: 7.25, cuisineType: "Fast Food" },
  { id: '4', name: "Taco Bell", latitude: 33.7480, longitude: -84.3920, address: "321 Elm St", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=100&h=100&fit=crop", rating: 4.3, activeOrders: 15, avgPayout: 7.00, cuisineType: "Mexican" },
  { id: '5', name: "Subway", latitude: 33.7550, longitude: -84.3870, address: "555 Pine Rd", image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=100&h=100&fit=crop", rating: 4.0, activeOrders: 5, avgPayout: 6.00, cuisineType: "Sandwiches" },
  { id: '6', name: "Chipotle", latitude: 33.7470, longitude: -84.3840, address: "777 Cedar Ln", image: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=100&h=100&fit=crop", rating: 4.6, activeOrders: 22, avgPayout: 9.25, cuisineType: "Mexican" },
  { id: '7', name: "Panda Express", latitude: 33.7520, longitude: -84.3910, address: "888 Maple Dr", image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=100&h=100&fit=crop", rating: 4.4, activeOrders: 10, avgPayout: 7.50, cuisineType: "Chinese" },
  { id: '8', name: "Five Guys", latitude: 33.7540, longitude: -84.3860, address: "999 Birch Blvd", image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop", rating: 4.7, activeOrders: 14, avgPayout: 10.00, cuisineType: "Burgers" },
];

// Calculate distance in miles and minutes
const calculateDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): { miles: number; minutes: number } => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  const minutes = Math.round(miles * 2);
  return { miles: parseFloat(miles.toFixed(1)), minutes };
};

const getTimeColor = (minutes: number): string => {
  if (minutes < 5) return 'text-green-500';
  if (minutes < 10) return 'text-orange-500';
  return 'text-red-500';
};

const RestaurantCard: React.FC<{ restaurant: Restaurant; onNavigate: (restaurant: Restaurant) => void }> = ({ 
  restaurant, onNavigate 
}) => {
  const { colors: C } = useFeederDarkMode();
  const timeColor = getTimeColor(restaurant.distanceMinutes);
  const demandLevel = restaurant.activeOrders >= 15 ? 'high' : restaurant.activeOrders >= 10 ? 'medium' : 'low';
  const demandColor = demandLevel === 'high' ? 'text-green-600' : demandLevel === 'medium' ? 'text-orange-500' : C.muted;
  const isHighDemand = restaurant.activeOrders >= 15;
  const isHighValue = restaurant.avgPayout >= 9.00;
  
  return (
    <div className="w-full rounded-xl shadow-md" style={{ background: C.card, border: `1px solid ${C.border}`, minHeight: '120px' }}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base font-bold leading-tight" style={{ color: C.text }}>{restaurant.name}</h3>
            {isHighDemand && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white">🔥</span>
            )}
            {isHighValue && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white">💰</span>
            )}
            <div className="flex items-center gap-0.5 text-xs" style={{ color: C.muted }}>
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{restaurant.rating}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: C.bgMuted }}>
            <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&background=f97316&color=fff&size=100`; }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="rounded px-2 py-1" style={{ background: C.bgMuted, border: `1px solid ${C.border}` }}>
              <span className={`text-sm font-bold ${timeColor}`}>{restaurant.distanceMinutes}m</span>
              <span className="text-xs ml-0.5" style={{ color: C.muted2 }}>({restaurant.distanceMiles}mi)</span>
            </div>
            <div className="rounded px-2 py-1" style={{ background: C.bgMuted, border: `1px solid ${C.border}` }}>
              <span className="text-sm font-bold" style={{ color: demandColor }}>{restaurant.activeOrders}</span>
              <span className="text-xs ml-0.5" style={{ color: C.muted2 }}>orders</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded px-2 py-1 border border-green-300">
              <span className="text-sm font-bold text-green-700">${restaurant.avgPayout.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={() => onNavigate(restaurant)} className="flex-shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 transition-transform" aria-label="Navigate to restaurant">
            <img src={feederNavButton} alt="Navigate" className="w-full h-full object-contain" loading="eager" decoding="async" />
          </button>
        </div>

        <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-xs truncate" style={{ color: C.muted2 }}>📍 {restaurant.address}</p>
        </div>
      </div>
    </div>
  );
};

export const NearbyRestaurantCards: React.FC<NearbyRestaurantCardsProps> = ({ driverLocation }) => {
  const { colors: C } = useFeederDarkMode();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const effectiveLocation = driverLocation || DEFAULT_DEV_LOCATION;

  const fetchNearbyRestaurants = useCallback(() => {
    const restaurantsWithDistance = MOCK_RESTAURANTS.map(r => {
      const distance = calculateDistance(effectiveLocation.latitude, effectiveLocation.longitude, r.latitude, r.longitude);
      return { ...r, distanceMinutes: distance.minutes, distanceMiles: distance.miles };
    }).sort((a, b) => a.distanceMinutes - b.distanceMinutes).slice(0, 5);
    setRestaurants(restaurantsWithDistance);
    setLastRefresh(new Date());
  }, [effectiveLocation]);

  useEffect(() => { fetchNearbyRestaurants(); }, [fetchNearbyRestaurants]);
  useEffect(() => {
    const interval = setInterval(() => { fetchNearbyRestaurants(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNearbyRestaurants]);

  const handleNavigate = (restaurant: Restaurant) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (restaurants.length === 0) {
    return (
      <div className="backdrop-blur-sm rounded-2xl p-4 shadow-sm" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm text-center" style={{ color: C.muted2 }}>Loading nearby restaurants...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="flex-shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
            <RestaurantCard restaurant={restaurant} onNavigate={handleNavigate} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NearbyRestaurantCards;
