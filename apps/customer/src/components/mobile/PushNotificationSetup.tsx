import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Smartphone, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Volume2,
  Vibrate,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

interface NotificationSettings {
  newOffers: boolean;
  orderUpdates: boolean;
  scheduleReminders: boolean;
  earnings: boolean;
  emergencyAlerts: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationPermissionStatus {
  permission: NotificationPermission;
  supported: boolean;
  serviceWorkerReady: boolean;
}

export const PushNotificationSetup: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    newOffers: true,
    orderUpdates: true,
    scheduleReminders: true,
    earnings: false,
    emergencyAlerts: true,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00'
    }
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    permission: 'default',
    supported: false,
    serviceWorkerReady: false
  });

  const [testingNotification, setTestingNotification] = useState(false);
  const [customSoundAudio, setCustomSoundAudio] = useState<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  // Play custom notification sound
  const playCustomNotificationSound = async () => {
    try {
      if (!customSoundAudio) {
        const audio = new Audio('/craven-notification.caf');
        audio.volume = 0.8;
        setCustomSoundAudio(audio);
        await audio.play();
      } else {
        customSoundAudio.currentTime = 0;
        await customSoundAudio.play();
      }
    } catch (error) {
      console.warn('Could not play custom notification sound:', error);
    }
  };

  useEffect(() => {
    checkNotificationSupport();
    loadSettings();
  }, []);

  const checkNotificationSupport = async () => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Native app - check Capacitor push notification support
      try {
        const permissionStatus = await PushNotifications.checkPermissions();
        setPermissionStatus({
          permission: permissionStatus.receive === 'granted' ? 'granted' : permissionStatus.receive === 'denied' ? 'denied' : 'default',
          supported: true,
          serviceWorkerReady: true
        });
        
        // Set up native push notification listeners
        setupNativePushNotifications();
      } catch (error) {
        console.error('Native push notifications not available:', error);
        setPermissionStatus({
          permission: 'denied',
          supported: false,
          serviceWorkerReady: false
        });
      }
    } else {
      // Web app - fallback to web push
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
      
      const hasNotificationAPI = 'Notification' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      
      let supported = false;
      
      if (isIOSSafari) {
        const iosVersion = parseFloat((navigator.userAgent.match(/OS (\d+)_(\d+)/) || [])[1] + '.' + (navigator.userAgent.match(/OS (\d+)_(\d+)/) || [])[2]);
        supported = iosVersion >= 16.4 && hasNotificationAPI && hasPushManager;
      } else {
        supported = hasNotificationAPI && hasServiceWorker && hasPushManager;
      }
      
      const permission = supported ? Notification.permission : 'denied';
      
      setPermissionStatus({
        permission,
        supported,
        serviceWorkerReady: false
      });

      if (supported) {
        checkServiceWorker();
      }
    }
  };

  const setupNativePushNotifications = () => {
    // Listen for push notification registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      sendTokenToServer(token.value);
    });

    // Listen for push notification registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Listen for push notifications received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground: ' + JSON.stringify(notification));
      
      // Play custom sound if enabled and on iOS
      if (settings.sound) {
        if (Capacitor.getPlatform() === 'ios') {
          playCustomNotificationSound();
        } else {
          playNotificationSound();
        }
      }
      
      // Show toast notification
      toast({
        title: notification.title || 'New Notification',
        description: notification.body || 'You have a new notification',
      });
    });

    // Listen for push notification taps (when app is backgrounded/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      
      // Handle the notification tap - navigate to relevant screen
      const data = notification.notification.data;
      if (data?.orderId) {
        // Navigate to order details or relevant screen
        console.log('Navigate to order:', data.orderId);
      }
    });
  };

  const checkServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      setPermissionStatus(prev => ({
        ...prev,
        serviceWorkerReady: !!registration
      }));
    } catch (error) {
      console.error('Service Worker not ready:', error);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  };

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const requestPermission = async () => {
    if (!permissionStatus.supported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive"
      });
      return;
    }

    try {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Request native push notification permissions
        const permissionStatus = await PushNotifications.requestPermissions();
        
        if (permissionStatus.receive === 'granted') {
          setPermissionStatus(prev => ({ ...prev, permission: 'granted' }));
          
          // Register for push notifications
          await PushNotifications.register();
          
          toast({
            title: "Notifications Enabled",
            description: "You'll receive notifications even when the app is closed.",
          });
        } else {
          setPermissionStatus(prev => ({ ...prev, permission: 'denied' }));
          toast({
            title: "Notifications Denied",
            description: "You can enable them later in your device settings.",
            variant: "destructive"
          });
        }
      } else {
        // Web fallback
        const permission = await Notification.requestPermission();
        setPermissionStatus(prev => ({ ...prev, permission }));
        
        if (permission === 'granted') {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive important delivery notifications.",
          });
          
          await registerForPushNotifications();
        } else {
          toast({
            title: "Notifications Denied",
            description: "You can enable them later in your browser settings.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permission.",
        variant: "destructive"
      });
    }
  };

  const registerForPushNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        // Get VAPID public key from environment
        const { environment } = await import('@/config/environment');
        const vapidPublicKey = environment.VAPID_PUBLIC_KEY;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });

        // Send subscription to server
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const response = await supabase.functions.invoke('register-push-subscription', {
            body: {
              subscription,
              userId: userData.user.id,
              deviceInfo: {
                platform: navigator.platform,  
                userAgent: navigator.userAgent
              }
            }
          });

          if (response.error) {
            console.error('Failed to register push subscription:', response.error);
            throw new Error(response.error.message);
          }

          console.log('Push subscription registered successfully');
          
          toast({
            title: "Push Notifications Enabled",
            description: "You'll receive notifications even when the app is closed.",
          });
        }
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      toast({
        title: "Push Registration Failed",
        description: "Could not enable background notifications. You'll still receive in-app notifications.",
        variant: "destructive"
      });
    }
  };

  const sendTokenToServer = async (token: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const response = await supabase.functions.invoke('register-push-subscription', {
          body: {
            subscription: {
              endpoint: `fcm:${token}`, // FCM format for native apps
              keys: null // Not needed for native apps
            },
            userId: userData.user.id,
            deviceInfo: {
              platform: Capacitor.getPlatform(),
              isNative: true,
              pushToken: token
            }
          }
        });

        if (response.error) {
          console.error('Failed to register native push token:', response.error);
          throw new Error(response.error.message);
        }

        console.log('Native push token registered successfully');
        
        toast({
          title: "Background Notifications Enabled",  
          description: "You'll receive notifications even when the app is closed.",
        });
      }
    } catch (error) {
      console.error('Error registering native push token:', error);
      toast({
        title: "Token Registration Failed",
        description: "Could not register for background notifications.",
        variant: "destructive"
      });
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    // This function is kept for compatibility but functionality moved to registerForPushNotifications
    console.log('Push subscription:', subscription);
  };

  const testNotification = async () => {
    setTestingNotification(true);
    
    try {
      if (permissionStatus.permission === 'granted') {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          // Send test notification via edge function to test background notifications
          const response = await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: userData.user.id,
              title: '🚗 Test Notification!',
              message: 'This is a test to verify background notifications work.',
              data: {
                type: 'test',
                timestamp: new Date().toISOString()
              }
            }
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          toast({
            title: "Test Notification Sent",
            description: "Check if you received the notification in the background!",
          });
        }

        // Also show local notification for immediate feedback
        if (Capacitor.isNativePlatform()) {
          // Native local notification
          await PushNotifications.createChannel({
            id: 'test',
            name: 'Test Notifications',
            description: 'Test notification channel',
            importance: 5,
            visibility: 1
          });
        } else {
          // Web notification fallback
          const notification = new Notification('🚗 Test Notification!', {
            body: 'Testing background notifications...',
            icon: '/craven-logo.png',
            badge: '/craven-logo.png',
            tag: 'test-notification',
            requireInteraction: true
          });

          setTimeout(() => notification.close(), 5000);
        }

        // Play notification sound if enabled
        if (settings.sound) {
          playNotificationSound();
        }
      } else {
        toast({
          title: "Permission Required",
          description: "Please enable notifications first.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed", 
        description: "Could not send test notification.",
        variant: "destructive"
      });
    } finally {
      setTestingNotification(false);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const getPermissionStatusIcon = () => {
    switch (permissionStatus.permission) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getPermissionStatusText = () => {
    if (!permissionStatus.supported) return 'Not Supported';
    
    switch (permissionStatus.permission) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Denied';
      default: return 'Not Set';
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-background border-b border-border/50 px-4 py-3 sticky top-0 z-10 safe-area-top">
          <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
        </div>
        
        {/* Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getPermissionStatusIcon()}
                Notification Status
              </div>
              <Badge variant={permissionStatus.permission === 'granted' ? 'default' : 'secondary'}>
                {getPermissionStatusText()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissionStatus.permission !== 'granted' && (
              <Button 
                onClick={requestPermission} 
                className="w-full"
                disabled={!permissionStatus.supported}
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
            
            {permissionStatus.permission === 'granted' && (
              <Button 
                onClick={testNotification} 
                variant="outline" 
                className="w-full"
                disabled={testingNotification}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {testingNotification ? 'Sending...' : 'Test Notification'}
              </Button>
            )}

            {!permissionStatus.supported && (
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">
                    Limited Notification Support
                  </p>
                  <p className="text-xs text-orange-700">
                    {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                      <>
                        iOS Safari has limited push notification support. For the best experience, 
                        install the Crave'N app from the App Store or use "Add to Home Screen" 
                        for enhanced notifications.
                      </>
                    ) : (
                      'Push notifications are not supported on this browser. Try using Chrome, Firefox, or Safari.'
                    )}
                  </p>
                  {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                    <div className="mt-3 p-2 bg-orange-100 rounded border">
                      <p className="text-xs text-orange-800">
                        <strong>Alternative:</strong> You can still receive notifications through:
                        • SMS updates • Email alerts • In-app notifications
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Critical Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">New Delivery Offers</p>
                <p className="text-xs text-muted-foreground">Get notified of new opportunities</p>
              </div>
              <Switch 
                checked={settings.newOffers}
                onCheckedChange={(checked) => updateSetting('newOffers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Order Updates</p>
                <p className="text-xs text-muted-foreground">Status changes and customer messages</p>
              </div>
              <Switch 
                checked={settings.orderUpdates}
                onCheckedChange={(checked) => updateSetting('orderUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Emergency Alerts</p>
                <p className="text-xs text-muted-foreground">Safety and security notifications</p>
              </div>
              <Switch 
                checked={settings.emergencyAlerts}
                onCheckedChange={(checked) => updateSetting('emergencyAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Optional Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Optional Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Schedule Reminders</p>
                <p className="text-xs text-muted-foreground">Remind when to go online</p>
              </div>
              <Switch 
                checked={settings.scheduleReminders}
                onCheckedChange={(checked) => updateSetting('scheduleReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Earnings Updates</p>
                <p className="text-xs text-muted-foreground">Daily and weekly summaries</p>
              </div>
              <Switch 
                checked={settings.earnings}
                onCheckedChange={(checked) => updateSetting('earnings', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <div>
                  <p className="font-medium text-sm">Sound</p>
                  <p className="text-xs text-muted-foreground">Play notification sounds</p>
                </div>
              </div>
              <Switch 
                checked={settings.sound}
                onCheckedChange={(checked) => updateSetting('sound', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className="h-4 w-4" />
                <div>
                  <p className="font-medium text-sm">Vibration</p>
                  <p className="text-xs text-muted-foreground">Vibrate on notifications</p>
                </div>
              </div>
              <Switch 
                checked={settings.vibration}
                onCheckedChange={(checked) => updateSetting('vibration', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Enable Quiet Hours</p>
                <p className="text-xs text-muted-foreground">Reduce notifications during set hours</p>
              </div>
              <Switch 
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => 
                  updateSetting('quietHours', { ...settings.quietHours, enabled: checked })
                }
              />
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => 
                      updateSetting('quietHours', { ...settings.quietHours, start: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => 
                      updateSetting('quietHours', { ...settings.quietHours, end: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device-Specific Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-800">Device Setup Tips</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>iOS:</strong> Add to Home Screen for best notification experience</p>
                  <p><strong>Android:</strong> Allow all permissions for reliable delivery alerts</p>
                  <p><strong>Desktop:</strong> Keep browser notifications enabled</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
