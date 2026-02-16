// @ts-nocheck
import React, { useState } from 'react';
import { IconArrowLeft, IconShield, IconPhone, IconAlertTriangle, IconMapPin, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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
  ThemeIcon,
  Paper,
} from '@mantine/core';

interface SafeDrivingSectionProps {
  onBack: () => void;
}

export const SafeDrivingSection: React.FC<SafeDrivingSectionProps> = ({ onBack }) => {
  const [safetySettings, setSafetySettings] = useState({
    drivingModeEnabled: true,
    speedAlerts: true,
    breakReminders: false,
    emergencyContacts: true,
    crashDetection: true,
    nightModeAlerts: true
  });

  const handleSettingChange = (key: keyof typeof safetySettings, value: boolean) => {
    setSafetySettings(prev => ({ ...prev, [key]: value }));
    notifications.show({
      title: "Safety setting updated",
      message: "Your driving safety preference has been saved.",
      color: "green",
    });
  };

  return (
    <Box h="100vh" bg="gray.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-gray-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group px="md" py="md" gap="md" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Safe Driving Features</Title>
        </Group>
      </Paper>

      <Stack gap="md" p="md">
        {/* Safety Overview */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md">
            <Group gap="md">
              <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                <IconShield size={32} />
              </ThemeIcon>
              <Box>
                <Text fw={600} c="dark">Your Safety Score</Text>
                <Group gap="xs" align="center">
                  <Text size="2xl" fw={700} c="green.6">94</Text>
                  <Text size="sm" c="dimmed">Excellent Driver</Text>
                </Group>
              </Box>
            </Group>
          </Card.Section>
        </Card>

        {/* Driving Mode */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconPhone size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Driving Mode</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Auto-Enable Driving Mode</Text>
                  <Text size="sm" c="dimmed">Silences calls and notifications while driving</Text>
                </Box>
                <Switch
                  checked={safetySettings.drivingModeEnabled}
                  onChange={(e) => handleSettingChange('drivingModeEnabled', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Paper p="md" bg="gray.0" radius="md">
                <Text size="xs" c="dimmed">
                  Emergency calls will still come through when driving mode is active.
                </Text>
              </Paper>
            </Stack>
          </Card.Section>
        </Card>

        {/* Speed & Alerts */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconAlertTriangle size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Speed & Safety Alerts</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Speed Limit Alerts</Text>
                  <Text size="sm" c="dimmed">Get notified when exceeding speed limits</Text>
                </Box>
                <Switch
                  checked={safetySettings.speedAlerts}
                  onChange={(e) => handleSettingChange('speedAlerts', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Night Driving Alerts</Text>
                  <Text size="sm" c="dimmed">Extra caution reminders for night deliveries</Text>
                </Box>
                <Switch
                  checked={safetySettings.nightModeAlerts}
                  onChange={(e) => handleSettingChange('nightModeAlerts', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Break Reminders</Text>
                  <Text size="sm" c="dimmed">Suggests breaks after long driving periods</Text>
                </Box>
                <Switch
                  checked={safetySettings.breakReminders}
                  onChange={(e) => handleSettingChange('breakReminders', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        {/* Emergency Features */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconMapPin size={20} />
              </ThemeIcon>
              <Title order={4} fw={600}>Emergency Features</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Crash Detection</Text>
                  <Text size="sm" c="dimmed">Auto-alerts emergency contacts if crash detected</Text>
                </Box>
                <Switch
                  checked={safetySettings.crashDetection}
                  onChange={(e) => handleSettingChange('crashDetection', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Emergency Contacts</Text>
                  <Text size="sm" c="dimmed">Share location with trusted contacts while driving</Text>
                </Box>
                <Switch
                  checked={safetySettings.emergencyContacts}
                  onChange={(e) => handleSettingChange('emergencyContacts', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Button variant="light" fullWidth>
                Manage Emergency Contacts
              </Button>
            </Stack>
          </Card.Section>
        </Card>

        {/* Safety Tips */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Title order={4} fw={600}>Safety Tips</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Group gap="xs" align="flex-start">
                <ThemeIcon size="sm" radius="md" color="orange" variant="light">
                  <IconClock size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Take regular breaks every 2 hours during long delivery sessions</Text>
              </Group>
              <Group gap="xs" align="flex-start">
                <ThemeIcon size="sm" radius="md" color="orange" variant="light">
                  <IconPhone size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Never use your phone while driving - pull over safely if needed</Text>
              </Group>
              <Group gap="xs" align="flex-start">
                <ThemeIcon size="sm" radius="md" color="orange" variant="light">
                  <IconShield size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Always wear a seatbelt and ensure your vehicle is properly maintained</Text>
              </Group>
              <Group gap="xs" align="flex-start">
                <ThemeIcon size="sm" radius="md" color="orange" variant="light">
                  <IconMapPin size={16} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Check weather conditions and adjust driving accordingly</Text>
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        {/* Emergency Button */}
        <Card shadow="sm" radius="lg" withBorder style={{ borderColor: 'var(--mantine-color-red-2)', backgroundColor: 'var(--mantine-color-red-0)' }}>
          <Card.Section p="md">
            <Stack gap="xs">
              <Button 
                color="red"
                fullWidth
                size="lg"
                onClick={() => window.location.href = 'tel:911'}
              >
                🚨 Emergency - Call 911
              </Button>
              <Text size="xs" c="red.6" ta="center">
                Only use in real emergencies
              </Text>
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    </Box>
  );
};
