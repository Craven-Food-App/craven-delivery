import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconBell, IconMapPin, IconVolume, IconDeviceMobile, IconNavigation } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigation } from '@/hooks/useNavigation';
import { IOSPushNotifications } from './IOSPushNotifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  ActionIcon,
  Switch,
  Select,
  Paper,
  ThemeIcon,
} from '@mantine/core';

interface AppSettingsSectionProps {
  onBack: () => void;
}

export const AppSettingsSection: React.FC<AppSettingsSectionProps> = ({ onBack }) => {
  const { navigationSettings, updateSettings } = useNavigation();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    locationServices: true,
    soundAlerts: true,
    vibration: true,
    language: 'english',
    distanceUnit: 'miles'
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    notifications.show({
      title: "Setting updated",
      message: "Your preference has been saved.",
      color: "green",
    });
  };

  const navigationOptions = [
    { value: 'mapbox', label: "Crave'N Navigation (In-App)" },
    { value: 'google', label: 'Google Maps' },
    ...(/iPad|iPhone|iPod/.test(navigator.userAgent) ? [{ value: 'apple', label: 'Apple Maps' }] : []),
    ...(/Android/.test(navigator.userAgent) ? [{ value: 'waze', label: 'Waze' }] : []),
  ];

  return (
    <Box h="100vh" bg="gray.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-gray-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        bg="white"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group px="md" py="md" gap="md" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">App Settings</Title>
        </Group>
      </Paper>

      <Stack gap="md" p="md">
        {/* Notifications */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconBell size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Notifications</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Push Notifications</Text>
                  <Text size="sm" c="dimmed">Receive order alerts</Text>
                </Box>
                <Switch
                  checked={settings.pushNotifications}
                  onChange={(e) => handleSettingChange('pushNotifications', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>
              
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Sound Alerts</Text>
                  <Text size="sm" c="dimmed">Audio notifications</Text>
                </Box>
                <Switch
                  checked={settings.soundAlerts}
                  onChange={(e) => handleSettingChange('soundAlerts', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Vibration</Text>
                  <Text size="sm" c="dimmed">Haptic feedback</Text>
                </Box>
                <Switch
                  checked={settings.vibration}
                  onChange={(e) => handleSettingChange('vibration', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        {/* iOS Push Notifications */}
        {userId && <IOSPushNotifications userId={userId} />}

        {/* Navigation */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconNavigation size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Navigation</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Box>
                <Text fw={500} mb="xs">Navigation Provider</Text>
                <Select
                  value={navigationSettings.provider}
                  onChange={(value) => {
                    updateSettings({ provider: value as any });
                    notifications.show({
                      title: 'Navigation provider updated',
                      message: '',
                      color: 'green',
                    });
                  }}
                  data={navigationOptions}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  {navigationSettings.provider === 'mapbox' 
                    ? 'Turn-by-turn navigation within the app'
                    : 'Opens external navigation app'}
                </Text>
              </Box>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Voice Guidance</Text>
                  <Text size="sm" c="dimmed">Turn-by-turn voice instructions</Text>
                </Box>
                <Switch
                  checked={navigationSettings.voiceGuidance}
                  onChange={(e) => updateSettings({ voiceGuidance: e.currentTarget.checked })}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Avoid Tolls</Text>
                  <Text size="sm" c="dimmed">Route around toll roads</Text>
                </Box>
                <Switch
                  checked={navigationSettings.avoidTolls}
                  onChange={(e) => updateSettings({ avoidTolls: e.currentTarget.checked })}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Avoid Highways</Text>
                  <Text size="sm" c="dimmed">Use local roads when possible</Text>
                </Box>
                <Switch
                  checked={navigationSettings.avoidHighways}
                  onChange={(e) => updateSettings({ avoidHighways: e.currentTarget.checked })}
                  color="orange"
                />
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        {/* Location Services */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconMapPin size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Location Services</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Location Access</Text>
                  <Text size="sm" c="dimmed">Required for deliveries</Text>
                </Box>
                <Switch
                  checked={settings.locationServices}
                  onChange={(e) => handleSettingChange('locationServices', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Box>
                <Text fw={500} mb="xs">Distance Unit</Text>
                <Select
                  value={settings.distanceUnit}
                  onChange={(value) => handleSettingChange('distanceUnit', value || 'miles')}
                  data={[
                    { value: 'miles', label: 'Miles' },
                    { value: 'kilometers', label: 'Kilometers' },
                  ]}
                />
              </Box>
            </Stack>
          </Card.Section>
        </Card>

        {/* Language */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconDeviceMobile size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Language</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Box>
              <Text fw={500} mb="xs">Language</Text>
              <Select
                value={settings.language}
                onChange={(value) => handleSettingChange('language', value || 'english')}
                data={[
                  { value: 'english', label: 'English' },
                  { value: 'spanish', label: 'Español' },
                  { value: 'french', label: 'Français' },
                ]}
              />
            </Box>
          </Card.Section>
        </Card>

        {/* Data & Storage */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Title order={4} fw={600}>Data & Storage</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Button variant="light" fullWidth>
                Clear Cache
              </Button>
              
              <Paper p="md" bg="gray.0" radius="md">
                <Text size="xs" c="dimmed">
                  <Text component="span" fw={600}>Cache Size: 23.4 MB</Text>
                  <br />
                  Clearing cache may improve app performance but will require re-downloading some data.
                </Text>
              </Paper>
            </Stack>
          </Card.Section>
        </Card>

        {/* Privacy */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Title order={4} fw={600}>Privacy</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="xs">
              <Button variant="light" fullWidth justify="flex-start">
                Privacy Policy
              </Button>
              <Button variant="light" fullWidth justify="flex-start">
                Terms of Service
              </Button>
              <Button variant="light" fullWidth justify="flex-start">
                Data Usage
              </Button>
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    </Box>
  );
};
