import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Phone, Clock, DollarSign, Package } from 'lucide-react';

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

interface ActiveOrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: 'picked_up' | 'delivered') => void;
}

const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ order, onStatusUpdate }) => {
  const openNavigation = (lat: number, lng: number, address: string) => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // For mobile devices, try native apps first
    if (isMobile) {
      if (isIOS) {
        // Try Apple Maps first (native on iOS)
        const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;
        window.location.href = appleMapsUrl;
        
        // Fallback to Google Maps after a delay if Apple Maps doesn't open
        setTimeout(() => {
          const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}`;
          window.location.href = googleMapsUrl;
        }, 1000);
        
        // Final fallback to web Google Maps
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        }, 2000);
        
      } else if (isAndroid) {
        // Try Google Maps app (most common on Android)
        const googleMapsIntent = `geo:${lat},${lng}?q=${lat},${lng}`;
        window.location.href = googleMapsIntent;
        
        // Fallback to Google Maps web after a delay
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        }, 1000);
      }
    } else {
      // For desktop, open Google Maps in a new tab
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const getStatusInfo = () => {
    switch (order.status) {
      case 'assigned':
        return {
          title: '🚗 Navigate to Pickup',
          subtitle: 'Head to the restaurant',
          action: 'Navigate to Pickup',
          actionVariant: 'default' as const,
          location: { lat: order.pickup_lat, lng: order.pickup_lng, address: order.pickup_address },
          nextStatus: 'picked_up' as const,
          nextAction: 'Mark as Picked Up'
        };
      case 'picked_up':
        return {
          title: '📦 Navigate to Dropoff',
          subtitle: 'Deliver to customer',
          action: 'Navigate to Customer',
          actionVariant: 'default' as const,
          location: { lat: order.dropoff_lat, lng: order.dropoff_lng, address: order.dropoff_address },
          nextStatus: 'delivered' as const,
          nextAction: 'Mark as Delivered'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{statusInfo.title}</CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Active
          </Badge>
        </div>
        <p className="text-muted-foreground">{statusInfo.subtitle}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current destination */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">
                {order.status === 'assigned' ? order.pickup_name : order.dropoff_name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {order.status === 'assigned' ? order.pickup_address : order.dropoff_address}
              </p>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">
              ${(order.payout_cents / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{(order.distance_km * 0.621371).toFixed(1)} mi</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={() => openNavigation(
              statusInfo.location.lat, 
              statusInfo.location.lng, 
              statusInfo.location.address
            )}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {statusInfo.action}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onStatusUpdate(order.id, statusInfo.nextStatus)}
          >
            <Package className="h-4 w-4 mr-2" />
            {statusInfo.nextAction}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`tel:${order.pickup_name}`, '_self')}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              // Share location/ETA
              if (navigator.share) {
                navigator.share({
                  title: 'Delivery Update',
                  text: `Your order from ${order.pickup_name} is on the way!`
                });
              }
            }}
          >
            <Clock className="h-4 w-4 mr-1" />
            Update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveOrderCard;