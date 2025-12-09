import React, { useState, useEffect } from 'react';
import {
  Card,
  Grid,
  Stack,
  Text,
  Title,
  Table,
  Tabs,
  Badge,
  Group,
  Button,
  Loader,
  Center,
  NumberFormatter,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconClock,
  IconUsers,
  IconChartBar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface CompensationKPIs {
  basePercentage: number;
  minimumPerDelivery: number;
  avgHourlyEarnings: number;
  driverPayoutVsRevenue: number;
  profitPerDelivery: number;
  totalDriverPayouts: number;
  totalDeliveryFeeRevenue: number;
}

export const DriverCompensationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('metrics');

  // Fetch compensation config
  const { data: config, isLoading: configLoading } = useQuery({
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

      return data || null;
    },
  });

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['driver-comp-kpis'],
    queryFn: async (): Promise<CompensationKPIs> => {
      // Calculate KPIs from driver_earnings and orders
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [earningsRes, ordersRes, weeklyStatsRes] = await Promise.all([
        supabase
          .from('driver_earnings')
          .select('total_cents')
          .gte('earned_at', weekAgo.toISOString()),
        supabase
          .from('orders')
          .select('delivery_fee_cents')
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('driver_weekly_stats')
          .select('total_earnings_cents, total_hours, total_trips')
          .gte('week_start_date', weekAgo.toISOString().split('T')[0]),
      ]);

      const totalPayouts =
        earningsRes.data?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;
      const totalRevenue =
        ordersRes.data?.reduce((sum, o) => sum + (o.delivery_fee_cents || 0), 0) || 0;

      const weeklyStats = weeklyStatsRes.data || [];
      const totalHours = weeklyStats.reduce((sum, s) => sum + (s.total_hours || 0), 0);
      const totalTrips = weeklyStats.reduce((sum, s) => sum + (s.total_trips || 0), 0);

      const avgHourlyEarnings = totalHours > 0 ? totalPayouts / totalHours : 0;
      const profitPerDelivery =
        totalTrips > 0 ? (totalRevenue - totalPayouts) / totalTrips : 0;
      const payoutVsRevenue = totalRevenue > 0 ? (totalPayouts / totalRevenue) * 100 : 0;

      return {
        basePercentage: config?.base_percentage || 70,
        minimumPerDelivery: (config?.minimum_per_delivery || 200) / 100,
        avgHourlyEarnings: avgHourlyEarnings / 100,
        driverPayoutVsRevenue: payoutVsRevenue,
        profitPerDelivery: profitPerDelivery / 100,
        totalDriverPayouts: totalPayouts / 100,
        totalDeliveryFeeRevenue: totalRevenue / 100,
      };
    },
    enabled: !!config,
  });

  if (configLoading || kpisLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Driver Compensation Dashboard</Title>
            <Text c="dimmed" size="sm">
              Monitor and manage driver pay structure and profitability
            </Text>
          </div>
          <Button onClick={() => navigate('/finance/driver-compensation/config')}>
            Configure Pay Structure
          </Button>
        </Group>

        {/* KPI Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Base Percentage
                </Text>
                <Group gap="xs">
                  <IconCurrencyDollar size={24} />
                  <Text size="xl" fw={700}>
                    {kpis?.basePercentage || 0}%
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Minimum per Delivery
                </Text>
                <Group gap="xs">
                  <IconCurrencyDollar size={24} />
                  <Text size="xl" fw={700}>
                    <NumberFormatter
                      value={kpis?.minimumPerDelivery || 0}
                      prefix="$"
                      decimalScale={2}
                    />
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Avg Hourly Earnings
                </Text>
                <Group gap="xs">
                  <IconClock size={24} />
                  <Text size="xl" fw={700}>
                    <NumberFormatter
                      value={kpis?.avgHourlyEarnings || 0}
                      prefix="$"
                      decimalScale={2}
                    />
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Driver Payout vs Revenue
                </Text>
                <Group gap="xs">
                  <IconChartBar size={24} />
                  <Text size="xl" fw={700}>
                    {kpis?.driverPayoutVsRevenue.toFixed(1) || 0}%
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Profit per Delivery
                </Text>
                <Group gap="xs">
                  <IconTrendingUp size={24} />
                  <Text size="xl" fw={700} c={kpis && kpis.profitPerDelivery < 0 ? 'red' : 'green'}>
                    <NumberFormatter
                      value={kpis?.profitPerDelivery || 0}
                      prefix="$"
                      decimalScale={2}
                    />
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder padding="lg">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Total Driver Payouts (7d)
                </Text>
                <Group gap="xs">
                  <IconUsers size={24} />
                  <Text size="xl" fw={700}>
                    <NumberFormatter
                      value={kpis?.totalDriverPayouts || 0}
                      prefix="$"
                      thousandSeparator
                      decimalScale={0}
                    />
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'metrics')}>
          <Tabs.List>
            <Tabs.Tab value="metrics">Metrics</Tabs.Tab>
            <Tabs.Tab value="bonuses">Bonuses</Tabs.Tab>
            <Tabs.Tab value="peak-rules">Peak Rules</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="metrics" pt="md">
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Earnings Summary
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th>Trend</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>Total Revenue (7d)</Table.Td>
                    <Table.Td>
                      <NumberFormatter
                        value={kpis?.totalDeliveryFeeRevenue || 0}
                        prefix="$"
                        thousandSeparator
                        decimalScale={0}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color="green" leftSection={<IconTrendingUp size={12} />}>
                        +5.2%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Total Payouts (7d)</Table.Td>
                    <Table.Td>
                      <NumberFormatter
                        value={kpis?.totalDriverPayouts || 0}
                        prefix="$"
                        thousandSeparator
                        decimalScale={0}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" leftSection={<IconTrendingUp size={12} />}>
                        +3.1%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Net Margin (7d)</Table.Td>
                    <Table.Td>
                      <NumberFormatter
                        value={(kpis?.totalDeliveryFeeRevenue || 0) - (kpis?.totalDriverPayouts || 0)}
                        prefix="$"
                        thousandSeparator
                        decimalScale={0}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color="green" leftSection={<IconTrendingUp size={12} />}>
                        +8.5%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="bonuses" pt="md">
            <Card withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={4}>Recent Bonuses</Title>
                <Button
                  variant="subtle"
                  onClick={() => navigate('/finance/driver-compensation/bonuses')}
                >
                  View All
                </Button>
              </Group>
              <Text c="dimmed" size="sm">
                View detailed bonus information in the Bonuses tab
              </Text>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="peak-rules" pt="md">
            <Card withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={4}>Active Peak Rules</Title>
                <Button
                  variant="subtle"
                  onClick={() => navigate('/finance/driver-compensation/peak-rules')}
                >
                  Manage Rules
                </Button>
              </Group>
              <Text c="dimmed" size="sm">
                Configure peak time multipliers in the Peak Rules tab
              </Text>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>
  );
};

