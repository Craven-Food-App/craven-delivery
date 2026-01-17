// @ts-nocheck
// Force rebuild to clear cache - v2
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { playNotificationSound } from '@/utils/audioUtils';
import { useIOSNotifications } from '@/hooks/useIOSNotifications';
import { IOSNotificationBanner } from '@/components/mobile/IOSNotificationBanner';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

interface PushNotificationManagerProps {
  userId: string;
}

const PushNotificationManager = ({ userId }: PushNotificationManagerProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { showNotification, notifications: iosNotifications, dismissNotification } = useIOSNotifications();

  useEffect(() => {
    if (!userId) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('order_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();

    // Set up real-time subscription for push notifications (generic)
    const channelPush = supabase
      .channel(`user_notifications_${userId}`)
      .on('broadcast', { event: 'push_notification' }, async (payload) => {
        const { title, message, data } = payload.payload || {};

        // Show iOS-style notification instead of toast
        showNotification(title || 'Notification', message || '', 5000);
        
        // Get and play the default notification sound
        try {
          const { data: defaultSetting } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('is_default', true)
            .eq('is_active', true)
            .single();
            
          if (defaultSetting) {
            await playNotificationSound(
              defaultSetting.sound_file,
              defaultSetting.repeat_count,
              defaultSetting.repeat_interval_ms
            );
          } else {
            // Fallback to built-in notification sound
            await playNotificationSound('/notification.mp3', 2, 300);
          }
        } catch (error) {
          console.error('Error playing notification sound:', error);
          // Fallback to built-in sound
          try { await playNotificationSound('/notification.mp3', 2, 300); } catch {}
        }

        const newNotification: Notification = {
          id: crypto.randomUUID(),
          title: title || 'Notification',
          message: message || '',
          notification_type: data?.type || 'general',
          is_read: false,
          created_at: new Date().toISOString(),
          order_id: data?.order_id || data?.orderId,
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    // Also listen for order assignment broadcasts sent to driver-specific channel
    const channelAssign = supabase
      .channel(`driver_${userId}`)
      .on('broadcast', { event: 'order_assignment' }, async (payload) => {
        const data: any = payload.payload || {};
        const pickup = typeof data.pickup_address === 'string'
          ? data.pickup_address
          : [data.pickup_address?.address, data.pickup_address?.city, data.pickup_address?.state]
              .filter(Boolean).join(', ');
        const title = `New Order: ${data.restaurant_name || 'Pickup'}`;
        const message = `Pickup at ${pickup || 'restaurant'}`;

        // Show iOS-style notification instead of toast
        showNotification(title, message, 8000); // Longer duration for order assignments
        
        // Get and play the default notification sound
        try {
          const { data: defaultSetting } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('is_default', true)
            .eq('is_active', true)
            .single();
            
          if (defaultSetting) {
            await playNotificationSound(
              defaultSetting.sound_file,
              defaultSetting.repeat_count,
              defaultSetting.repeat_interval_ms
            );
          } else {
            // Fallback to built-in notification sound
            await playNotificationSound('/notification.mp3', 2, 300);
          }
        } catch (error) {
          console.error('Error playing notification sound:', error);
          // Fallback to built-in sound
          try { await playNotificationSound('/notification.mp3', 2, 300); } catch {}
        }

        const newNotification: Notification = {
          id: crypto.randomUUID(),
          title,
          message,
          notification_type: 'order_assignment',
          is_read: false,
          created_at: new Date().toISOString(),
          order_id: data.order_id,
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    // Also listen for database changes
    const dbChannel = supabase
      .channel('notification_changes')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Show iOS-style notification instead of toast
          showNotification(newNotification.title, newNotification.message, 5000);
          
          // Play default notification sound
          try {
            const { data: defaultSetting } = await supabase
              .from('notification_settings')
              .select('*')
              .eq('is_default', true)
              .eq('is_active', true)
              .single();
              
            if (defaultSetting) {
              await playNotificationSound(
                defaultSetting.sound_file,
                defaultSetting.repeat_count,
                defaultSetting.repeat_interval_ms
              );
            }
          } catch (error) {
            console.error('Error playing notification sound:', error);
          }
        }
      )
      .subscribe();

    return () => {
      channelPush.unsubscribe();
      channelAssign.unsubscribe();
      dbChannel.unsubscribe();
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('order_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('order_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  return (
    <>
      {/* iOS Notification Banners */}
      {iosNotifications.map((notification) => (
        <IOSNotificationBanner
          key={notification.id}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
      
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {!notification.is_read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default PushNotificationManager;