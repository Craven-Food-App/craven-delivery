import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Navigation } from 'lucide-react';

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

interface OrderCardProps {
  order: Order;
  variant: 'available' | 'active';
  onAccept?: (order: Order) => void;
  onStatusUpdate?: (orderId: string, status: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, variant, onAccept, onStatusUpdate }) => {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, label: 'Available' },
      assigned: { variant: 'default' as const, label: 'Assigned' },
      picked_up: { variant: 'default' as const, label: 'Picked Up' },
      delivered: { variant: 'outline' as const, label: 'Delivered' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'assigned':
        return { label: 'Arrived at Pickup', action: 'picked_up' };
      case 'picked_up':
        return { label: 'Mark Delivered', action: 'delivered' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction(order.status);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{order.pickup_name}</CardTitle>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Pickup</p>
              <p className="text-muted-foreground">{order.pickup_address}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Navigation className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Dropoff</p>
              <p className="text-muted-foreground">{order.dropoff_address}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold">${(order.payout_cents / 100).toFixed(2)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>{(order.distance_km * 0.621371).toFixed(1)} mi</span>
          </div>
        </div>

        {variant === 'available' && onAccept && (
          <Button 
            onClick={() => onAccept(order)} 
            className="w-full"
          >
            Accept Order
          </Button>
        )}

        {variant === 'active' && nextAction && onStatusUpdate && (
          <Button 
            onClick={() => onStatusUpdate(order.id, nextAction.action)}
            className="w-full"
          >
            {nextAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCard;