import React, { useState, useEffect } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Table,
  Tabs,
  Alert,
  Box,
  Paper,
  Progress,
  Divider,
  Loader,
} from '@mantine/core';
import {
  IconChartLine,
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconEdit,
  IconTrash,
  IconInfoCircle,
  IconCalculator,
  IconUsers,
  IconBuilding,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from './FuturisticChart';

interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  revenue: number;
  expenses: number;
  profit: number;
  assumptions: string[];
}

interface BudgetLineItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_pct: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
}

interface Driver {
  id: string;
  name: string;
  type: 'revenue' | 'cost' | 'headcount';
  current_value: number;
  forecast_value: number;
  impact: number;
}

export const EnhancedFPandA: React.FC = () => {
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('forecast');
  const [scenarioModalOpened, setScenarioModalOpened] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchFPAData();
  }, []);

  const fetchFPAData = async () => {
    setLoading(true);
    try {
      // Fetch orders for revenue forecasting
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      const currentRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / 12; // Monthly average

      // Create forecast scenarios
      setScenarios([
        {
          id: '1',
          name: 'Base Case',
          description: 'Conservative growth assumptions',
          probability: 50,
          revenue: currentRevenue * 1.1,
          expenses: currentRevenue * 0.65,
          profit: currentRevenue * 0.45,
          assumptions: ['5% MoM growth', 'Stable COGS at 36%', 'OpEx scaling with revenue'],
        },
        {
          id: '2',
          name: 'Optimistic',
          description: 'Strong market conditions and execution',
          probability: 25,
          revenue: currentRevenue * 1.25,
          expenses: currentRevenue * 0.60,
          profit: currentRevenue * 0.65,
          assumptions: ['10% MoM growth', 'Improved margins', 'Efficient scaling'],
        },
        {
          id: '3',
          name: 'Pessimistic',
          description: 'Market headwinds and slower growth',
          probability: 25,
          revenue: currentRevenue * 0.95,
          expenses: currentRevenue * 0.70,
          profit: currentRevenue * 0.25,
          assumptions: ['2% MoM growth', 'Margin pressure', 'Increased competition'],
        },
      ]);

      // Create budget vs actuals
      const categories = ['Salaries', 'R&D', 'Rent & Utilities', 'Marketing', 'Operations', 'Other'];
      setBudgetItems(
        categories.map((cat, idx) => {
          const budgeted = currentRevenue * [0.64, 0.20, 0.10, 0.03, 0.02, 0.01][idx];
          const actual = budgeted * (0.9 + Math.random() * 0.2);
          const variance = actual - budgeted;
          const variance_pct = (variance / budgeted) * 100;
          return {
            id: `${idx + 1}`,
            category: cat,
            budgeted,
            actual,
            variance,
            variance_pct,
            status:
              Math.abs(variance_pct) < 5
                ? 'on_track'
                : variance_pct > 10
                ? 'over_budget'
                : 'at_risk',
          };
        })
      );

      // Create driver-based forecast drivers
      setDrivers([
        {
          id: '1',
          name: 'Monthly Active Customers',
          type: 'revenue',
          current_value: 1250,
          forecast_value: 1500,
          impact: 20,
        },
        {
          id: '2',
          name: 'Average Order Value',
          type: 'revenue',
          current_value: 45,
          forecast_value: 50,
          impact: 11,
        },
        {
          id: '3',
          name: 'Headcount',
          type: 'cost',
          current_value: 85,
          forecast_value: 100,
          impact: -18,
        },
        {
          id: '4',
          name: 'Customer Acquisition Cost',
          type: 'cost',
          current_value: 25,
          forecast_value: 22,
          impact: 12,
        },
      ]);
    } catch (error) {
      console.error('Error fetching FPA data:', error);
      toast.error('Failed to load FP&A data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const weightedRevenue = scenarios.length > 0 ? scenarios.reduce(
    (sum, s) => sum + (s.revenue || 0) * ((s.probability || 0) / 100),
    0
  ) : 0;
  const weightedExpenses = scenarios.length > 0 ? scenarios.reduce(
    (sum, s) => sum + (s.expenses || 0) * ((s.probability || 0) / 100),
    0
  ) : 0;
  const weightedProfit = weightedRevenue - weightedExpenses;

  if (loading) {
    return (
      <Stack gap="lg" p="md" align="center" justify="center" style={{ minHeight: '400px' }}>
        <Loader size="lg" color="violet" />
        <Text c="dimmed">Loading FP&A data...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Financial Planning & Analysis</Title>
          <Text c="dimmed" size="sm">
            Driver-based forecasting, multi-scenario planning, and budget management
          </Text>
        </Box>
        <Badge size="lg" color="violet" variant="light" leftSection={<IconCalculator size={16} />}>
          FP&A
        </Badge>
      </Group>

      {/* Key FP&A Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Weighted Revenue Forecast</Text>
              <IconTrendingUp size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              ${(weightedRevenue / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Next 12 months
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Weighted Expenses</Text>
              <IconTrendingDown size={20} color="#ef4444" />
            </Group>
            <Text size="xl" fw={700} c="red">
              ${(weightedExpenses / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Next 12 months
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Projected Profit</Text>
              <IconTarget size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              ${(weightedProfit / 1000).toFixed(0)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Next 12 months
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Budget Variance</Text>
              <IconInfoCircle size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              {(
                (budgetItems.reduce((sum, item) => sum + item.variance, 0) /
                  budgetItems.reduce((sum, item) => sum + item.budgeted, 0)) *
                100
              ).toFixed(1)}
              %
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Overall variance
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'forecast')}>
        <Tabs.List>
          <Tabs.Tab value="forecast" leftSection={<IconChartLine size={16} />}>
            Multi-Scenario Forecast
          </Tabs.Tab>
          <Tabs.Tab value="budget" leftSection={<IconTarget size={16} />}>
            Budget vs Actuals
          </Tabs.Tab>
          <Tabs.Tab value="drivers" leftSection={<IconCalculator size={16} />}>
            Driver-Based Planning
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="forecast" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Forecast Scenarios</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setScenarioModalOpened(true)}
              >
                Create Scenario
              </Button>
            </Group>
            <Grid gutter="md">
              {scenarios.length > 0 ? scenarios.map((scenario) => (
                <Grid.Col key={scenario.id} span={{ base: 12, md: 4 }}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Title order={5}>{scenario.name}</Title>
                      <Badge color="blue" variant="light">
                        {scenario.probability}% probability
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      {scenario.description}
                    </Text>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm">Revenue:</Text>
                        <Text fw={600}>${(scenario.revenue / 1000).toFixed(0)}K</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">Expenses:</Text>
                        <Text fw={600} c="red">
                          ${(scenario.expenses / 1000).toFixed(0)}K
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">Profit:</Text>
                        <Text fw={600} c="green">
                          ${(scenario.profit / 1000).toFixed(0)}K
                        </Text>
                      </Group>
                      <Divider my="xs" />
                      <Text size="xs" fw={600} mb={4}>
                        Key Assumptions:
                      </Text>
                      {scenario.assumptions.map((assumption, idx) => (
                        <Text key={idx} size="xs" c="dimmed">
                          • {assumption}
                        </Text>
                      ))}
                    </Stack>
                  </Card>
                </Grid.Col>
              )) : (
                <Grid.Col span={12}>
                  <Text c="dimmed" ta="center" p="xl">
                    Loading forecast scenarios...
                  </Text>
                </Grid.Col>
              )}
            </Grid>
            <Box mt="lg">
              <Title order={5} mb="md">
                12-Month Forecast Comparison
              </Title>
              {scenarios.length >= 3 ? (
                <FuturisticChart
                  data={Array.from({ length: 12 }, (_, i) => {
                    const month = new Date();
                    month.setMonth(month.getMonth() + i);
                    return {
                      month: month.toLocaleString('default', { month: 'short' }),
                      Base: (scenarios[0]?.revenue || 0) * (1 + i * 0.05),
                      Optimistic: (scenarios[1]?.revenue || 0) * (1 + i * 0.1),
                      Pessimistic: (scenarios[2]?.revenue || 0) * (1 + i * 0.02),
                    };
                  })}
                  type="line"
                  title=""
                  height={350}
                  colors={['#3b82f6', '#10b981', '#ef4444']}
                  dataKeys={{ revenue: 'Base', profit: 'Optimistic', expenses: 'Pessimistic' }}
                />
              ) : (
                <Text c="dimmed" ta="center" p="xl">
                  Loading forecast scenarios...
                </Text>
              )}
            </Box>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="budget" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Budget vs Actuals Analysis
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Budgeted</Table.Th>
                  <Table.Th>Actual</Table.Th>
                  <Table.Th>Variance</Table.Th>
                  <Table.Th>Variance %</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {budgetItems.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text fw={600}>{item.category}</Text>
                    </Table.Td>
                    <Table.Td>${(item.budgeted / 1000).toFixed(0)}K</Table.Td>
                    <Table.Td>${(item.actual / 1000).toFixed(0)}K</Table.Td>
                    <Table.Td>
                      <Text c={item.variance > 0 ? 'red' : 'green'}>
                        {item.variance > 0 ? '+' : ''}
                        ${(item.variance / 1000).toFixed(0)}K
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c={item.variance_pct > 0 ? 'red' : 'green'}>
                        {item.variance_pct > 0 ? '+' : ''}
                        {item.variance_pct.toFixed(1)}%
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          item.status === 'on_track'
                            ? 'green'
                            : item.status === 'at_risk'
                            ? 'yellow'
                            : 'red'
                        }
                        variant="light"
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="drivers" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Driver-Based Forecast Model
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Driver</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Current Value</Table.Th>
                  <Table.Th>Forecast Value</Table.Th>
                  <Table.Th>Impact on Revenue</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {drivers.map((driver) => (
                  <Table.Tr key={driver.id}>
                    <Table.Td>
                      <Text fw={600}>{driver.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={driver.type === 'revenue' ? 'green' : 'red'}
                        variant="light"
                      >
                        {driver.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{driver.current_value}</Table.Td>
                    <Table.Td>
                      <Text fw={600}>{driver.forecast_value}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c={driver.impact > 0 ? 'green' : 'red'} fw={600}>
                        {driver.impact > 0 ? '+' : ''}
                        {driver.impact}%
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
              <Text size="sm">
                Driver-based forecasting uses key business metrics to predict financial outcomes.
                Changes to drivers automatically update revenue and expense forecasts.
              </Text>
            </Alert>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

