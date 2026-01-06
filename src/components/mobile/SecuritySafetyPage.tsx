import React, { useState } from 'react';
import { IconArrowLeft, IconLock, IconShield, IconPhone, IconKey, IconEye, IconEyeOff } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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
  TextInput,
  ThemeIcon,
  Paper,
  PasswordInput,
} from '@mantine/core';

type SecuritySafetyPageProps = {
  onBack: () => void;
};

const SecuritySafetyPage: React.FC<SecuritySafetyPageProps> = ({ onBack }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
  });

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notifications.show({
        title: 'New passwords do not match',
        message: '',
        color: 'red',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notifications.show({
        title: 'Password must be at least 6 characters',
        message: '',
        color: 'red',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      notifications.show({
        title: 'Password updated successfully',
        message: '',
        color: 'green',
      });
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      notifications.show({
        title: error.message || 'Failed to update password',
        message: '',
        color: 'red',
      });
    }
  };

  const handleSaveEmergencyContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('driver_preferences')
        .upsert({
          driver_id: user.id,
          emergency_contact_name: emergencyContact.name,
          emergency_contact_phone: emergencyContact.phone,
        }, {
          onConflict: 'driver_id'
        });

      if (error) throw error;

      notifications.show({
        title: 'Emergency contact saved',
        message: '',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error saving emergency contact:', error);
      notifications.show({
        title: 'Failed to save emergency contact',
        message: '',
        color: 'red',
      });
    }
  };

  return (
    <Box h="100vh" w="100%" bg="gray.0" style={{ overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ 
          zIndex: 10, 
          borderBottom: '1px solid var(--mantine-color-gray-2)', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)'
        }}
      >
        <Group px="xl" py="md" justify="space-between" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Security & Safety</Title>
          <Box w={24} />
        </Group>
      </Paper>

      <Stack gap="md" p="xl">
        {/* Password */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="red" variant="light">
                <IconLock size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Password</Title>
                <Text size="sm" c="dimmed">Change your account password</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            {!showPasswordForm ? (
              <Button
                fullWidth
                color="orange"
                onClick={() => setShowPasswordForm(true)}
                style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))' }}
              >
                Change Password
              </Button>
            ) : (
              <Stack gap="md">
                <PasswordInput
                  label="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />

                <PasswordInput
                  label="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />

                <PasswordInput
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />

                <Group gap="md" mt="md">
                  <Button
                    variant="light"
                    color="gray"
                    flex={1}
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    color="orange"
                    onClick={handlePasswordChange}
                    style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))' }}
                  >
                    Update Password
                  </Button>
                </Group>
              </Stack>
            )}
          </Card.Section>
        </Card>

        {/* Two-Factor Authentication */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="blue" variant="light">
                <IconShield size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Two-Factor Authentication</Title>
                <Text size="sm" c="dimmed">Add an extra layer of security</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Paper p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
              <Group justify="space-between">
                <Box>
                  <Text fw={700} c="dark">2FA Status</Text>
                  <Text size="sm" c="dimmed">Not enabled</Text>
                </Box>
                <Button variant="light" color="gray" size="sm">
                  Enable
                </Button>
              </Group>
            </Paper>
          </Card.Section>
        </Card>

        {/* Emergency Contact */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="orange" variant="light">
                <IconPhone size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Emergency Contact</Title>
                <Text size="sm" c="dimmed">Contact to notify in emergencies</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <TextInput
                label="Contact Name"
                value={emergencyContact.name}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                placeholder="John Doe"
              />

              <TextInput
                label="Phone Number"
                type="tel"
                value={emergencyContact.phone}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />

              <Button
                fullWidth
                color="orange"
                onClick={handleSaveEmergencyContact}
                style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))' }}
              >
                Save Emergency Contact
              </Button>
            </Stack>
          </Card.Section>
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

export default SecuritySafetyPage;
