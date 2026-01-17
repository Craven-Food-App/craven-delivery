import React, { useEffect, useRef, useState } from 'react';
import { DollarSign } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Order {
  id: string;
  pickup_name: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_name: string;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  payout_cents: number;
  distance_km: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  assigned_craver_id?: string | null;
}

interface LeafletMapProps {
  orders: Order[];
  activeOrder: Order | null;
  onOrderClick: (order: Order) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ orders, activeOrder, onOrderClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const userLocationMarker = useRef<L.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('Initializing map...');
    
    // Initialize map with a default view, we'll update it when we get user location
    map.current = L.map(mapContainer.current).setView([41.6528, -83.6982], 12); // Toledo as default

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    setMapLoaded(true);

    // Get user location immediately and center map
    if (navigator.geolocation) {
      console.log('Getting initial user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Initial location received:', latitude, longitude);
          
          if (map.current) {
            // Center the map on user's actual location
            map.current.setView([latitude, longitude], 15);
            setUserLocation({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error('Failed to get initial location:', error);
          // Stay with Toledo default if location fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Enhanced location tracking effect
  useEffect(() => {
    if (!navigator.geolocation || !map.current) {
      console.log('Geolocation not supported or map not ready');
      return;
    }

    const createUserLocationMarker = (lat: number, lng: number) => {
      const userIcon = L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #3b82f6;
            border: 4px solid white;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
            position: relative;
          "></div>
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          "></div>
        `,
        className: 'user-location-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      return L.marker([lat, lng], { icon: userIcon });
    };

    const updateUserLocation = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log(`📍 Location update: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
      
      setUserLocation({ lat: latitude, lng: longitude });

      if (!map.current) return;

      // Remove existing user location marker
      if (userLocationMarker.current) {
        map.current.removeLayer(userLocationMarker.current);
      }

      // Add new user location marker
      userLocationMarker.current = createUserLocationMarker(latitude, longitude);
      userLocationMarker.current.addTo(map.current);

      // Center map on user location with smooth animation
      map.current.flyTo([latitude, longitude], 16, {
        duration: 1.0,
        easeLinearity: 0.5
      });

      // Add popup to show exact coordinates
      userLocationMarker.current.bindPopup(`
        <div class="text-center">
          <strong>Your Location</strong><br>
          <small>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}</small>
        </div>
      `);
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error('Location error:', error.message);
      
      let errorMessage = 'Unable to get your location. ';
      switch (error.code) {
        case 1:
          errorMessage += 'Location permission was denied. Please enable location access in your browser settings.';
          break;
        case 2:
          errorMessage += 'Location information is unavailable.';
          break;
        case 3:
          errorMessage += 'Location request timed out.';
          break;
      }
      
      console.error(errorMessage);
    };

    // Get high-accuracy location immediately
    console.log('🎯 Requesting high-accuracy location...');
    navigator.geolocation.getCurrentPosition(
      updateUserLocation,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Always get fresh location
      }
    );

    // Start continuous tracking with high accuracy
    console.log('🔄 Starting continuous location tracking...');
    watchId.current = navigator.geolocation.watchPosition(
      updateUserLocation,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Use cached location if less than 5 seconds old
      }
    );

    return () => {
      if (watchId.current !== null) {
        console.log('🛑 Stopping location tracking');
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (userLocationMarker.current && map.current) {
        map.current.removeLayer(userLocationMarker.current);
        userLocationMarker.current = null;
      }
    };
  }, [mapLoaded]); // Only start tracking after map is loaded

  useEffect(() => {
    if (!map.current) return;

    // Clear existing order markers (but preserve user location marker)
    map.current.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== userLocationMarker.current) {
        map.current?.removeLayer(layer);
      }
    });

    // Add order markers
    const pendingOrders = orders.filter(order => order.status === 'pending');
    
    pendingOrders.forEach(order => {
      if (!map.current) return;

      // Create custom icon based on payout
      const payoutAmount = Math.round(order.payout_cents / 100);
      const color = order.payout_cents >= 1000 ? '#ef4444' : 
                   order.payout_cents >= 700 ? '#f97316' : '#eab308';

      const customIcon = L.divIcon({
        html: `
          <div style="
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: ${color};
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
          ">
            $${payoutAmount}
          </div>
        `,
        className: 'custom-order-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });

      const marker = L.marker([order.pickup_lat, order.pickup_lng], { 
        icon: customIcon 
      }).addTo(map.current);

      marker.on('click', () => {
        onOrderClick(order);
      });

      // Add popup with order details
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-sm">${order.pickup_name}</h3>
          <p class="text-xs text-gray-600">${order.pickup_address}</p>
          <p class="text-sm font-medium text-green-600 mt-1">$${payoutAmount} • ${(order.distance_km * 0.621371).toFixed(1)}mi</p>
        </div>
      `);
    });
  }, [orders, onOrderClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Order Summary Overlay */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-medium">{orders.filter(o => o.status === 'pending').length} orders available</span>
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;