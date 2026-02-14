// @ts-nocheck
import React from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Group,
  Loader,
  Center,
  Button,
  Grid,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

export const ProfitabilityDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch profitability data
  const { data: profitabilityData, isLoading } = useQuery({
    queryKey: ['driver-profitability'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [earningsRes, ordersRes, regionRes] = await Promise.all([
        supabase
          .from('driver_earnings')
          .select('total_cents, driver_id')
          .gte('earned_at', weekAgo.toISOString()),
        supabase
          .from('orders')
          .select('delivery_fee_cents, delivery_zone')
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('regions')
          .select('id, name'),
      ]);

      const totalPayouts =
        earningsRes.data?.reduce((sum, e) => sum + (e.total_cents || 0), 0) || 0;
      const totalRevenue =
        ordersRes.data?.reduce((sum, o) => sum + (o.delivery_fee_cents || 0), 0) || 0;

      // Calculate by region
      const regionBreakdown: Record<string, { revenue: number; payout: number }> = {};
      ordersRes.data?.forEach((order) => {
        const zone = order.delivery_zone || 'Unknown';
        if (!regionBreakdown[zone]) {
          regionBreakdown[zone] = { revenue: 0, payout: 0 };
        }
        regionBreakdown[zone].revenue += order.delivery_fee_cents || 0;
      });

      earningsRes.data?.forEach((earning) => {
        // This is simplified - in production, you'd join with trips to get zone
        const zone = 'Unknown';
        if (!regionBreakdown[zone]) {
          regionBreakdown[zone] = { revenue: 0, payout: 0 };
        }
        regionBreakdown[zone].payout += earning.total_cents || 0;
      });

      return {
        totalRevenue: totalRevenue / 100,
        totalPayouts: totalPayouts / 100,
        netProfit: (totalRevenue - totalPayouts) / 100,
        margin: totalRevenue > 0 ? ((totalRevenue - totalPayouts) / totalRevenue) * 100 : 0,
        regionBreakdown,
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

        <Title order={2}>Profitability Dashboard</Title>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Revenue vs Payout (7 days)
              </Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text>Total Revenue:</Text>
                  <Text fw={600}>
                    ${profitabilityData?.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Total Payouts:</Text>
                  <Text fw={600}>
                    ${profitabilityData?.totalPayouts.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Net Profit:</Text>
                  <Text
                    fw={600}
                    c={profitabilityData && profitabilityData.netProfit < 0 ? 'red' : 'green'}
                  >
                    ${profitabilityData?.netProfit.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Margin:</Text>
                  <Text fw={600}>
                    {profitabilityData?.margin.toFixed(1) || '0.0'}%
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg">
              <Title order={4} mb="md">
                Payout Breakdown by Region
              </Title>
              <Stack gap="sm">
                {Object.entries(profitabilityData?.regionBreakdown || {}).map(([zone, data]) => (
                  <Group key={zone} justify="space-between">
                    <Text>{zone}</Text>
                    <Text fw={600}>
                      ${(data.payout / 100).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <Card withBorder padding="lg">
          <Title order={4} mb="md">
            Profit per Delivery Trend
          </Title>
          <Text c="dimmed" size="sm">
            Chart visualization would go here. Integration with charting library recommended.
          </Text>
        </Card>
      </Stack>
  );
};

