// @ts-nocheck
import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  NumberInput,
  Button,
  Group,
  Switch,
  Divider,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';

export const DriverCompensationConfig: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['compensation-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching config:', error);
      }

      return data;
    },
  });

  const form = useForm({
    initialValues: {
      base_percentage: config?.base_percentage || 70,
      minimum_per_delivery: (config?.minimum_per_delivery || 200) / 100,
      distance_bonus_enabled: config?.distance_bonus_enabled || false,
      distance_bonus_base_cents: (config?.distance_bonus_base_cents || 0) / 100,
      distance_bonus_per_mile_cents: (config?.distance_bonus_per_mile_cents || 0) / 100,
      distance_bonus_max_miles: config?.distance_bonus_max_miles || 10,
      performance_bonus_enabled: config?.performance_bonus_enabled || false,
      performance_bonus_percentage: config?.performance_bonus_percentage || 5,
      instant_payout_fee: (config?.instant_payout_fee || 0) / 100,
    },
  });

  // Update form when config loads
  React.useEffect(() => {
    if (config) {
      form.setValues({
        base_percentage: config.base_percentage || 70,
        minimum_per_delivery: (config.minimum_per_delivery || 200) / 100,
        distance_bonus_enabled: config.distance_bonus_enabled || false,
        distance_bonus_base_cents: (config.distance_bonus_base_cents || 0) / 100,
        distance_bonus_per_mile_cents: (config.distance_bonus_per_mile_cents || 0) / 100,
        distance_bonus_max_miles: config.distance_bonus_max_miles || 10,
        performance_bonus_enabled: config.performance_bonus_enabled || false,
        performance_bonus_percentage: config.performance_bonus_percentage || 5,
        instant_payout_fee: (config.instant_payout_fee || 0) / 100,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate old config
      if (config?.id) {
        await supabase
          .from('compensation_config')
          .update({ is_active: false })
          .eq('id', config.id);
      }

      // Create new active config
      const { data, error } = await supabase
        .from('compensation_config')
        .insert({
          base_percentage: values.base_percentage,
          minimum_per_delivery: Math.round(values.minimum_per_delivery * 100),
          distance_bonus_enabled: values.distance_bonus_enabled,
          distance_bonus_base_cents: Math.round(values.distance_bonus_base_cents * 100),
          distance_bonus_per_mile_cents: Math.round(values.distance_bonus_per_mile_cents * 100),
          distance_bonus_max_miles: values.distance_bonus_max_miles,
          performance_bonus_enabled: values.performance_bonus_enabled,
          performance_bonus_percentage: values.performance_bonus_percentage,
          instant_payout_fee: Math.round(values.instant_payout_fee * 100),
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-config'] });
      notifications.show({
        title: 'Configuration Saved',
        message: 'Driver compensation configuration has been updated successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save configuration',
        color: 'red',
      });
    },
  });

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
      <Stack gap="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/finance/driver-compensation')}
          >
            Back to Dashboard
          </Button>
        </Group>

        <Title order={2}>Pay Configuration Editor</Title>

        {!config && (
          <Alert color="blue" title="No Active Configuration">
            Creating a new compensation configuration. This will become the active configuration.
          </Alert>
        )}

        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack gap="lg">
            {/* Base Pay Settings */}
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Base Pay Settings
              </Title>
              <Stack gap="md">
                <NumberInput
                  label="Base Percentage"
                  description="Percentage of delivery fee paid to drivers"
                  suffix="%"
                  min={0}
                  max={100}
                  {...form.getInputProps('base_percentage')}
                />
                <NumberInput
                  label="Minimum per Delivery"
                  description="Minimum amount drivers earn per delivery (in dollars)"
                  prefix="$"
                  min={0}
                  decimalScale={2}
                  {...form.getInputProps('minimum_per_delivery')}
                />
              </Stack>
            </Card>

            {/* Distance Bonus Settings */}
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Distance Bonus Settings
              </Title>
              <Stack gap="md">
                <Switch
                  label="Enable Distance Bonus"
                  description="Pay drivers extra for longer distance deliveries"
                  {...form.getInputProps('distance_bonus_enabled', { type: 'checkbox' })}
                />
                {form.values.distance_bonus_enabled && (
                  <>
                    <NumberInput
                      label="Base Distance Bonus"
                      description="Fixed bonus for any delivery with distance (in dollars)"
                      prefix="$"
                      min={0}
                      decimalScale={2}
                      {...form.getInputProps('distance_bonus_base_cents')}
                    />
                    <NumberInput
                      label="Per Mile Bonus"
                      description="Additional bonus per mile (in dollars)"
                      prefix="$"
                      min={0}
                      decimalScale={2}
                      {...form.getInputProps('distance_bonus_per_mile_cents')}
                    />
                    <NumberInput
                      label="Max Distance for Bonus"
                      description="Maximum miles that count toward distance bonus"
                      suffix=" miles"
                      min={0}
                      {...form.getInputProps('distance_bonus_max_miles')}
                    />
                  </>
                )}
              </Stack>
            </Card>

            {/* Performance Bonus Settings */}
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Performance Bonus Settings
              </Title>
              <Stack gap="md">
                <Switch
                  label="Enable Performance Bonus"
                  description="Reward high-performing drivers with bonus percentage"
                  {...form.getInputProps('performance_bonus_enabled', { type: 'checkbox' })}
                />
                {form.values.performance_bonus_enabled && (
                  <NumberInput
                    label="Performance Bonus Percentage"
                    description="Additional percentage for drivers with score ≥ 95"
                    suffix="%"
                    min={0}
                    max={20}
                    {...form.getInputProps('performance_bonus_percentage')}
                  />
                )}
              </Stack>
            </Card>

            {/* Payout Settings */}
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Payout Settings
              </Title>
              <Stack gap="md">
                <NumberInput
                  label="Instant Payout Fee"
                  description="Fee charged for instant payouts (in dollars)"
                  prefix="$"
                  min={0}
                  decimalScale={2}
                  {...form.getInputProps('instant_payout_fee')}
                />
              </Stack>
            </Card>

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => navigate('/finance/driver-compensation')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                Save Configuration
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
  );
};

