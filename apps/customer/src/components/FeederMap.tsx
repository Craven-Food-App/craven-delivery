import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, MapPin, Navigation } from 'lucide-react';

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

interface FeederMapProps {
  orders: Order[];
  activeOrder: Order | null;
  onOrderClick: (order: Order) => void;
}

const FeederMap: React.FC<FeederMapProps> = ({ orders, activeOrder, onOrderClick }) => {
  const pendingOrders = orders.filter(order => order.status === 'pending');

  // Convert coordinates to screen positions (San Francisco area)
  const coordToPosition = (lat: number, lng: number) => {
    // SF bounds: lat 37.7-37.8, lng -122.5 to -122.3
    const x = ((lng + 122.5) / 0.2) * 100; // Convert lng to 0-100%
    const y = ((37.8 - lat) / 0.1) * 100;  // Convert lat to 0-100% (inverted for screen)
    
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`
    };
  };

  return (
    <div className="h-full relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden">
      {/* Map background with street grid */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full">
          {/* Vertical lines (streets) */}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i + 1) * 12.5}%`}
              y1="0%"
              x2={`${(i + 1) * 12.5}%`}
              y2="100%"
              stroke="#9CA3AF"
              strokeWidth="1"
            />
          ))}
          {/* Horizontal lines (streets) */}
          {Array.from({ length: 6 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1="0%"
              y1={`${(i + 1) * 16.67}%`}
              x2="100%"
              y2={`${(i + 1) * 16.67}%`}
              stroke="#9CA3AF"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* Orders overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-background/90 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">{pendingOrders.length} orders available</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User location (center) */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-xs bg-black/70 text-white px-2 py-1 rounded whitespace-nowrap">
          You are here
        </div>
      </div>

      {/* Order markers */}
      {pendingOrders.map((order) => {
        const position = coordToPosition(order.pickup_lat, order.pickup_lng);
        const payoutColor = order.payout_cents >= 1000 ? '#ef4444' : 
                           order.payout_cents >= 700 ? '#f97316' : '#eab308';
        
        return (
          <div
            key={order.id}
            className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
            style={position}
            onClick={() => onOrderClick(order)}
          >
            {/* Order marker */}
            <div 
              className="w-12 h-12 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: payoutColor }}
            >
              ${Math.round(order.payout_cents / 100)}
            </div>
            
            {/* Order info popup on hover */}
            <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 bg-black/90 text-white p-2 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="font-medium">{order.pickup_name}</div>
              <div className="text-gray-300">${(order.payout_cents / 100).toFixed(2)} • {(order.distance_km * 0.621371).toFixed(1)}mi</div>
              <div className="text-gray-400">Click to accept</div>
            </div>
          </div>
        );
      })}

      {/* Active order route */}
      {activeOrder && (
        <>
          {/* Pickup marker */}
          <div
            className="absolute z-15 transform -translate-x-1/2 -translate-y-1/2"
            style={coordToPosition(activeOrder.pickup_lat, activeOrder.pickup_lng)}
          >
            <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              Pickup: {activeOrder.pickup_name}
            </div>
          </div>

          {/* Dropoff marker */}
          <div
            className="absolute z-15 transform -translate-x-1/2 -translate-y-1/2"
            style={coordToPosition(activeOrder.dropoff_lat, activeOrder.dropoff_lng)}
          >
            <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <Navigation className="h-4 w-4 text-white" />
            </div>
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              Dropoff: {activeOrder.dropoff_name}
            </div>
          </div>

          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
            <line
              x1={coordToPosition(activeOrder.pickup_lat, activeOrder.pickup_lng).left}
              y1={coordToPosition(activeOrder.pickup_lat, activeOrder.pickup_lng).top}
              x2={coordToPosition(activeOrder.dropoff_lat, activeOrder.dropoff_lng).left}
              y2={coordToPosition(activeOrder.dropoff_lat, activeOrder.dropoff_lng).top}
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeDasharray="8,4"
              className="animate-pulse"
            />
          </svg>
        </>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="bg-background/90 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>High payout ($10+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span>Medium payout ($7-10)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Low payout ($4-7)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No orders message */}
      {pendingOrders.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Card className="bg-background/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No orders available</h3>
              <p className="text-sm text-muted-foreground">
                Check back soon for new delivery opportunities
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FeederMap;