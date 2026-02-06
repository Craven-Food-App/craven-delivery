import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Text, 
  Title, 
  Button, 
  Group, 
  ActionIcon, 
  Paper, 
  Divider,
  Switch,
  Modal,
  Stack,
  Loader,
  Badge
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconChevronRight,
  IconBell,
  IconBellOff,
  IconDeviceMobile,
  IconMessage,
  IconInfoCircle
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// ─── Notification Category Types ───────────────────────────────────────────

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  hasSMS: boolean;
  icon: 'order' | 'store' | 'special' | 'suggestion' | 'reminder' | 'app';
}

// ─── Category Definitions (source of truth for customer notification types) ─

const notificationCategories: NotificationSetting[] = [
  {
    id: 'order_updates',
    name: 'Order Updates',
    description: 'Push updates about your order status to your mobile number on file. Get notified when your order is confirmed, being prepared, picked up, and delivered.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: true,
    icon: 'order'
  },
  {
    id: 'store_offers',
    name: 'Store Offers',
    description: 'Deals and promotions from your favorite stores. Get notified when stores near you are running specials or limited-time offers.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false,
    icon: 'store'
  },
  {
    id: 'craven_specials',
    name: "Crave'n Specials",
    description: "Exclusive deals and offers provided by Crave'n. These are platform-wide promotions, discounts, and seasonal specials you won't want to miss.",
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false,
    icon: 'special'
  },
  {
    id: 'suggestions',
    name: 'Suggestions',
    description: 'Helpful nudges based on your activity. For example: "Your order is ready for pickup — head over now!" or "Based on your favorites, you might love this new spot."',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false,
    icon: 'suggestion'
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Timely reminders so you never miss a beat. For example: "Your delivery window is approaching" or "You left items in your cart — ready to check out?"',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false,
    icon: 'reminder'
  },
  {
    id: 'app_updates',
    name: 'App Updates',
    description: "Stay in the loop on what's new. Get notified about app updates, new features, maintenance windows, and important system announcements.",
    pushEnabled: false,
    smsEnabled: false,
    hasSMS: false,
    icon: 'app'
  }
];

// ─── Category ID constants (used by backend when sending notifications) ────

export const NOTIFICATION_CATEGORIES = {
  ORDER_UPDATES: 'order_updates',
  STORE_OFFERS: 'store_offers',
  CRAVEN_SPECIALS: 'craven_specials',
  SUGGESTIONS: 'suggestions',
  REMINDERS: 'reminders',
  APP_UPDATES: 'app_updates',
} as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES];

// ─── Component ─────────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { cartCount } = useCart();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSetting[]>(notificationCategories);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // ─── Load saved preferences from database ──────────────────────────────

  const loadUserPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('category, push_enabled, sms_enabled')
        .eq('user_id', user.id);

      if (error) {
        // If columns don't exist yet (migration not applied), silently use defaults
        const msg = error?.message || JSON.stringify(error);
        if (msg.includes('does not exist') || msg.includes('column') || error.code === '42703') {
          console.warn('Notification preference columns not yet available — using defaults.');
        } else {
          console.error('Error loading notification preferences:', msg, error.code);
        }
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setSettings(prev => prev.map(setting => {
          const pref = data.find((p: any) => p.category === setting.id);
          if (pref) {
            return {
              ...setting,
              pushEnabled: pref.push_enabled ?? setting.pushEnabled,
              smsEnabled: pref.sms_enabled ?? setting.smsEnabled
            };
          }
          return setting;
        }));
      }
    } catch (error: any) {
      console.error('Error loading notification preferences:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Check push notification permission status ──────────────────────────

  const checkPushPermission = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await PushNotifications.checkPermissions();
        setPushPermissionStatus(permStatus.receive as any);
      } else if ('Notification' in window) {
        setPushPermissionStatus(Notification.permission as any);
      }
    } catch {
      setPushPermissionStatus('unknown');
    }
  }, []);

  useEffect(() => {
    loadUserPreferences();
    checkPushPermission();
  }, [loadUserPreferences, checkPushPermission]);

  // ─── Register device for push notifications (native + web) ─────────────

  const ensurePushRegistered = async (): Promise<boolean> => {
    try {
      // Native platform (Android / iOS) via Capacitor
      if (Capacitor.isNativePlatform()) {
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== 'granted') {
            toast({
              title: 'Permission Required',
              description: 'Please enable push notifications in your device settings to receive alerts.',
              variant: 'destructive'
            });
            setPushPermissionStatus('denied');
            return false;
          }
        }
        setPushPermissionStatus('granted');

        // Register for FCM/APNS and send token to backend
        return new Promise<boolean>((resolve) => {
          PushNotifications.addListener('registration', async (token) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { resolve(false); return; }

              const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                  user_id: user.id,
                  endpoint: `fcm:${token.value}`,
                  p256dh_key: 'native',
                  auth_key: 'native',
                  device_type: Capacitor.getPlatform(),
                  is_native: true,
                  push_token: token.value,
                  is_active: true,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id,endpoint'
                });

              if (error) {
                console.error('Failed to register native push token:', error);
                // Fallback: try edge function
                await supabase.functions.invoke('register-push-subscription', {
                  body: {
                    subscription: { endpoint: `fcm:${token.value}`, keys: null },
                    userId: user.id,
                    deviceInfo: {
                      platform: Capacitor.getPlatform(),
                      isNative: true,
                      pushToken: token.value
                    }
                  }
                });
              }
              resolve(true);
            } catch (err) {
              console.error('Push registration callback error:', err);
              resolve(false);
            }
          });

          PushNotifications.addListener('registrationError', (err) => {
            console.error('Push registration error:', err);
            resolve(false);
          });

          PushNotifications.register();

          // Timeout after 10s
          setTimeout(() => resolve(false), 10000);
        });
      }

      // Web browser push (Service Worker + Web Push API)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast({
            title: 'Permission Required',
            description: 'Please allow notifications in your browser to receive push alerts.',
            variant: 'destructive'
          });
          setPushPermissionStatus('denied');
          return false;
        }
        setPushPermissionStatus('granted');

        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (vapidKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return false;

          const subJson = subscription.toJSON();
          await supabase.functions.invoke('register-push-subscription', {
            body: {
              subscription: {
                endpoint: subJson.endpoint,
                keys: subJson.keys
              },
              userId: user.id,
              deviceInfo: {
                platform: 'web',
                isNative: false,
                userAgent: navigator.userAgent
              }
            }
          });
          return true;
        }
      }

      return true;
    } catch (err) {
      console.error('Error ensuring push registration:', err);
      return false;
    }
  };

  // ─── Save preference to database ───────────────────────────────────────

  const saveUserPreference = async (category: string, pushEnabled: boolean, smsEnabled: boolean) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Please sign in to update preferences.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          category,
          push_enabled: pushEnabled,
          sms_enabled: smsEnabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,category'
        });

      if (error) {
        const msg = error?.message || JSON.stringify(error);
        console.error('Error saving notification preference:', msg, error.code);
        
        // If columns don't exist, show helpful message
        if (msg.includes('does not exist') || msg.includes('column') || error.code === '42703') {
          toast({ title: 'Setup Required', description: 'Notification preferences database needs a migration update. Contact support.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: 'Failed to save preference. Please try again.', variant: 'destructive' });
        }
        return;
      }

      // Update local state
      setSettings(prev => prev.map(s =>
        s.id === category
          ? { ...s, pushEnabled, smsEnabled }
          : s
      ));

      toast({ title: 'Saved', description: 'Notification preference updated.' });
    } catch (error: any) {
      console.error('Error saving notification preference:', error?.message || error);
      toast({ title: 'Error', description: 'Failed to save preference.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle handler ────────────────────────────────────────────────────

  const handleToggle = async (type: 'push' | 'sms', enabled: boolean) => {
    if (!selectedSetting) return;

    const setting = settings.find(s => s.id === selectedSetting);
    if (!setting) return;

    const newPushEnabled = type === 'push' ? enabled : setting.pushEnabled;
    const newSmsEnabled = type === 'sms' ? enabled : setting.smsEnabled;

    // If turning ON push, ensure device is registered
    if (type === 'push' && enabled) {
      const registered = await ensurePushRegistered();
      if (!registered && Capacitor.isNativePlatform()) {
        return;
      }
    }

    // If turning ON SMS for order_updates, verify phone on file
    if (type === 'sms' && enabled && selectedSetting === 'order_updates') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.phone) {
          toast({
            title: 'Phone Number Required',
            description: 'Add a phone number to your profile to receive SMS updates.',
            variant: 'destructive'
          });
          return;
        }
      }
    }

    await saveUserPreference(selectedSetting, newPushEnabled, newSmsEnabled);
  };

  // ─── Status text for list view ─────────────────────────────────────────

  const getStatusText = (setting: NotificationSetting): string => {
    if (setting.hasSMS) {
      const parts: string[] = [];
      if (setting.pushEnabled) parts.push('Push');
      if (setting.smsEnabled) parts.push('SMS');
      if (parts.length === 0) return 'Off';
      return `On: ${parts.join(' & ')}`;
    }
    return setting.pushEnabled ? 'On' : 'Off';
  };

  // ─── Icon for each category ────────────────────────────────────────────

  const getCategoryIcon = (icon: NotificationSetting['icon']) => {
    const iconProps = { size: 20, style: { color: '#6B7280' } };
    switch (icon) {
      case 'order': return <IconDeviceMobile {...iconProps} />;
      case 'store': return <IconBell {...iconProps} />;
      case 'special': return <IconBell {...iconProps} style={{ color: '#F59E0B' }} />;
      case 'suggestion': return <IconInfoCircle {...iconProps} />;
      case 'reminder': return <IconBell {...iconProps} style={{ color: '#3B82F6' }} />;
      case 'app': return <IconBell {...iconProps} style={{ color: '#8B5CF6' }} />;
      default: return <IconBell {...iconProps} />;
    }
  };

  const selectedSettingData = settings.find(s => s.id === selectedSetting);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
        paddingBottom: cartCount > 0
          ? 'calc(160px + env(safe-area-inset-bottom, 0px))'
          : 'calc(80px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Paper
        shadow="xs"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1000,
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: 'white',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          flexShrink: 0
        }}
      >
        <Group gap="md" align="center">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate(-1)}
            style={{
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          >
            <IconChevronLeft size={20} />
          </ActionIcon>
          <Title
            order={2}
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
              lineHeight: '1.2'
            }}
          >
            Notification Settings
          </Title>
        </Group>
      </Paper>

      {/* ── Push Permission Banner ──────────────────────────────────────── */}
      {pushPermissionStatus === 'denied' && (
        <Box style={{ padding: '12px 24px 0' }}>
          <Paper
            p="sm"
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '8px'
            }}
          >
            <Group gap="xs" align="flex-start">
              <IconBellOff size={18} style={{ color: '#D97706', marginTop: 2 }} />
              <Box style={{ flex: 1 }}>
                <Text style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                  Push Notifications Disabled
                </Text>
                <Text style={{ fontSize: '12px', color: '#92400E', opacity: 0.8, marginTop: 2 }}>
                  Enable notifications in your {Capacitor.isNativePlatform() ? 'device' : 'browser'} settings to receive push alerts.
                </Text>
              </Box>
            </Group>
          </Paper>
        </Box>
      )}

      {/* ── Settings List ───────────────────────────────────────────────── */}
      <Box style={{ flex: 1, padding: '16px 24px' }}>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="md" color="gray" />
          </Box>
        ) : (
          <Stack gap="xs">
            <Text style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
              Choose which notifications you'd like to receive. Your preferences are saved automatically.
            </Text>

            {settings.map((setting) => (
              <Paper
                key={setting.id}
                shadow="xs"
                p="md"
                style={{
                  cursor: 'pointer',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.15s ease',
                }}
                onClick={() => setSelectedSetting(setting.id)}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="sm" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Box
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getCategoryIcon(setting.icon)}
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                        {setting.name}
                      </Text>
                      <Group gap={6} align="center">
                        <Badge
                          size="xs"
                          variant="light"
                          color={setting.pushEnabled || setting.smsEnabled ? 'green' : 'gray'}
                          style={{ fontSize: '10px', textTransform: 'none', fontWeight: 500 }}
                        >
                          {getStatusText(setting)}
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <IconChevronRight size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* ── Settings Detail Modal ───────────────────────────────────────── */}
      <Modal
        opened={selectedSetting !== null}
        onClose={() => setSelectedSetting(null)}
        title={
          <Group gap="sm" align="center">
            {selectedSettingData && getCategoryIcon(selectedSettingData.icon)}
            <Text style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              {selectedSettingData?.name}
            </Text>
          </Group>
        }
        size="md"
        centered
        styles={{
          header: { borderBottom: '1px solid #E5E7EB', paddingBottom: 12 },
          body: { paddingTop: 16 }
        }}
      >
        {selectedSettingData && (
          <Stack gap="md">
            {/* Description */}
            <Text
              size="sm"
              style={{
                color: '#6B7280',
                fontSize: '14px',
                lineHeight: '1.6'
              }}
            >
              {selectedSettingData.description}
            </Text>

            <Divider />

            {/* Push Notification Toggle */}
            <Group justify="space-between" align="center">
              <Box style={{ flex: 1 }}>
                <Text style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                  Push Notifications
                </Text>
                <Text size="xs" style={{ color: '#9CA3AF', fontSize: '12px', marginTop: 2 }}>
                  Receive alerts on your device
                </Text>
              </Box>
              <Switch
                checked={selectedSettingData.pushEnabled}
                onChange={(e) => handleToggle('push', e.currentTarget.checked)}
                size="md"
                disabled={saving}
                color="teal"
              />
            </Group>

            {/* SMS Toggle (Order Updates only) */}
            {selectedSettingData.hasSMS && (
              <>
                <Divider />
                <Group justify="space-between" align="center">
                  <Box style={{ flex: 1 }}>
                    <Group gap={6} align="center">
                      <IconMessage size={16} style={{ color: '#6B7280' }} />
                      <Text style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                        SMS
                      </Text>
                    </Group>
                    <Text
                      size="xs"
                      style={{
                        color: '#9CA3AF',
                        fontSize: '12px',
                        marginTop: 2,
                        paddingLeft: 22
                      }}
                    >
                      Get order updates via text to your mobile number on file. Message &amp; data rates may apply.
                    </Text>
                  </Box>
                  <Switch
                    checked={selectedSettingData.smsEnabled}
                    onChange={(e) => handleToggle('sms', e.currentTarget.checked)}
                    size="md"
                    disabled={saving}
                    color="teal"
                  />
                </Group>
              </>
            )}

            {/* Done Button */}
            <Button
              fullWidth
              size="md"
              onClick={() => setSelectedSetting(null)}
              loading={saving}
              style={{
                marginTop: '8px',
                backgroundColor: '#111827',
                color: 'white',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              Done
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}

