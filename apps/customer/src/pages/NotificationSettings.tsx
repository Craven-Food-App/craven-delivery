import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Stack
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconHome, 
  IconShoppingBag, 
  IconSearch, 
  IconUser, 
  IconShoppingCart 
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  hasSMS: boolean;
}

const notificationCategories: NotificationSetting[] = [
  {
    id: 'order_updates',
    name: 'Order Updates',
    description: 'Receive timely updates to track your order every step of the way.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: true
  },
  {
    id: 'store_offers',
    name: 'Store Offers',
    description: 'Receive notifications about offers you can use on orders from specific stores.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false
  },
  {
    id: 'craven_specials',
    name: "Crave'n Specials",
    description: 'Receive notifications about exclusive promotions and offers that can be applied to multiple stores.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false
  },
  {
    id: 'suggestions',
    name: 'Suggestions',
    description: 'Receive personalized recommendations for stores and items we think you\'ll love.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Receive timely reminders about actions you\'ve taken including items you have in your cart and recent orders.',
    pushEnabled: true,
    smsEnabled: false,
    hasSMS: false
  },
  {
    id: 'app_updates',
    name: 'App Updates',
    description: 'Receive notifications about new Crave\'n products, features, and news.',
    pushEnabled: false,
    smsEnabled: false,
    hasSMS: false
  }
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { cartCount } = useCart();
  const [settings, setSettings] = useState<NotificationSetting[]>(notificationCategories);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const updatedSettings = settings.map(setting => {
          const pref = data.find(p => p.category === setting.id);
          return {
            ...setting,
            pushEnabled: pref?.push_enabled ?? setting.pushEnabled,
            smsEnabled: pref?.sms_enabled ?? setting.smsEnabled
          };
        });
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Ensure the device is registered for native push notifications (Android / iOS)
  // This uses the real OS notification system, not in-app toasts.
  const ensureNativePushRegistered = async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;

      // Check current permission
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        const req = await PushNotifications.requestPermissions();
        if (req.receive !== 'granted') {
          console.warn('Push notification permission not granted');
          return;
        }
      }

      // Register for push notifications (FCM/APNS)
      PushNotifications.addListener('registration', async (token) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Send token to backend so it can send real device notifications
          const { error } = await supabase.functions.invoke('register-push-subscription', {
            body: {
              subscription: {
                endpoint: `fcm:${token.value}`,
                keys: null
              },
              userId: user.id,
              deviceInfo: {
                platform: Capacitor.getPlatform(),
                isNative: true,
                pushToken: token.value
              }
            }
          });

          if (error) {
            console.error('Failed to register native push token:', error);
          }
        } catch (err) {
          console.error('Error during push registration callback:', err);
        }
      });

      await PushNotifications.register();
    } catch (err) {
      console.error('Error ensuring native push registration:', err);
    }
  };

  const saveUserPreferences = async (category: string, pushEnabled: boolean, smsEnabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
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

      setSettings(prev => prev.map(s => 
        s.id === category 
          ? { ...s, pushEnabled, smsEnabled }
          : s
      ));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const getStatusText = (setting: NotificationSetting): string => {
    if (setting.hasSMS) {
      const parts = [];
      if (setting.pushEnabled) parts.push('Push');
      if (setting.smsEnabled) parts.push('SMS');
      if (parts.length === 0) return 'Off';
      if (parts.length === 2) return `On: ${parts.join('; ')}`;
      return `On: ${parts[0]}; Off: ${parts.filter(p => p !== parts[0]).join(', ') || 'SMS'}`;
    }
    return setting.pushEnabled ? 'On: Push' : 'Off';
  };

  const handleSettingClick = (setting: NotificationSetting) => {
    setSelectedSetting(setting.id);
  };

  const handleToggle = async (type: 'push' | 'sms', enabled: boolean) => {
    if (!selectedSetting) return;

    const setting = settings.find(s => s.id === selectedSetting);
    if (!setting) return;

    const newPushEnabled = type === 'push' ? enabled : setting.pushEnabled;
    const newSmsEnabled = type === 'sms' ? enabled : setting.smsEnabled;

    // If user turns on push for any category, make sure the device is registered
    if (type === 'push' && enabled) {
      await ensureNativePushRegistered();
    }

    await saveUserPreferences(selectedSetting, newPushEnabled, newSmsEnabled);
  };

  const selectedSettingData = settings.find(s => s.id === selectedSetting);

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: cartCount > 0 ? 'calc(160px + env(safe-area-inset-bottom, 0px))' : 'calc(80px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* Page Header */}
      <Paper
        shadow="xs"
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10
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

      {/* Settings List */}
      <Box style={{ flex: 1, padding: '24px' }}>
        <Stack gap="xs">
          {settings.map((setting) => (
            <Paper
              key={setting.id}
              shadow="xs"
              p="md"
              style={{
                cursor: 'pointer',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
              onClick={() => handleSettingClick(setting)}
            >
              <Group justify="space-between" align="center">
                <Box style={{ flex: 1 }}>
                  <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                    {setting.name}
                  </Text>
                  <Text
                    size="sm"
                    style={{
                      color: '#6B7280',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusText(setting)}
                  </Text>
                </Box>
                <ActionIcon variant="subtle" size="sm">
                  <IconChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Settings Modal */}
      <Modal
        opened={selectedSetting !== null}
        onClose={() => setSelectedSetting(null)}
        title={selectedSettingData?.name}
        size="md"
        centered
      >
        {selectedSettingData && (
          <Stack gap="md">
            <Text
              size="sm"
              style={{
                color: '#6B7280',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            >
              {selectedSettingData.description}
            </Text>

            {/* Push Notification Toggle */}
            <Group justify="space-between" align="center">
              <Text style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>
                Push
              </Text>
              <Switch
                checked={selectedSettingData.pushEnabled}
                onChange={(e) => handleToggle('push', e.currentTarget.checked)}
                size="md"
              />
            </Group>

            {/* SMS Toggle (only for Order Updates) */}
            {selectedSettingData.hasSMS && (
              <>
                <Divider />
                <Group justify="space-between" align="center">
                  <Box style={{ flex: 1 }}>
                    <Text style={{ fontSize: '16px', fontWeight: 500, color: '#111827', marginBottom: '4px' }}>
                      SMS
                    </Text>
                    <Text
                      size="xs"
                      style={{
                        color: '#6B7280',
                        fontSize: '12px'
                      }}
                    >
                      Toggle on to get Order Updates by text message. Message &amp; data rates may apply.
                    </Text>
                  </Box>
                  <Switch
                    checked={selectedSettingData.smsEnabled}
                    onChange={(e) => handleToggle('sms', e.currentTarget.checked)}
                    size="md"
                  />
                </Group>
              </>
            )}

            <Button
              fullWidth
              size="md"
              onClick={() => setSelectedSetting(null)}
              style={{
                marginTop: '8px',
                backgroundColor: '#F3F4F6',
                color: '#111827',
                fontWeight: 500
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
