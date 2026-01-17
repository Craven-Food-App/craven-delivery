import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { environment } from '@/config/environment';

interface IOSPushNotificationsProps {
  userId: string;
}

export const IOSPushNotifications = ({ userId }: IOSPushNotificationsProps) => {
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [iosVersion, setIOSVersion] = useState<number | null>(null);

  useEffect(() => {
    checkEnvironment();
    checkPermissionStatus();
    checkSubscriptionStatus();
  }, [userId]);

  const checkEnvironment = () => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect PWA mode
    const pwa = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
    setIsPWA(pwa);

    // Detect iOS version
    if (iOS) {
      const match = navigator.userAgent.match(/OS (\d+)_/);
      if (match) {
        setIOSVersion(parseInt(match[1]));
      }
    }
  };

  const checkPermissionStatus = async () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);

    try {
      // Check iOS version
      if (isIOS && iosVersion && iosVersion < 16) {
        toast.error('Push notifications require iOS 16.4 or later');
        setIsLoading(false);
        return;
      }

      // Check if PWA
      if (!isPWA) {
        toast.error('Please install the app to your home screen first', {
          description: 'Tap the Share button and select "Add to Home Screen"'
        });
        setIsLoading(false);
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        await subscribeToPush();
      } else if (permission === 'denied') {
        toast.error('Notification permission denied', {
          description: 'Please enable notifications in iOS Settings > Safari'
        });
      }
    } catch (error: any) {
      console.error('Permission error:', error);
      toast.error('Failed to request permission', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      const registration = await navigator.serviceWorker.ready;

      // Subscribe with VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: environment.VAPID_PUBLIC_KEY
      });

      // Save subscription to database
      const response = await supabase.functions.invoke('register-push-subscription', {
        body: {
          subscription: subscription.toJSON(),
          userId: userId,
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            deviceType: isIOS ? 'ios' : 'web'
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setIsSubscribed(true);
      toast.success('Push notifications enabled!', {
        description: "You'll receive order notifications even when the app is closed"
      });

      console.log('Push subscription registered successfully');
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error('Failed to enable push notifications', {
        description: error.message
      });
      throw error;
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
          setIsSubscribed(false);
          toast.success('Push notifications disabled');
        }
      }
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: userId,
          title: '🎉 Test Notification',
          message: 'If you see this, push notifications are working!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      });

      toast.success('Test notification sent!', {
        description: 'Check your notification center'
      });
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    }
  };

  // Show warning if not iOS or not PWA
  if (!isIOS || !isPWA) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            iOS Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            {!isIOS && 'Push notifications are optimized for iOS devices.'}
            {isIOS && !isPWA && 'Please install the app to your home screen to enable push notifications.'}
          </p>
          {isIOS && !isPWA && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-semibold mb-2">To install:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Tap the Share button in Safari</li>
                <li>Select "Add to Home Screen"</li>
                <li>Return here and enable notifications</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show iOS version warning
  if (iosVersion && iosVersion < 16) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            iOS Version Too Old
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Push notifications require iOS 16.4 or later. Your device is running iOS {iosVersion}.
            Please update your device to enable this feature.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Active</span>
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Inactive</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">iOS {iosVersion}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600">
          {isSubscribed 
            ? "You'll receive order notifications even when the app is closed or your phone is locked."
            : "Enable push notifications to get instant alerts for new orders, even when the app is closed."}
        </p>

        {/* Actions */}
        <div className="space-y-2">
          {!isSubscribed ? (
            <Button
              onClick={requestPermission}
              disabled={isLoading || permissionStatus === 'denied'}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isLoading ? 'Setting up...' : 'Enable Push Notifications'}
            </Button>
          ) : (
            <>
              <Button
                onClick={sendTestNotification}
                variant="outline"
                className="w-full"
              >
                Send Test Notification
              </Button>
              <Button
                onClick={unsubscribe}
                variant="outline"
                disabled={isLoading}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                Disable Notifications
              </Button>
            </>
          )}
        </div>

        {/* Permission denied help */}
        {permissionStatus === 'denied' && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm font-semibold text-red-800 mb-1">Permission Denied</p>
            <p className="text-xs text-red-700">
              To enable notifications: Go to iOS Settings → Safari → Notifications → Allow Notifications
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Notifications work even when app is closed</p>
          <p>• Requires iOS 16.4 or later</p>
          <p>• Must be installed as PWA (home screen)</p>
        </div>
      </CardContent>
    </Card>
  );
};

