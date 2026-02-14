// @ts-nocheck
import React from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  List,
  Badge,
  Group,
  Button,
  Loader,
  Center,
  Code,
  Grid,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IconFileCode, IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';

export default function CompensationEngineOverview() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['compensation-config-cto'],
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

  const { data: lastCalculation } = useQuery({
    queryKey: ['last-calculation-run'],
    queryFn: async () => {
      // Get most recent weekly stats calculation
      const { data, error } = await supabase
        .from('driver_weekly_stats')
        .select('calculated_at')
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last calculation:', error);
      }

      return data?.calculated_at;
    },
  });

  const { data: errorLogs } = useQuery({
    queryKey: ['compensation-error-logs'],
    queryFn: async () => {
      // In production, this would query an error_logs table
      // For now, return empty array
      return [];
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
    <Stack gap="lg" p="lg">
      <Title order={2}>Compensation Engine Overview</Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Linked Formula Files
            </Title>
            <List>
              <List.Item icon={<IconFileCode size={16} />}>
                <Code>driverPayEngine.ts</Code> - Main calculation engine
              </List.Item>
              <List.Item icon={<IconFileCode size={16} />}>
                <Code>calculateDriverTripEarnings()</Code> - Trip earnings calculator
              </List.Item>
              <List.Item icon={<IconFileCode size={16} />}>
                <Code>recalculateWeeklyStatsAndBonuses()</Code> - Weekly aggregator
              </List.Item>
              <List.Item icon={<IconFileCode size={16} />}>
                <Code>calculateDriverScore()</Code> - Performance scorer
              </List.Item>
            </List>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Current Configuration
            </Title>
            {config ? (
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Base Percentage:</Text>
                  <Badge>{config.base_percentage || 0}%</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Minimum per Delivery:</Text>
                  <Badge>${((config.minimum_per_delivery || 0) / 100).toFixed(2)}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Distance Bonus:</Text>
                  <Badge color={config.distance_bonus_enabled ? 'green' : 'gray'}>
                    {config.distance_bonus_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Performance Bonus:</Text>
                  <Badge color={config.performance_bonus_enabled ? 'green' : 'gray'}>
                    {config.performance_bonus_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Group>
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                No active configuration found
              </Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Last Calculation Run
            </Title>
            {lastCalculation ? (
              <Stack gap="xs">
                <Group>
                  <IconCheck size={16} color="green" />
                  <Text size="sm">
                    {new Date(lastCalculation).toLocaleString()}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Last successful weekly stats calculation
                </Text>
              </Stack>
            ) : (
              <Group>
                <IconAlertTriangle size={16} color="orange" />
                <Text size="sm" c="dimmed">
                  No calculation runs found
                </Text>
              </Group>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Error Logs
            </Title>
            {errorLogs && errorLogs.length > 0 ? (
              <List>
                {errorLogs.map((log: any, idx: number) => (
                  <List.Item key={idx} icon={<IconX size={16} color="red" />}>
                    <Text size="xs">{log.message}</Text>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Group>
                <IconCheck size={16} color="green" />
                <Text size="sm" c="dimmed">
                  No recent errors
                </Text>
              </Group>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

