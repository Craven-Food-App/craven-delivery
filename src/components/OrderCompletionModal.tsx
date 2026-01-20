import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  IconCheck, 
  IconClock, 
  IconToolsKitchen2, 
  IconTruck, 
  IconMapPin,
  IconChevronRight
} from '@tabler/icons-react';
import dayjs from 'dayjs';

interface OrderCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  // Optional override for status when used in test portals (avoids RLS / update issues)
  testStatusOverride?: string;
}

interface OrderDetails {
  id: string;
  order_status: string;
  estimated_delivery_time: string;
  delivery_fee_cents: number;
  restaurants?: {
    id: string;
    name: string;
    image_url?: string;
  };
  order_items?: Array<{
    id: string;
    menu_items?: {
      restaurant_id?: string;
    };
  }>;
}

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Received', icon: IconCheck },
  { key: 'confirmed', label: 'Restaurant Confirmed', icon: IconCheck },
  { key: 'preparing', label: 'Preparing Your Order', icon: IconToolsKitchen2 },
  { key: 'ready', label: 'Ready for Pickup', icon: IconCheck },
  { key: 'picked_up', label: 'Feeder Picked Up', icon: IconTruck },
  { key: 'in_transit', label: 'On The Way', icon: IconTruck },
  { key: 'delivered', label: 'Delivered', icon: IconMapPin },
];

export const OrderCompletionModal: React.FC<OrderCompletionModalProps> = ({
  isOpen,
  onClose,
  orderId,
  testStatusOverride
}) => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDoubleUp, setIsDoubleUp] = useState(false);
  const [cravemoreSavings, setCravemoreSavings] = useState<number>(0);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order with restaurant
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_status,
          estimated_delivery_time,
          delivery_fee_cents,
          restaurants (
            id,
            name,
            image_url
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrder(orderData);

      // Fetch order items separately to check for "Double Up"
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          menu_items (
            id,
            restaurant_id
          )
        `)
        .eq('order_id', orderId);

      if (!itemsError && orderItems && Array.isArray(orderItems)) {
        // Check if order is "Double Up" (items from 2+ different restaurants)
        const restaurantIds = new Set(
          orderItems
            .map((item: any) => item.menu_items?.restaurant_id)
            .filter(Boolean)
        );
        setIsDoubleUp(restaurantIds.size > 1);
      }

      // Calculate CraveMore savings (delivery fee that would be waived)
      if (orderData.delivery_fee_cents) {
        setCravemoreSavings(orderData.delivery_fee_cents);
      }

      // Set up real-time subscription for order status updates
      const channel = supabase
        .channel(`order-completion-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          (payload) => {
            const updatedOrder = payload.new as any;
            setOrder((prev) => prev ? { ...prev, ...updatedOrder } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Order Received';
      case 'confirmed': return 'Restaurant Confirmed';
      case 'preparing': return 'Preparing Your Order';
      case 'ready': return 'Ready for Pickup';
      case 'picked_up': return 'Feeder Picked Up';
      case 'in_transit': return 'On The Way';
      case 'delivered': return 'Delivered';
      default: return 'Order Received';
    }
  };

  const getStatusDescription = (status: string, restaurantName: string): string => {
    switch (status) {
      case 'pending':
        return 'Your order has been received and is being processed.';
      case 'confirmed':
        return `${restaurantName} has confirmed your order.`;
      case 'preparing':
        return `${restaurantName} is preparing your order. Your Feeder is heading there now.`;
      case 'ready':
        return `Your order is ready for pickup. Your Feeder is on the way.`;
      case 'picked_up':
        return `Your Feeder has picked up your order and is on the way to you.`;
      case 'in_transit':
        return `Your order is on the way. Your Feeder will arrive soon.`;
      case 'delivered':
        return `Your order has been delivered. Enjoy!`;
      default:
        return 'Your order is being processed.';
    }
  };

  const getCurrentStepIndex = (status: string): number => {
    const index = ORDER_STEPS.findIndex(step => step.key === status);
    return index >= 0 ? index : 0;
  };

  const formatDeliveryTime = (estimatedTime: string): string => {
    if (!estimatedTime) return '';
    const deliveryTime = dayjs(estimatedTime);
    const now = dayjs();
    const diffMinutes = deliveryTime.diff(now, 'minute');
    
    if (diffMinutes < 0) {
      return 'Arriving soon';
    } else if (diffMinutes < 60) {
      return `Early ${deliveryTime.format('h:mm A')}`;
    } else {
      return deliveryTime.format('MMM D, h:mm A');
    }
  };

  const handleOrderDetails = () => {
    onClose();
    navigate(`/track-order/${orderId}`);
  };

  const handleStartTrial = () => {
    onClose();
    navigate('/crave-more-subscription');
  };

  // Effective status: use test override when provided (for Testing Portal),
  // otherwise fall back to the order status from the database
  const effectiveStatus = testStatusOverride || order?.order_status || 'pending';
  const currentStepIndex = getCurrentStepIndex(effectiveStatus);
  const restaurant = order?.restaurants;
  const restaurantName = restaurant?.name || 'Restaurant';
  const restaurantLogo = restaurant?.image_url;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[90vh] rounded-t-2xl p-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {loading ? (
          <div className="px-4 pb-4 flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading order details...</p>
            </div>
          </div>
        ) : !order ? (
          <div className="px-4 pb-4 text-center py-8">
            <p className="text-sm text-gray-600">Unable to load order details.</p>
          </div>
        ) : (
          <div className="px-4 pb-4">
          {/* Double Up Title */}
          {isDoubleUp && (
            <div className="text-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Double Up</h2>
            </div>
          )}

          {/* Main Status Text with Restaurant Logo */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900 flex-1">
              {getStatusText(order?.order_status || 'pending')}
            </h3>
            {restaurantLogo && (
              <img 
                src={restaurantLogo} 
                alt={restaurantName}
                className="w-12 h-12 rounded-lg object-cover ml-3"
              />
            )}
          </div>

          {/* Estimated Delivery Time */}
          {order?.estimated_delivery_time && (
            <div className="mb-4">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <IconClock size={16} />
                <span>{formatDeliveryTime(order.estimated_delivery_time)}</span>
              </div>
            </div>
          )}

          {/* Status Progress Bar */}
          <div className="mb-4">
            <div className="relative flex items-center justify-between mb-3">
              {/* Connecting lines */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" style={{ margin: '0 16px' }} />
              <div 
                className="absolute top-4 left-0 h-0.5 bg-green-500 z-0 transition-all duration-300"
                style={{ 
                  margin: '0 16px',
                  width: `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%`
                }}
              />
              
              {/* Step icons */}
              {ORDER_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <StepIcon size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Step labels - hidden on mobile, shown on larger screens if needed */}
            <div className="hidden sm:flex justify-between text-xs text-gray-500 mt-2">
              {ORDER_STEPS.map((step) => (
                <span key={step.key} className="text-center flex-1 truncate px-1">
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {/* Status Description */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {getStatusDescription(order?.order_status || 'pending', restaurantName)}
            </p>
          </div>

          {/* CraveMore Promotion */}
          {cravemoreSavings > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    Try CraveMore now, get instant credits
                  </p>
                  <p className="text-xs opacity-90">
                    You'll receive a ${(cravemoreSavings / 100).toFixed(2)} credit on this order with a free CraveMore trial.
                  </p>
                </div>
                <button
                  onClick={handleStartTrial}
                  className="ml-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <IconChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Order Details Button */}
          <div className="flex justify-end">
            <button
              onClick={handleOrderDetails}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              Order Details
            </button>
          </div>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

