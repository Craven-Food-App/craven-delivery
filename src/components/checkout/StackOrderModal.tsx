import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconClock, IconX } from '@tabler/icons-react';

interface StackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderItems: any[];
  orderCategory?: string;
}

export const StackOrderModal: React.FC<StackOrderModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderItems,
  orderCategory
}) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [recommendedStores, setRecommendedStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  // Fetch recommended stores based on order
  useEffect(() => {
    if (!isOpen) return;

    const fetchRecommendedStores = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get user's delivery address for proximity
        let userAddress = null;
        if (user) {
          const { data: address } = await supabase
            .from('delivery_addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();
          userAddress = address;
        }

        // Determine category logic:
        // - If order has food items, recommend dessert/beverage stores
        // - If order has drinks, recommend food stores
        // - If mixed, show nearby popular stores
        
        const categories = ['dessert', 'beverage', 'grocery', 'convenience'];
        const cuisineTypes = ['dessert', 'coffee', 'convenience'];
        
        // Fetch restaurants nearby that complement the order
        const { data: restaurants, error } = await supabase
          .from('restaurants')
          .select('*')
          .in('cuisine_type', cuisineTypes)
          .eq('is_active', true)
          .limit(6);

        if (error) {
          console.error('Error fetching recommended stores:', error);
          setRecommendedStores([]);
        } else {
          // Sort by rating and distance (simplified - would use actual geolocation in production)
          const sorted = (restaurants || [])
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 6);
          setRecommendedStores(sorted);
        }
      } catch (error) {
        console.error('Error in fetchRecommendedStores:', error);
        setRecommendedStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedStores();
  }, [isOpen, orderItems, orderCategory]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStackOrder = async (restaurantId: string) => {
    try {
      // Mark original order as part of a stack
      await supabase
        .from('orders')
        .update({ 
          is_stacked: true,
          stack_parent_order_id: orderId
        })
        .eq('id', orderId);

      // Navigate to restaurant to add items for stacking
      navigate(`/restaurant/${restaurantId}?stack=${orderId}`);
      onClose();
    } catch (error) {
      console.error('Error initiating stack order:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Stack Another Order?</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <IconX size={20} />
            </Button>
          </div>
          <DialogDescription className="text-base">
            Add items from nearby stores to your current delivery and save on fees!
          </DialogDescription>
        </DialogHeader>

        {/* Countdown Timer */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <IconClock size={24} className="text-orange-600" />
            <div>
              <div className="font-semibold text-orange-900">Time remaining to stack</div>
              <div className="text-3xl font-bold text-orange-600">{formatTime(timeRemaining)}</div>
            </div>
          </div>
        </div>

        {/* Recommended Stores */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Recommended for stacking</h3>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-40" />
              ))}
            </div>
          ) : recommendedStores.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {recommendedStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStackOrder(store.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 hover:shadow-md transition-all text-left"
                >
                  <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
                    {store.image_url ? (
                      <img
                        src={store.image_url}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm mb-1 line-clamp-1">{store.name}</h4>
                  <div className="text-xs text-gray-600 mb-2">{store.cuisine_type}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-orange-600">★ {store.rating?.toFixed(1) || '4.0'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{store.min_delivery_time || 20}-{store.max_delivery_time || 30} min</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No nearby stores available for stacking at the moment
            </div>
          )}
        </div>

        {/* Skip Button */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            No thanks, just deliver my order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

