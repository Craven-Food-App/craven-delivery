import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check, Clock, AlertCircle, MapPin, DollarSign, Truck, Package, Zap, Award, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

interface NotificationsPageProps {
  userId: string;
}

const NotificationsPage = ({ userId }: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('order_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // Monitor orders for driver-specific alerts
  useEffect(() => {
    if (!userId) return;

    const checkOrderAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get assigned orders for this driver - check both order_assignments and orders tables
        const { data: assignedOrders, error: assignedError } = await supabase
          .from('order_assignments')
          .select('*, order:orders(*)')
          .eq('driver_id', user.id)
          .eq('status', 'accepted');

        // Also check orders table directly for driver_id
        const { data: directOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('driver_id', user.id)
          .in('order_status', ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit']);

        const allOrders = [
          ...(assignedOrders?.map(a => a.order).filter(Boolean) || []),
          ...(directOrders || [])
        ];

        if (allOrders.length === 0) return;

        const now = new Date();
        const alertsToCreate: Partial<Notification>[] = [];

        for (const order of allOrders) {
          if (!order) continue;

          // Check if order is ready for pickup
          if (order.order_status === 'ready') {
            // Check if notification already exists
            const { data: existingNotif } = await supabase
              .from('order_notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('order_id', order.id)
              .eq('notification_type', 'order_ready_pickup')
              .eq('is_read', false)
              .limit(1);

            if (!existingNotif || existingNotif.length === 0) {
              alertsToCreate.push({
                title: 'Order Ready for Pickup',
                message: `Order #${order.id.slice(0, 8)} is ready for pickup`,
                notification_type: 'order_ready_pickup',
                order_id: order.id
              });
            }
          }

          // Check if delivery time is near (within 5 minutes)
          if (order.estimated_delivery_time) {
            const deliveryTime = new Date(order.estimated_delivery_time);
            const timeUntilDelivery = deliveryTime.getTime() - now.getTime();
            const fiveMinutes = 5 * 60 * 1000;

            if (timeUntilDelivery > 0 && timeUntilDelivery <= fiveMinutes && order.order_status === 'in_transit') {
              const { data: existingNotif } = await supabase
                .from('order_notifications')
                .select('id')
                .eq('user_id', user.id)
                .eq('order_id', order.id)
                .eq('notification_type', 'delivery_time_near')
                .eq('is_read', false)
                .limit(1);

              if (!existingNotif || existingNotif.length === 0) {
                const minutesLeft = Math.ceil(timeUntilDelivery / 60000);
                alertsToCreate.push({
                  title: 'Delivery Time Approaching',
                  message: `You have ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} until delivery time for order #${order.id.slice(0, 8)}`,
                  notification_type: 'delivery_time_near',
                  order_id: order.id
                });
              }
            }
          }

          // Check if delivery is late (past estimated delivery time)
          if (order.estimated_delivery_time && order.order_status !== 'delivered') {
            const deliveryTime = new Date(order.estimated_delivery_time);
            if (now > deliveryTime) {
              const { data: existingNotif } = await supabase
                .from('order_notifications')
                .select('id')
                .eq('user_id', user.id)
                .eq('order_id', order.id)
                .eq('notification_type', 'delivery_late')
                .eq('is_read', false)
                .limit(1);

              if (!existingNotif || existingNotif.length === 0) {
                const minutesLate = Math.floor((now.getTime() - deliveryTime.getTime()) / 60000);
                alertsToCreate.push({
                  title: 'Delivery Running Late',
                  message: `Order #${order.id.slice(0, 8)} is ${minutesLate} minute${minutesLate !== 1 ? 's' : ''} past the scheduled delivery time`,
                  notification_type: 'delivery_late',
                  order_id: order.id
                });
              }
            }
          }
        }

        // Create notifications
        for (const alert of alertsToCreate) {
          await supabase
            .from('order_notifications')
            .insert({
              user_id: user.id,
              order_id: alert.order_id,
              notification_type: alert.notification_type,
              title: alert.title || '',
              message: alert.message || '',
              is_read: false
            });
        }

        // Check for challenge notifications
        const { data: challenges } = await supabase
          .from('driver_promotion_participation')
          .select('id, driver_id, promotion_id, progress, completed')
          .eq('driver_id', user.id)
          .eq('completed', false) as any;

        if (challenges) {
          for (const challenge of challenges) {
            const promotion = challenge.promotion;
            if (!promotion) continue;

            // Check if challenge deadline is approaching (within 24 hours)
            if (promotion.end_date) {
              const deadline = new Date(promotion.end_date);
              const timeUntilDeadline = deadline.getTime() - now.getTime();
              const twentyFourHours = 24 * 60 * 60 * 1000;

              if (timeUntilDeadline > 0 && timeUntilDeadline <= twentyFourHours) {
                const { data: existingNotif } = await supabase
                  .from('order_notifications')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('notification_type', 'challenge_deadline')
                  .like('message', `%${promotion.id}%`)
                  .eq('is_read', false)
                  .limit(1);

                if (!existingNotif || existingNotif.length === 0) {
                  const hoursLeft = Math.ceil(timeUntilDeadline / (60 * 60 * 1000));
                  await supabase
                    .from('order_notifications')
                    .insert({
                      user_id: user.id,
                      notification_type: 'challenge_deadline',
                      title: 'Challenge Deadline Approaching',
                      message: `Challenge "${promotion.title || 'Challenge'}" ends in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
                      is_read: false
                    });
                }
              }
            }
          }
        }

        // Refresh notifications after creating alerts
        fetchNotifications();
      } catch (error) {
        console.error('Error checking order alerts:', error);
      }
    };

    // Check alerts immediately and then every 10 seconds for more responsive alerts
    checkOrderAlerts();
    const interval = setInterval(checkOrderAlerts, 10000);

    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  // Set up real-time subscription for order status changes
  useEffect(() => {
    if (!userId) return;

    let orderChannel: any;

    const setupOrderSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      orderChannel = supabase
        .channel(`driver_orders_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `driver_id=eq.${user.id}`
          },
          async (payload) => {
            const order = payload.new as any;
            
            // Immediately check if we need to create alerts for this order
            const now = new Date();
            
            // Check if order is ready for pickup
            if (order.order_status === 'ready') {
              const { data: existingNotif } = await supabase
                .from('order_notifications')
                .select('id')
                .eq('user_id', user.id)
                .eq('order_id', order.id)
                .eq('notification_type', 'order_ready_pickup')
                .eq('is_read', false)
                .limit(1);

              if (!existingNotif || existingNotif.length === 0) {
                await supabase
                  .from('order_notifications')
                  .insert({
                    user_id: user.id,
                    order_id: order.id,
                    notification_type: 'order_ready_pickup',
                    title: 'Order Ready for Pickup',
                    message: `Order #${order.id.slice(0, 8)} is ready for pickup`,
                    is_read: false
                  });
                fetchNotifications();
              }
            }
          }
        )
        .subscribe();
    };

    setupOrderSubscription();

    return () => {
      if (orderChannel) {
        supabase.removeChannel(orderChannel);
      }
    };
  }, [userId, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('order_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from('order_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('order_notifications')
        .delete()
        .eq('id', notificationId);
      
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return <Truck className="h-5 w-5 text-orange-500" />;
      case 'order_completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'location_update':
        return <MapPin className="h-5 w-5 text-orange-500" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'order_ready_pickup':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'delivery_time_near':
        return <Timer className="h-5 w-5 text-yellow-500" />;
      case 'delivery_late':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'challenge_deadline':
      case 'challenge_completed':
        return <Award className="h-5 w-5 text-purple-500" />;
      case 'challenge_new':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'urgent':
      case 'admin_message':
      case 'support_message':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return 'border-orange-200 bg-orange-50';
      case 'order_completed':
        return 'border-green-200 bg-green-50';
      case 'payment_received':
        return 'border-green-200 bg-green-50';
      case 'location_update':
        return 'border-orange-200 bg-orange-50';
      case 'reminder':
        return 'border-orange-200 bg-orange-50';
      case 'order_ready_pickup':
        return 'border-blue-200 bg-blue-50';
      case 'delivery_time_near':
        return 'border-yellow-200 bg-yellow-50';
      case 'delivery_late':
        return 'border-red-200 bg-red-50';
      case 'challenge_deadline':
      case 'challenge_completed':
      case 'challenge_new':
        return 'border-purple-200 bg-purple-50';
      case 'urgent':
      case 'admin_message':
      case 'support_message':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-orange-200 bg-orange-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 safe-area-top">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">Stay updated with your deliveries</p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={markAllAsRead}
            variant="outline" 
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className="mb-4">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No notifications yet</h3>
            <p className="text-sm text-gray-400 text-center">
              You'll receive notifications about new orders, payments, and updates here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all duration-200 hover:shadow-md ${
                !notification.is_read 
                  ? `${getNotificationColor(notification.notification_type)} border-l-4 ${
                      notification.notification_type === 'urgent' || 
                      notification.notification_type === 'admin_message' || 
                      notification.notification_type === 'support_message'
                        ? 'border-l-red-500' 
                        : 'border-l-orange-500'
                    }` 
                  : 'bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-semibold text-sm ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className={`w-2 h-2 rounded-full ${
                              notification.notification_type === 'urgent' || 
                              notification.notification_type === 'admin_message' || 
                              notification.notification_type === 'support_message'
                                ? 'bg-red-500' 
                                : 'bg-orange-500'
                            }`}></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                          <div className="flex gap-2">
                            {!notification.is_read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                Mark as read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
