/**
 * Restaurant Order Notification System
 * Real-time alerts with sound for new orders
 * Competes with DoorDash's merchant tablet notification system
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface OrderNotification {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  items: any[];
  deliveryMethod: string;
  timestamp: Date;
}

export function OrderNotificationSystem({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/craven-notification.wav');
    audioRef.current.volume = 0.7;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!restaurantId || !notificationsEnabled) return;

    // Subscribe to new orders for this restaurant
    const channel = supabase
      .channel(`restaurant_orders_${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload: any) => {
          console.log('New order received:', payload);
          
          // Fetch full order details
          const { data: order, error } = await supabase
            .from('orders')
            .select(`
              *,
              order_items(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error || !order) {
            console.error('Error fetching order details:', error);
            return;
          }

          const notification: OrderNotification = {
            orderId: order.id,
            orderNumber: order.id.substring(0, 8).toUpperCase(),
            customerName: order.customer_name || 'Customer',
            totalAmount: order.total_amount,
            items: (order.order_items || []) as any,
            deliveryMethod: order.delivery_method || 'delivery',
            timestamp: new Date(order.created_at)
          };

          // Add to notifications
          setNotifications(prev => [notification, ...prev]);
          setNewOrderCount(prev => prev + 1);

          // Play sound
          if (soundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => {
              console.error('Failed to play notification sound:', err);
            });
          }

          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 New Order!', {
              body: `Order #${notification.orderNumber} - $${(notification.totalAmount / 100).toFixed(2)}`,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: `order-${notification.orderId}`,
              requireInteraction: true,
              data: { orderId: notification.orderId }
            });
          }

          // Show toast notification
          toast({
            title: '🔔 New Order!',
            description: `Order #${notification.orderNumber} - $${(notification.totalAmount / 100).toFixed(2)}`,
            duration: 10000,
          });

          // Auto-dismiss after 30 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.orderId !== notification.orderId));
            setNewOrderCount(prev => Math.max(0, prev - 1));
          }, 30000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, soundEnabled, notificationsEnabled, toast]);

  const dismissNotification = (orderId: string) => {
    setNotifications(prev => prev.filter(n => n.orderId !== orderId));
    setNewOrderCount(prev => Math.max(0, prev - 1));
  };

  const dismissAll = () => {
    setNotifications([]);
    setNewOrderCount(0);
  };

  const handleViewOrder = (orderId: string) => {
    // Navigate to order details or open modal
    window.location.href = `/merchant-portal/orders/${orderId}`;
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-orange-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold">Order Notifications</p>
                <p className="text-sm text-gray-600">
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            <div className="flex items-center gap-2 pl-4 border-l">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-orange-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold">Sound</p>
                <p className="text-sm text-gray-600">
                  {soundEnabled ? 'On' : 'Off'}
                </p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>

          {newOrderCount > 0 && (
            <Badge className="bg-red-500 text-white text-lg px-4 py-2">
              {newOrderCount} New Order{newOrderCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </Card>

      {/* Active Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Pending Orders</h3>
            <Button variant="ghost" size="sm" onClick={dismissAll}>
              Dismiss All
            </Button>
          </div>

          {notifications.map((notification) => (
            <Card 
              key={notification.orderId}
              className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 animate-in slide-in-from-top"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-orange-500 text-white text-lg px-3 py-1">
                      NEW
                    </Badge>
                    <h4 className="font-bold text-xl">
                      Order #{notification.orderNumber}
                    </h4>
                    <Badge variant="outline">
                      {notification.deliveryMethod === 'delivery' ? '🚗 Delivery' : '📦 Pickup'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-semibold">{notification.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-semibold text-orange-600 text-lg">
                        ${(notification.totalAmount / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Items:</p>
                    <div className="flex flex-wrap gap-2">
                      {notification.items.slice(0, 3).map((item, idx) => (
                        <Badge key={idx} variant="secondary">
                          {item.quantity}x {item.name || 'Item'}
                        </Badge>
                      ))}
                      {notification.items.length > 3 && (
                        <Badge variant="secondary">
                          +{notification.items.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Received {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => handleViewOrder(notification.orderId)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 whitespace-nowrap"
                  >
                    View Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => dismissNotification(notification.orderId)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No Active Notifications */}
      {notifications.length === 0 && notificationsEnabled && (
        <Card className="p-8 text-center">
          <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-lg mb-2">No New Orders</h3>
          <p className="text-gray-600">
            You'll be notified here when new orders arrive
          </p>
        </Card>
      )}
    </div>
  );
}

