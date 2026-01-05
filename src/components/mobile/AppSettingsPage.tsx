import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconBell, IconGlobe, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  ActionIcon,
  Card,
  Title,
  Switch,
  Select,
  ThemeIcon,
  Divider,
} from '@mantine/core';

type AppSettingsPageProps = {
  onBack: () => void;
};

const AppSettingsPage: React.FC<AppSettingsPageProps> = ({ onBack }) => {
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    language: 'en',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch driver preferences
      const { data: preferences } = await supabase
        .from('driver_preferences')
        .select('*')
        .eq('driver_id', user.id)
        .single();

      if (preferences) {
        setSettings({
          pushNotifications: preferences.notification_sound ?? true,
          soundEnabled: preferences.notification_sound ?? true,
          vibrationEnabled: preferences.notification_sound ?? true,
          language: 'en',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSetting = async (key: string, value: boolean | string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (key === 'pushNotifications') updates.push_notifications_enabled = value;
      if (key === 'soundEnabled') updates.sound_enabled = value;
      if (key === 'vibrationEnabled') updates.vibration_enabled = value;

      // Update or create preferences
      const { error } = await supabase
        .from('driver_preferences')
        .upsert({
          driver_id: user.id,
          ...updates,
        }, {
          onConflict: 'driver_id'
        });

      if (error) throw error;

      setSettings({ ...settings, [key]: value });
      notifications.show({
        title: 'Settings updated',
        message: 'Your preferences have been saved',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      notifications.show({
        title: 'Failed to update settings',
        message: error.message || 'Please try again',
        color: 'red',
      });
    }
  };

  return (
    <Box h="100vh" w="100%" bg="gray.0" style={{ overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Group
        bg="white"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        px="xl"
        py="md"
        justify="space-between"
        align="center"
      >
        <ActionIcon onClick={onBack} variant="subtle" color="dark">
          <IconArrowLeft size={24} />
        </ActionIcon>
        <Title order={3} fw={700} c="dark">App Settings</Title>
        <Box w={24} />
      </Group>

      <Stack gap="md" p="xl">
        {/* Notifications */}
        <Card shadow="sm" radius="lg" p="xl" withBorder>
          <Group gap="md" mb="md">
            <ThemeIcon size="xl" radius="lg" color="blue" variant="light">
              <IconBell size={24} color="var(--mantine-color-blue-6)" />
            </ThemeIcon>
            <Box>
              <Title order={4} fw={700} c="dark">Notifications</Title>
              <Text size="sm" c="dimmed">Manage notification preferences</Text>
            </Box>
          </Group>

          <Stack gap="md">
            <Group justify="space-between" p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
              <Group gap="md">
                <IconBell size={20} color="var(--mantine-color-gray-6)" />
                <Box>
                  <Text fw={700} c="dark">Push Notifications</Text>
                  <Text size="sm" c="dimmed">Receive push notifications</Text>
                </Box>
              </Group>
              <Switch
                checked={settings.pushNotifications}
                onChange={(e) => updateSetting('pushNotifications', e.currentTarget.checked)}
                color="orange"
                size="lg"
              />
            </Group>

            <Group justify="space-between" p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
              <Group gap="md">
                {settings.soundEnabled ? (
                  <IconVolume size={20} color="var(--mantine-color-gray-6)" />
                ) : (
                  <IconVolumeOff size={20} color="var(--mantine-color-gray-6)" />
                )}
                <Box>
                  <Text fw={700} c="dark">Sound</Text>
                  <Text size="sm" c="dimmed">Notification sounds</Text>
                </Box>
              </Group>
              <Switch
                checked={settings.soundEnabled}
                onChange={(e) => updateSetting('soundEnabled', e.currentTarget.checked)}
                color="orange"
                size="lg"
              />
            </Group>

            <Group justify="space-between" p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
              <Group gap="md">
                <IconBell size={20} color="var(--mantine-color-gray-6)" />
                <Box>
                  <Text fw={700} c="dark">Vibration</Text>
                  <Text size="sm" c="dimmed">Vibrate on notifications</Text>
                </Box>
              </Group>
              <Switch
                checked={settings.vibrationEnabled}
                onChange={(e) => updateSetting('vibrationEnabled', e.currentTarget.checked)}
                color="orange"
                size="lg"
              />
            </Group>
          </Stack>
        </Card>

        {/* Language */}
        <Card shadow="sm" radius="lg" p="xl" withBorder>
          <Group gap="md" mb="md">
            <ThemeIcon size="xl" radius="lg" color="green" variant="light">
              <IconGlobe size={24} color="var(--mantine-color-green-6)" />
            </ThemeIcon>
            <Box>
              <Title order={4} fw={700} c="dark">Language</Title>
              <Text size="sm" c="dimmed">App language preference</Text>
            </Box>
          </Group>

          <Box p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
            <Select
              value={settings.language}
              onChange={(value) => updateSetting('language', value || 'en')}
              data={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
              ]}
              styles={{
                input: {
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                  '&:focus': {
                    borderColor: 'var(--mantine-color-orange-5)',
                  },
                },
              }}
            />
          </Box>
        </Card>
      </Stack>

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
};

export default AppSettingsPage;
