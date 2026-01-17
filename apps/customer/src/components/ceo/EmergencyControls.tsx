// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card,
  Switch,
  Button,
  Modal,
  Textarea,
  Group,
  Stack,
  Title,
  Text,
  Box,
  Grid,
  Alert,
  Badge,
  Loader,
  Divider,
} from '@mantine/core';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconAlertTriangle,
  IconBell,
  IconTools,
  IconCurrencyDollar,
  IconShield,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description: string;
  is_critical: boolean;
  requires_confirmation: boolean;
}

export const EmergencyControls: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [confirmationReason, setConfirmationReason] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_system_settings')
        .select('*')
        .order('is_critical', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load system settings',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (setting: SystemSetting) => {
    if (setting.requires_confirmation) {
      setSelectedSetting(setting);
      setConfirmModal(true);
      return;
    }
    await updateSetting(setting);
  };

  const updateSetting = async (setting: SystemSetting) => {
    setUpdatingId(setting.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newEnabled = !setting.setting_value.enabled;

      const { error } = await supabase
        .from('ceo_system_settings')
        .update({
          setting_value: { ...setting.setting_value, enabled: newEnabled },
          last_changed_by: user?.id,
          last_changed_at: new Date().toISOString()
        })
        .eq('id', setting.id);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: `toggle_${setting.setting_key}`,
        p_action_category: 'emergency',
        p_target_type: 'system_setting',
        p_target_id: setting.id,
        p_target_name: setting.setting_key,
        p_description: `${newEnabled ? 'Enabled' : 'Disabled'} ${setting.description}${confirmationReason ? `: ${confirmationReason}` : ''}`,
        p_severity: setting.is_critical ? 'critical' : 'high'
      });

      notifications.show({
        title: newEnabled ? 'Setting Enabled' : 'Setting Disabled',
        message: `${setting.description} has been ${newEnabled ? 'enabled' : 'disabled'}`,
        color: newEnabled ? 'green' : 'gray',
        icon: newEnabled ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />,
      });
      setConfirmModal(false);
      setConfirmationReason('');
      fetchSettings();
    } catch (error: any) {
      console.error('Error updating setting:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update setting',
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getSettingIcon = (key: string, enabled: boolean) => {
    const iconProps = { size: 32, strokeWidth: 2 };
    const icons: Record<string, any> = {
      system_maintenance_mode: <IconTools {...iconProps} />,
      orders_paused: <IconPlayerPause {...iconProps} />,
      payment_processing: <IconCurrencyDollar {...iconProps} />,
      emergency_alerts: <IconBell {...iconProps} />,
    };
    const IconComponent = icons[key] || <IconShield {...iconProps} />;
    return (
      <Box
        style={{
          background: enabled
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
          padding: '16px',
          borderRadius: '16px',
          boxShadow: enabled ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          color: enabled ? 'white' : '#9ca3af',
        }}
      >
        {IconComponent}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Loader size="lg" />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} fw={800} c="dark.9" style={{ letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Emergency Controls
        </Title>
        <Text size="md" c="gray.6" fw={500}>
          System-wide toggles and emergency settings
        </Text>
      </Box>

      {/* Warning Alert */}
      <Alert
        icon={<IconAlertTriangle size={20} />}
        title="Critical Controls"
        color="orange"
        radius="md"
        styles={{
          root: {
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderColor: '#fbbf24',
          },
          title: {
            fontWeight: 700,
            fontSize: '14px',
          },
        }}
      >
        These settings affect the entire platform. Use with caution.
      </Alert>

      {/* Settings Grid */}
      <Grid gutter="lg">
        {settings.map((setting) => {
          const isEnabled = setting.setting_value.enabled;
          const isUpdating = updatingId === setting.id;
          
          return (
            <Grid.Col key={setting.id} span={{ base: 12, md: 6 }}>
              <Card
                withBorder
                radius="lg"
                padding="xl"
                style={{
                  borderWidth: '2px',
                  borderColor: setting.is_critical
                    ? isEnabled
                      ? '#ef4444'
                      : '#10b981'
                    : isEnabled
                    ? '#10b981'
                    : '#e5e7eb',
                  background: 'white',
                  boxShadow: isEnabled
                    ? '0 4px 16px rgba(16, 185, 129, 0.15)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isEnabled
                    ? '0 4px 16px rgba(16, 185, 129, 0.15)'
                    : '0 2px 8px rgba(0,0,0,0.05)';
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="lg" style={{ flex: 1 }}>
                    {getSettingIcon(setting.setting_key, isEnabled)}
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="xs" align="center">
                        <Title order={4} fw={700} c="dark.9">
                          {setting.description}
                        </Title>
                        {setting.is_critical && (
                          <Badge
                            size="sm"
                            variant="filled"
                            color="red"
                            style={{ fontWeight: 700, textTransform: 'uppercase' }}
                          >
                            Critical
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          variant="light"
                          color="gray"
                          style={{ textTransform: 'capitalize' }}
                        >
                          {setting.category}
                        </Badge>
                        <Badge
                          size="sm"
                          variant={isEnabled ? 'filled' : 'light'}
                          color={isEnabled ? 'green' : 'gray'}
                          style={{ fontWeight: 700 }}
                        >
                          {isEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </Group>
                    </Stack>
                  </Group>
                  <Switch
                    checked={isEnabled}
                    onChange={() => toggleSetting(setting)}
                    disabled={isUpdating}
                    size="lg"
                    color={isEnabled ? 'green' : 'gray'}
                    styles={{
                      track: {
                        backgroundColor: isEnabled ? '#10b981' : '#e5e7eb',
                      },
                    }}
                  />
                </Group>
                {isEnabled && setting.setting_value.reason && (
                  <Box
                    mt="md"
                    p="md"
                    style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      borderRadius: '8px',
                      border: '1px solid #fbbf24',
                    }}
                  >
                    <Text size="sm" fw={600} c="orange.9" mb="xs">
                      Reason:
                    </Text>
                    <Text size="sm" c="dark.7">
                      {setting.setting_value.reason}
                    </Text>
                  </Box>
                )}
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmModal}
        onClose={() => {
          setConfirmModal(false);
          setConfirmationReason('');
        }}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={24} color="#ef4444" />
            <Title order={3} fw={800} c="dark.9">
              Confirm Critical Action
            </Title>
          </Group>
        }
        size="md"
        radius="lg"
        styles={{
          header: {
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #e2e8f0',
            padding: '24px',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        {selectedSetting && (
          <Stack gap="xl">
            <Alert
              icon={<IconAlertTriangle size={20} />}
              title="Critical System Setting"
              color="red"
              radius="md"
              styles={{
                root: {
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  borderColor: '#ef4444',
                },
                title: {
                  fontWeight: 700,
                },
              }}
            >
              You are about to {selectedSetting.setting_value.enabled ? 'DISABLE' : 'ENABLE'}{' '}
              {selectedSetting.description}. This action will be logged and audited.
            </Alert>

            <Box>
              <Text size="sm" fw={600} c="dark.7" mb="xs">
                Reason for this action <Text span c="red" fw={700}>*</Text>
              </Text>
              <Textarea
                rows={3}
                value={confirmationReason}
                onChange={(e) => setConfirmationReason(e.target.value)}
                placeholder="Explain why this action is necessary..."
                radius="md"
                required
                styles={{
                  input: {
                    borderColor: '#e2e8f0',
                    '&:focus': {
                      borderColor: '#3b82f6',
                    },
                  },
                }}
              />
            </Box>

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setConfirmModal(false);
                  setConfirmationReason('');
                }}
                radius="md"
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={() => updateSetting(selectedSetting)}
                disabled={!confirmationReason.trim()}
                leftSection={<IconAlertTriangle size={16} />}
                radius="md"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                Confirm Action
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
