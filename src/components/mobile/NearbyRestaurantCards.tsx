import React, { useState, useEffect, useCallback } from 'react';
import feederNavButton from '@/assets/feeder_nav_button_compressed.png';

interface Restaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distanceMinutes: number;
  image: string;
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
const MOCK_RESTAURANTS: Omit<Restaurant, 'distanceMinutes'>[] = [
  { id: '1', name: "Chick-fil-A", latitude: 33.7490, longitude: -84.3880, address: "123 Peachtree St", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop" },
  { id: '2', name: "McDonald's", latitude: 33.7510, longitude: -84.3900, address: "456 Main St", image: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=100&h=100&fit=crop" },
  { id: '3', name: "Wendy's", latitude: 33.7530, longitude: -84.3850, address: "789 Oak Ave", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=100&h=100&fit=crop" },
  { id: '4', name: "Taco Bell", latitude: 33.7480, longitude: -84.3920, address: "321 Elm St", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=100&h=100&fit=crop" },
  { id: '5', name: "Subway", latitude: 33.7550, longitude: -84.3870, address: "555 Pine Rd", image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=100&h=100&fit=crop" },
  { id: '6', name: "Chipotle", latitude: 33.7470, longitude: -84.3840, address: "777 Cedar Ln", image: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=100&h=100&fit=crop" },
  { id: '7', name: "Panda Express", latitude: 33.7520, longitude: -84.3910, address: "888 Maple Dr", image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=100&h=100&fit=crop" },
  { id: '8', name: "Five Guys", latitude: 33.7540, longitude: -84.3860, address: "999 Birch Blvd", image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop" },
];

// Calculate distance in minutes (rough estimate: 1 mile ≈ 2 minutes driving)
const calculateDriveTime = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMiles = R * c;
  
  // Estimate: average 30 mph in city = 0.5 miles per minute
  // So 1 mile ≈ 2 minutes
  return Math.round(distanceMiles * 2);
};

const getTimeColor = (minutes: number): string => {
  if (minutes < 5) return 'text-green-500';
  if (minutes < 10) return 'text-orange-500';
  return 'text-red-500';
};

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
  
  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow-lg border border-gray-100" style={{ height: '150px' }}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: Nav icon with distance below */}
        <div className="flex flex-col items-center" style={{ marginTop: '5px' }}>
          <NavigationIcon onClick={() => onNavigate(restaurant)} />
          {/* Distance in minutes */}
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-2xl font-bold ${timeColor}`}>
              {restaurant.distanceMinutes}
            </span>
            <span className={`text-sm font-medium ${timeColor}`}>
              min
            </span>
          </div>
        </div>
        {/* Right: Restaurant name and image */}
        <div className="flex-1 flex flex-col items-end">
          <h3 className="text-xl font-bold text-gray-900 text-right leading-tight">
            {restaurant.name}
          </h3>
          <div className="w-16 h-16 mt-2 rounded-lg overflow-hidden bg-gray-100">
            <img 
              src={restaurant.image} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Show placeholder on error
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&background=f97316&color=fff&size=100`;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NearbyRestaurantCards: React.FC<NearbyRestaurantCardsProps> = ({ driverLocation }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Use provided location or fallback to default for development
  const effectiveLocation = driverLocation || DEFAULT_DEV_LOCATION;

  const fetchNearbyRestaurants = useCallback(() => {
    // Calculate distances and sort by nearest
    const restaurantsWithDistance = MOCK_RESTAURANTS.map(r => ({
      ...r,
      distanceMinutes: calculateDriveTime(
        effectiveLocation.latitude,
        effectiveLocation.longitude,
        r.latitude,
        r.longitude
      )
    }))
    .sort((a, b) => a.distanceMinutes - b.distanceMinutes)
    .slice(0, 5); // Get 5 nearest

    setRestaurants(restaurantsWithDistance);
    setLastRefresh(new Date());
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

  if (restaurants.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 text-center">Loading nearby restaurants...</p>
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

