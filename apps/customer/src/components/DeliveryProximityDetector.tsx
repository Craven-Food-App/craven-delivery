import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Package, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface DeliveryProximityDetectorProps {
  activeOrder: Order | null;
  onCompleteDelivery: (orderId: string) => void;
}

const DeliveryProximityDetector: React.FC<DeliveryProximityDetectorProps> = ({ 
  activeOrder, 
  onCompleteDelivery 
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [isNearDelivery, setIsNearDelivery] = useState(false);
  const { toast } = useToast();

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Track user location
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'picked_up') return;

    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.warn('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation?.clearWatch(watchId);
      }
    };
  }, [activeOrder]);

  // Check proximity to delivery location
  useEffect(() => {
    if (!activeOrder || !userLocation || activeOrder.status !== 'picked_up') {
      setIsNearDelivery(false);
      return;
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      activeOrder.dropoff_lat,
      activeOrder.dropoff_lng
    );

    // Consider "near" if within 100 meters (about 1 block)
    const isNear = distance <= 100;
    
    if (isNear && !isNearDelivery) {
      setIsNearDelivery(true);
      setShowDeliveryPrompt(true);
      
      // Show toast notification
      toast({
        title: "📍 You've arrived!",
        description: "You're near the delivery location. Ready to complete delivery?",
      });
    } else if (!isNear && isNearDelivery) {
      setIsNearDelivery(false);
    }
  }, [userLocation, activeOrder, isNearDelivery, toast]);

  const handleCompleteDelivery = () => {
    if (!activeOrder) return;
    
    onCompleteDelivery(activeOrder.id);
    setShowDeliveryPrompt(false);
    setIsNearDelivery(false);
    
    toast({
      title: "🎉 Delivery Completed!",
      description: `Great job! You've earned $${(activeOrder.payout_cents / 100).toFixed(2)}`,
    });
  };

  const handleDismiss = () => {
    setShowDeliveryPrompt(false);
    // Don't reset isNearDelivery so we don't spam notifications
  };

  if (!activeOrder || activeOrder.status !== 'picked_up') {
    return null;
  }

  return (
    <>
      {/* Proximity indicator */}
      {isNearDelivery && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">Near delivery location</span>
        </div>
      )}

      {/* Delivery completion dialog */}
      <AlertDialog open={showDeliveryPrompt} onOpenChange={setShowDeliveryPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Complete Delivery?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You've arrived at the delivery location:</p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{activeOrder.dropoff_name}</p>
                <p className="text-sm text-muted-foreground">{activeOrder.dropoff_address}</p>
              </div>
              <p>Have you successfully delivered the order to the customer?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={handleDismiss}>
              Not Yet
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompleteDelivery}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeliveryProximityDetector;