import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, DollarSign, Navigation } from 'lucide-react';

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
  const [mapboxToken, setMapboxToken] = useState('');
  const [showMap, setShowMap] = useState(false);

  const pendingOrders = orders.filter(order => order.status === 'pending');

  const handleShowMap = () => {
    if (mapboxToken.trim()) {
      setShowMap(true);
      // Simple Google Maps fallback
      const center = { lat: 37.7749, lng: -122.4194 }; // San Francisco
      initGoogleMap();
    }
  };

  const initGoogleMap = () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_KEY&libraries=maps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };

  if (!showMap) {
    return (
      <div className="h-full space-y-4">
        {/* Token Input */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">Map Setup</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your Mapbox token to view orders on the map
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="pk.eyJ1Ijoi..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                />
                <Button onClick={handleShowMap} disabled={!mapboxToken.trim()}>
                  Load Map
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get a free token at{' '}
                <a 
                  href="https://account.mapbox.com/access-tokens/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

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
  }

  // Simple map interface with iframe fallback
  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 z-10">
        <Button 
          variant="outline" 
          onClick={() => setShowMap(false)}
          className="bg-background/90 backdrop-blur-sm"
        >
          ← Back to List
        </Button>
      </div>
      
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-medium">{pendingOrders.length} orders available</span>
        </div>
      </div>

      <iframe
        src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50582.83749958621!2d-122.48297767832098!3d37.77492950212623!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80859a6d00690021%3A0x4a501367f076adff!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1635726153000!5m2!1sen!2sus`}
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: '8px' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default OrderMap;