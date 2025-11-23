import React, { useState, useEffect } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Table,
  Tabs,
  Box,
  Paper,
  Progress,
  Alert,
} from '@mantine/core';
import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconTrendingDown,
  IconInfoCircle,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';

interface CostCategory {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_pct: number;
}

interface VendorSpend {
  vendor: string;
  service: string;
  monthly_cost: number;
  annual_cost: number;
  contract_end?: string;
}

export const TechCostManagement: React.FC = () => {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [vendorSpend, setVendorSpend] = useState<VendorSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const toast = useToast();

  useEffect(() => {
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    setLoading(true);
    try {
      // Generate cost categories
      const categories: CostCategory[] = [
        {
          category: 'Cloud Infrastructure',
          budgeted: 50000,
          actual: 48500,
          variance: -1500,
          variance_pct: -3,
        },
        {
          category: 'Software Licenses',
          budgeted: 15000,
          actual: 15200,
          variance: 200,
          variance_pct: 1.3,
        },
        {
          category: 'Development Tools',
          budgeted: 8000,
          actual: 7800,
          variance: -200,
          variance_pct: -2.5,
        },
        {
          category: 'Security Tools',
          budgeted: 12000,
          actual: 11800,
          variance: -200,
          variance_pct: -1.7,
        },
        {
          category: 'Monitoring & Analytics',
          budgeted: 5000,
          actual: 5200,
          variance: 200,
          variance_pct: 4,
        },
      ];
      setCostCategories(categories);

      // Generate vendor spend
      setVendorSpend([
        {
          vendor: 'Supabase',
          service: 'Database & Storage',
          monthly_cost: 2500,
          annual_cost: 30000,
          contract_end: '2024-12-31',
        },
        {
          vendor: 'Vercel',
          service: 'Hosting & CDN',
          monthly_cost: 200,
          annual_cost: 2400,
        },
        {
          vendor: 'GitHub',
          service: 'Code Repository',
          monthly_cost: 400,
          annual_cost: 4800,
        },
        {
          vendor: 'Sentry',
          service: 'Error Tracking',
          monthly_cost: 300,
          annual_cost: 3600,
        },
      ]);
    } catch (error) {
      console.error('Error fetching cost data:', error);
      toast.error('Failed to load cost data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const totalBudgeted = costCategories.reduce((sum, c) => sum + c.budgeted, 0);
  const totalActual = costCategories.reduce((sum, c) => sum + c.actual, 0);
  const totalVariance = totalActual - totalBudgeted;
  const totalVariancePct = (totalVariance / totalBudgeted) * 100;
  const totalVendorSpend = vendorSpend.reduce((sum, v) => sum + v.annual_cost, 0);

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Tech Cost Management</Title>
          <Text c="dimmed" size="sm">
            Technology budget tracking, vendor spend analysis, and cost optimization
          </Text>
        </Box>
        <Badge size="lg" color="green" variant="light" leftSection={<IconCurrencyDollar size={16} />}>
          Cost Management
        </Badge>
      </Group>

      {/* Key Cost Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Monthly Budget</Text>
              <IconCurrencyDollar size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              ${(totalBudgeted / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Technology budget
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Actual Spend</Text>
              <IconCurrencyDollar size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              ${(totalActual / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              This month
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Variance</Text>
              {totalVariance < 0 ? (
                <IconTrendingDown size={20} color="#10b981" />
              ) : (
                <IconTrendingUp size={20} color="#ef4444" />
              )}
            </Group>
            <Text size="xl" fw={700} c={totalVariance < 0 ? 'green' : 'red'}>
              {totalVariance > 0 ? '+' : ''}
              ${(Math.abs(totalVariance) / 1000).toFixed(1)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {totalVariancePct > 0 ? '+' : ''}
              {totalVariancePct.toFixed(1)}% vs budget
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Annual Vendor Spend</Text>
              <IconCurrencyDollar size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              ${(totalVendorSpend / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Contracted services
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconCurrencyDollar size={16} />}>
            Budget Overview
          </Tabs.Tab>
          <Tabs.Tab value="vendors" leftSection={<IconInfoCircle size={16} />}>
            Vendor Spend
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<IconTrendingUp size={16} />}>
            Cost Trends
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Budget vs Actuals
            </Title>
            <MantineTable
              data={costCategories}
              loading={loading}
              rowKey="category"
              columns={[
                { title: 'Category', dataIndex: 'category' },
                {
                  title: 'Budgeted',
                  dataIndex: 'budgeted',
                  render: (v: number) => `$${(v / 1000).toFixed(0)}K`,
                },
                {
                  title: 'Actual',
                  dataIndex: 'actual',
                  render: (v: number) => `$${(v / 1000).toFixed(0)}K`,
                },
                {
                  title: 'Variance',
                  dataIndex: 'variance',
                  render: (v: number) => (
                    <Text c={v < 0 ? 'green' : 'red'}>
                      {v > 0 ? '+' : ''}
                      ${(Math.abs(v) / 1000).toFixed(1)}K
                    </Text>
                  ),
                },
                {
                  title: 'Variance %',
                  dataIndex: 'variance_pct',
                  render: (v: number) => (
                    <Text c={v < 0 ? 'green' : 'red'}>
                      {v > 0 ? '+' : ''}
                      {v.toFixed(1)}%
                    </Text>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="vendors" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Vendor Spend Analysis
            </Title>
            <MantineTable
              data={vendorSpend}
              loading={loading}
              rowKey={(r: any) => `${r.vendor}-${r.service}`}
              columns={[
                { title: 'Vendor', dataIndex: 'vendor' },
                { title: 'Service', dataIndex: 'service' },
                {
                  title: 'Monthly Cost',
                  dataIndex: 'monthly_cost',
                  render: (v: number) => `$${v.toLocaleString()}`,
                },
                {
                  title: 'Annual Cost',
                  dataIndex: 'annual_cost',
                  render: (v: number) => `$${v.toLocaleString()}`,
                },
                {
                  title: 'Contract End',
                  dataIndex: 'contract_end',
                  render: (v: string) => (v ? new Date(v).toLocaleDateString() : 'N/A'),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              12-Month Cost Trend
            </Title>
            <FuturisticChart
              data={Array.from({ length: 12 }, (_, i) => {
                const month = new Date();
                month.setMonth(month.getMonth() - (11 - i));
                return {
                  month: month.toLocaleString('default', { month: 'short' }),
                  Budget: totalBudgeted * (0.95 + Math.random() * 0.1),
                  Actual: totalActual * (0.9 + Math.random() * 0.2),
                };
              })}
              type="composed"
              title=""
              height={400}
              colors={['#3b82f6', '#10b981']}
              dataKeys={{ revenue: 'Budget', profit: 'Actual' }}
            />
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

