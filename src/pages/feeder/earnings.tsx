import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  List,
  Badge,
  Group,
  Select,
  Loader,
  Center,
  NumberFormatter,
  Table,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IconTrendingUp, IconClock, IconMapPin } from '@tabler/icons-react';

export default function FeederEarningsScreen() {
  const [period, setPeriod] = useState<string>('week');

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['feeder-earnings', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data, error } = await supabase
        .from('driver_earnings')
        .select('*, orders:order_id(delivery_fee_cents, delivery_zone)')
        .eq('driver_id', user.id)
        .gte('earned_at', startDate.toISOString())
        .order('earned_at', { ascending: false });

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching earnings:', error);
      }

      return data || [];
    },
  });

  const totalEarnings =
    earnings?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>My Earnings</Title>

      <Select
        value={period}
        onChange={(value) => setPeriod(value || 'week')}
        data={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This Week' },
          { value: 'month', label: 'This Month' },
        ]}
      />

      {/* Summary Card */}
      <Card withBorder padding="lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack gap="xs">
          <Text size="sm" c="white" opacity={0.9}>
            Total Earnings ({period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'})
          </Text>
          <Text size="3xl" fw={700} c="white">
            <NumberFormatter
              value={totalEarnings / 100}
              prefix="$"
              decimalScale={2}
            />
          </Text>
          <Group gap="xs">
            <IconTrendingUp size={16} color="white" />
            <Text size="xs" c="white" opacity={0.9}>
              {earnings?.length || 0} deliveries
            </Text>
          </Group>
        </Stack>
      </Card>

      {/* Earnings List */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Recent Earnings
        </Title>
        {earnings && earnings.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Zone</Table.Th>
                <Table.Th>Type</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {earnings.map((earning: any) => (
                <Table.Tr key={earning.id}>
                  <Table.Td>
                    <Text size="sm">
                      {new Date(earning.earned_at).toLocaleDateString()}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(earning.earned_at).toLocaleTimeString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600}>
                      <NumberFormatter
                        value={(earning.total_cents || 0) / 100}
                        prefix="$"
                        decimalScale={2}
                      />
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <IconMapPin size={14} />
                      <Text size="sm">{earning.orders?.delivery_zone || 'N/A'}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {earning.tip_cents > 0 && (
                        <Badge size="sm" color="green">Tip</Badge>
                      )}
                      {earning.peak_bonus_cents > 0 && (
                        <Badge size="sm" color="blue">Peak</Badge>
                      )}
                      {earning.hotspot_bonus_cents > 0 && (
                        <Badge size="sm" color="orange">Hotspot</Badge>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No earnings found for this period
          </Text>
        )}
      </Card>
    </Stack>
  );
}



