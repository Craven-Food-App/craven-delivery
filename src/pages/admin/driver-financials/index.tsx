import React from 'react';
import {
  Card,
  Grid,
  Stack,
  Text,
  Title,
  Loader,
  Center,
  NumberFormatter,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconUsers,
  IconClock,
} from '@tabler/icons-react';

export default function DriverFinancialsDashboard() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-driver-financials'],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const [weekEarningsRes, monthEarningsRes, revenueRes, weeklyStatsRes] = await Promise.all([
        supabase
          .from('driver_earnings')
          .select('total_cents')
          .gte('earned_at', weekAgo.toISOString()),
        supabase
          .from('driver_earnings')
          .select('total_cents')
          .gte('earned_at', monthAgo.toISOString()),
        supabase
          .from('orders')
          .select('delivery_fee_cents')
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('driver_weekly_stats')
          .select('total_earnings_cents, total_hours')
          .gte('week_start_date', weekAgo.toISOString().split('T')[0]),
      ]);

      const weekPayouts =
        weekEarningsRes.data?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;
      const monthPayouts =
        monthEarningsRes.data?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;
      const deliveryFeeRevenue =
        revenueRes.data?.reduce((sum, o) => sum + (o.delivery_fee_cents || 0), 0) || 0;

      const weeklyStats = weeklyStatsRes.data || [];
      const totalHours = weeklyStats.reduce((sum, s) => sum + (s.total_hours || 0), 0);
      const avgHourlyEarnings = totalHours > 0 ? weekPayouts / totalHours : 0;

      const netMargin = deliveryFeeRevenue - weekPayouts;

      return {
        totalDriverPayoutsWeek: weekPayouts / 100,
        totalDriverPayoutsMonth: monthPayouts / 100,
        deliveryFeeRevenue: deliveryFeeRevenue / 100,
        netDriverMargin: netMargin / 100,
        avgHourlyEarnings: avgHourlyEarnings / 100,
      };
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
      <Title order={2}>Driver Financials Dashboard</Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Total Driver Payouts (Week)
              </Text>
              <Group gap="xs">
                <IconCurrencyDollar size={24} />
                <Text size="xl" fw={700}>
                  <NumberFormatter
                    value={kpis?.totalDriverPayoutsWeek || 0}
                    prefix="$"
                    thousandSeparator
                    decimalScale={0}
                  />
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Total Driver Payouts (Month)
              </Text>
              <Group gap="xs">
                <IconCurrencyDollar size={24} />
                <Text size="xl" fw={700}>
                  <NumberFormatter
                    value={kpis?.totalDriverPayoutsMonth || 0}
                    prefix="$"
                    thousandSeparator
                    decimalScale={0}
                  />
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Delivery Fee Revenue (Week)
              </Text>
              <Group gap="xs">
                <IconTrendingUp size={24} />
                <Text size="xl" fw={700}>
                  <NumberFormatter
                    value={kpis?.deliveryFeeRevenue || 0}
                    prefix="$"
                    thousandSeparator
                    decimalScale={0}
                  />
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Net Driver Margin (Week)
              </Text>
              <Group gap="xs">
                <IconCurrencyDollar size={24} />
                <Text
                  size="xl"
                  fw={700}
                  c={kpis && kpis.netDriverMargin < 0 ? 'red' : 'green'}
                >
                  <NumberFormatter
                    value={kpis?.netDriverMargin || 0}
                    prefix="$"
                    thousandSeparator
                    decimalScale={0}
                  />
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
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
      </Grid>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Financial Overview Chart
        </Title>
        <Text c="dimmed" size="sm">
          Chart visualization would go here showing revenue vs payouts over time
        </Text>
      </Card>
    </Stack>
  );
}


