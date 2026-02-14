import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, DollarSign, Navigation } from 'lucide-react';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { useRestaurantLocations } from '@/hooks/useRestaurantLocations';
import { addRestaurantLayer } from '@/components/map/RestaurantMapLayer';

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

interface OrderMapProps {
  orders: Order[];
  activeOrder: Order | null;
  onOrderClick: (order: Order) => void;
}

const OrderMap: React.FC<OrderMapProps> = ({ orders, activeOrder, onOrderClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const { data: restaurants } = useRestaurantLocations();

  const pendingOrders = orders.filter(order => order.status === 'pending');

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || !showMap) return;

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;

      mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: MAPBOX_CONFIG.style,
        center: MAPBOX_CONFIG.center as [number, number],
        zoom: MAPBOX_CONFIG.zoom,
        attributionControl: false,
      });

      mapRef.current.on('load', () => {
        setIsMapReady(true);
        if (restaurants && restaurants.length > 0) {
          cleanupRef.current = addRestaurantLayer(mapRef.current, restaurants);
        }
      });
    };

    if ((window as any).mapboxgl) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        initMap();
      };
      document.head.appendChild(script);
    }

    return () => {
      cleanupRef.current?.();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [showMap]);

  // Update restaurant layer when data changes
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    cleanupRef.current?.();
    if (restaurants && restaurants.length > 0) {
      cleanupRef.current = addRestaurantLayer(mapRef.current, restaurants);
    }
  }, [restaurants, isMapReady]);

  return (
    <div className="h-full space-y-4">
      {/* Map */}
      <div className="relative w-full h-64 md:h-80 rounded-lg border overflow-hidden">
        {showMap && (
          <div ref={mapContainer} className="w-full h-full" />
        )}
        {showMap && !isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        {showMap && isMapReady && (
          <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">{pendingOrders.length} orders</span>
            </div>
          </div>
        )}
      </div>

      {/* Orders Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="font-medium">{pendingOrders.length} Orders Available</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrders.map((order) => (
              <Card 
                key={order.id} 
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] border-l-4"
                style={{
                  borderLeftColor: order.payout_cents >= 1000 ? '#ef4444' : 
                                 order.payout_cents >= 700 ? '#f97316' : '#eab308'
                }}
                onClick={() => onOrderClick(order)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{order.pickup_name}</h4>
                      <p className="text-xs text-muted-foreground">{order.pickup_address}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${(order.payout_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(order.distance_km * 0.621371).toFixed(1)} mi
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Navigation className="h-3 w-3" />
                    <span>To: {order.dropoff_name}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOrderClick(order);
                    }}
                  >
                    Accept Order - ${(order.payout_cents / 100).toFixed(2)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {pendingOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No orders available right now</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderMap;
