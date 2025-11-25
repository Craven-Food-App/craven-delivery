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
  Button,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Divider,
} from '@mantine/core';
import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconTrendingDown,
  IconInfoCircle,
  IconAlertTriangle,
  IconBell,
  IconRefresh,
  IconCheck,
  IconX,
  IconChartLine,
  IconBulb,
  IconShield,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';

interface CostCategory {
  category_id: string;
  category_name: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_pct: number;
}

interface VendorSpend {
  id: string;
  vendor: string;
  service: string;
  monthly_cost: number;
  annual_cost: number;
  contract_end?: string;
  is_shadow_tool?: boolean;
}

interface CostAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  variance_percentage?: number;
  estimated_impact?: number;
  status: string;
  created_at: string;
  category?: { name: string };
  vendor?: { name: string; service_name: string };
}

interface Optimization {
  type: string;
  vendor: string;
  service: string;
  recommendation: string;
  potential_savings: number;
  unused_licenses?: number;
  overage_gb?: number;
  current_usage_gb?: number;
  budget_gb?: number;
}

export const TechCostManagement: React.FC = () => {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [vendorSpend, setVendorSpend] = useState<VendorSpend[]>([]);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [actualCosts, setActualCosts] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchCostData();
    // Set up real-time subscription for alerts
    const channel = supabase
      .channel('tech-cost-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tech_cost_alerts',
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCostData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchVariances(),
        fetchVendors(),
        fetchAlerts(),
        fetchOptimizations(),
        fetchForecasts(),
        fetchActualCosts(),
        fetchBudgets(),
      ]);
    } catch (error) {
      console.error('Error fetching cost data:', error);
      toast.error('Failed to load cost data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariances = async () => {
    const { data, error } = await supabase.rpc('check_cost_variances');
    if (error) {
      console.error('Error fetching variances:', error);
      setCostCategories([]);
    } else {
      setCostCategories(
        (data || []).map((v: any) => ({
          category_id: v.category_id,
          category_name: v.category_name,
          budgeted: parseFloat(v.budgeted) || 0,
          actual: parseFloat(v.actual) || 0,
          variance: parseFloat(v.variance) || 0,
          variance_pct: parseFloat(v.variance_pct) || 0,
        }))
      );
    }
  };

  const fetchVendors = async () => {
    try {
      // Fetch active vendors - only show vendors created in 2025 or later (no fake 2024 data)
      const { data: vendors, error: vendorsError } = await supabase
        .from('tech_vendors')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', '2025-01-01')
        .order('monthly_cost', { ascending: false });

      if (vendorsError) {
        console.error('Error fetching vendors:', vendorsError);
        setVendorSpend([]);
        return;
      }

      if (!vendors || vendors.length === 0) {
        setVendorSpend([]);
        return;
      }

      // Get current month and last 12 months for calculations
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Fetch actual costs for the last 12 months (will be stored by fetchActualCosts)
      const { data: vendorCostsData, error: costsError } = await supabase
        .from('tech_actual_costs')
        .select('vendor_id, period, amount')
        .gte('period', `${currentDate.getFullYear() - 1}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)
        .lte('period', currentMonth);

      if (costsError) {
        console.error('Error fetching actual costs:', costsError);
      }

      // Calculate real monthly and annual costs from actual spending
      const vendorSpendData = vendors.map((v: any) => {
        // Find actual costs for this vendor
        const vendorCosts = (vendorCostsData || []).filter((ac: any) => ac.vendor_id === v.id);
        
        // Calculate average monthly cost from actual costs (last 12 months)
        let monthly_cost = parseFloat(v.monthly_cost) || 0;
        let annual_cost = parseFloat(v.annual_cost) || monthly_cost * 12;

        if (vendorCosts.length > 0) {
          // Calculate average monthly cost from actual spending
          const totalSpent = vendorCosts.reduce((sum: number, cost: any) => sum + parseFloat(cost.amount || 0), 0);
          const monthsWithData = new Set(vendorCosts.map((c: any) => c.period)).size;
          
          if (monthsWithData > 0) {
            monthly_cost = totalSpent / monthsWithData;
            annual_cost = monthly_cost * 12;
          }
          
          // If we have current month data, use that as monthly cost
          const currentMonthCost = vendorCosts.find((c: any) => c.period === currentMonth);
          if (currentMonthCost) {
            monthly_cost = parseFloat(currentMonthCost.amount) || monthly_cost;
            annual_cost = monthly_cost * 12;
          }
        }

        return {
          id: v.id,
          vendor: v.name,
          service: v.service_name,
          monthly_cost: Math.round(monthly_cost * 100) / 100, // Round to 2 decimals
          annual_cost: Math.round(annual_cost * 100) / 100,
          contract_end: v.contract_end_date,
          is_shadow_tool: v.is_shadow_tool,
        };
      });

      // Sort by monthly cost descending
      vendorSpendData.sort((a, b) => b.monthly_cost - a.monthly_cost);
      setVendorSpend(vendorSpendData);
    } catch (error) {
      console.error('Error in fetchVendors:', error);
      setVendorSpend([]);
    }
  };

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('tech_cost_alerts')
      .select(`
        *,
        category:tech_cost_categories(name),
        vendor:tech_vendors(name, service_name)
      `)
      .in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setAlerts(data as any);
    }
  };

  const fetchOptimizations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tech-cost-optimize');
      if (!error && data) {
        setOptimizations(data.optimizations || []);
      }
    } catch (error) {
      console.error('Error fetching optimizations:', error);
    }
  };

  const fetchForecasts = async () => {
    const { data, error } = await supabase
      .from('tech_cost_forecasts')
      .select(`
        *,
        category:tech_cost_categories(name)
      `)
      .gte('forecast_period', new Date().toISOString().slice(0, 7))
      .order('forecast_period', { ascending: true })
      .limit(12);

    if (!error && data) {
      setForecasts(data);
    }
  };

  const fetchActualCosts = async () => {
    const currentDate = new Date();
    const { data, error } = await supabase
      .from('tech_actual_costs')
      .select('period, amount, category_id')
      .gte('period', `${currentDate.getFullYear() - 1}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)
      .lte('period', `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);

    if (!error && data) {
      setActualCosts(data);
    }
  };

  const fetchBudgets = async () => {
    const currentDate = new Date();
    const { data, error } = await supabase
      .from('tech_budgets')
      .select('period, budgeted_amount, category_id')
      .gte('period', `${currentDate.getFullYear() - 1}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)
      .lte('period', `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);

    if (!error && data) {
      setBudgets(data);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger cost monitor
      await supabase.functions.invoke('tech-cost-monitor');
      await fetchCostData();
      toast.success('Cost data refreshed', 'Success');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh', 'Error');
    } finally {
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('tech_cost_alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);

    if (!error) {
      fetchAlerts();
      toast.success('Alert acknowledged', 'Success');
    }
  };

  const totalBudgeted = costCategories.reduce((sum, c) => sum + c.budgeted, 0);
  const totalActual = costCategories.reduce((sum, c) => sum + c.actual, 0);
  const totalVariance = totalActual - totalBudgeted;
  const totalVariancePct = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;
  const totalVendorSpend = vendorSpend.reduce((sum, v) => sum + v.annual_cost, 0);
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const totalOptimizationSavings = optimizations
    .filter((o) => o.potential_savings > 0)
    .reduce((sum, o) => sum + o.potential_savings, 0);

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Tech Cost Management</Title>
          <Text c="dimmed" size="sm">
            Automated financial operations system with real-time monitoring, optimization, and forecasting
          </Text>
        </Box>
        <Group>
          {activeAlertsCount > 0 && (
            <Badge size="lg" color="red" variant="light" leftSection={<IconAlertTriangle size={16} />}>
              {activeAlertsCount} Active Alerts
            </Badge>
          )}
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      {/* Active Alerts Banner */}
      {activeAlertsCount > 0 && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={`${activeAlertsCount} Active Cost Alert${activeAlertsCount > 1 ? 's' : ''}`}
          color="red"
          variant="light"
        >
          <Text size="sm">
            {alerts
              .filter((a) => a.status === 'active')
              .slice(0, 3)
              .map((a) => a.title)
              .join(' • ')}
            {activeAlertsCount > 3 && ` • +${activeAlertsCount - 3} more`}
          </Text>
        </Alert>
      )}

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
        {totalOptimizationSavings > 0 && (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Potential Savings</Text>
                <IconBulb size={20} color="#f59e0b" />
              </Group>
              <Text size="xl" fw={700} c="orange">
                ${(totalOptimizationSavings / 1000).toFixed(1)}K
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Optimization opportunities
              </Text>
            </Card>
          </Grid.Col>
        )}
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconCurrencyDollar size={16} />}>
            Budget Overview
          </Tabs.Tab>
          <Tabs.Tab value="alerts" leftSection={<IconBell size={16} />}>
            Alerts {activeAlertsCount > 0 && `(${activeAlertsCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="optimization" leftSection={<IconBulb size={16} />}>
            Optimization {optimizations.length > 0 && `(${optimizations.length})`}
          </Tabs.Tab>
          <Tabs.Tab value="vendors" leftSection={<IconInfoCircle size={16} />}>
            Vendor Spend
          </Tabs.Tab>
          <Tabs.Tab value="forecasting" leftSection={<IconChartLine size={16} />}>
            Forecasting
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<IconTrendingUp size={16} />}>
            Cost Trends
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                Budget vs Actuals
              </Title>
              <MantineTable
                data={costCategories}
                loading={loading}
                rowKey="category_id"
                columns={[
                  { title: 'Category', dataIndex: 'category_name' },
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
                    render: (v: number) => {
                      const absV = Math.abs(v);
                      return (
                        <Group gap="xs">
                          <Text c={v < 0 ? 'green' : v > 5 ? 'red' : 'yellow'}>
                            {v > 0 ? '+' : ''}
                            {v.toFixed(1)}%
                          </Text>
                          {absV >= 5 && (
                            <Badge size="xs" color={absV >= 20 ? 'red' : 'yellow'}>
                              Alert
                            </Badge>
                          )}
                        </Group>
                      );
                    },
                  },
                ]}
              />
            </Card>

            {/* Real-time Overage Detection */}
            {costCategories.some((c) => Math.abs(c.variance_pct) >= 5) && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md" c="red">
                  ⚠️ Real-Time Overage Detection
                </Title>
                <Stack gap="sm">
                  {costCategories
                    .filter((c) => Math.abs(c.variance_pct) >= 5)
                    .map((category) => (
                      <Alert
                        key={category.category_id}
                        color={category.variance_pct > 0 ? 'red' : 'green'}
                        title={`${category.category_name}: ${category.variance_pct > 0 ? '+' : ''}${category.variance_pct.toFixed(1)}% ${category.variance_pct > 0 ? 'over' : 'under'} budget`}
                      >
                        <Text size="sm">
                          Budgeted: ${(category.budgeted / 1000).toFixed(0)}K | Actual: ${(category.actual / 1000).toFixed(0)}K | Variance: ${category.variance > 0 ? '+' : ''}${(category.variance / 1000).toFixed(1)}K
                        </Text>
                        {category.variance_pct > 0 && category.variance_pct > 5 && (
                          <Text size="xs" c="dimmed" mt="xs">
                            Alert threshold exceeded (5%). Email and Slack notifications sent to CTO & CFO.
                          </Text>
                        )}
                      </Alert>
                    ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="alerts" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Cost Alerts</Title>
              <Badge color="red" variant="light">
                {activeAlertsCount} Active
              </Badge>
            </Group>
            <ScrollArea h={600}>
              <Stack gap="sm">
                {alerts.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No active alerts
                  </Text>
                ) : (
                  alerts.map((alert) => (
                    <Card key={alert.id} shadow="xs" padding="md" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Group gap="xs" mb="xs">
                            <Badge
                              color={
                                alert.severity === 'critical'
                                  ? 'red'
                                  : alert.severity === 'warning'
                                  ? 'yellow'
                                  : 'blue'
                              }
                              variant="light"
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant="dot">{alert.alert_type}</Badge>
                            {alert.status === 'active' && (
                              <Badge color="red" variant="light">
                                Active
                              </Badge>
                            )}
                          </Group>
                          <Text fw={600} mb="xs">
                            {alert.title}
                          </Text>
                          <Text size="sm" c="dimmed" mb="xs">
                            {alert.message}
                          </Text>
                          {alert.estimated_impact && (
                            <Text size="sm" fw={500} c="red">
                              Estimated Impact: ${alert.estimated_impact.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed" mt="xs">
                            {new Date(alert.created_at).toLocaleString()}
                          </Text>
                        </Box>
                        {alert.status === 'active' && (
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="optimization" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Vendor Optimization Recommendations
            </Title>
            {optimizations.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No optimization opportunities found. All vendors are optimized.
              </Text>
            ) : (
              <Stack gap="md">
                {optimizations.map((opt, idx) => (
                  <Card key={idx} shadow="xs" padding="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Group gap="xs" mb="xs">
                          <Badge
                            color={
                              opt.type === 'shadow_tool'
                                ? 'red'
                                : opt.type === 'unused_license'
                                ? 'yellow'
                                : 'blue'
                            }
                            variant="light"
                          >
                            {opt.type.replace('_', ' ')}
                          </Badge>
                          {opt.potential_savings > 0 && (
                            <Badge color="green" variant="light">
                              Save ${opt.potential_savings.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}/mo
                            </Badge>
                          )}
                        </Group>
                        <Text fw={600} mb="xs">
                          {opt.vendor} - {opt.service}
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          {opt.recommendation}
                        </Text>
                        {opt.unused_licenses && (
                          <Text size="sm">
                            <strong>Unused Licenses:</strong> {opt.unused_licenses}
                          </Text>
                        )}
                        {opt.overage_gb && (
                          <Text size="sm">
                            <strong>Storage Overage:</strong> {opt.overage_gb.toFixed(0)}GB over budget
                            {opt.current_usage_gb && ` (${opt.current_usage_gb.toFixed(0)}GB used)`}
                          </Text>
                        )}
                      </Box>
                    </Group>
                  </Card>
                ))}
                <Divider />
                <Card shadow="xs" padding="md" withBorder bg="green.0">
                  <Group justify="space-between">
                    <Text fw={600}>Total Potential Savings</Text>
                    <Text size="xl" fw={700} c="green">
                      ${totalOptimizationSavings.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /month
                    </Text>
                  </Group>
                </Card>
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="vendors" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Vendor Spend Analysis
            </Title>
            {vendorSpend.length === 0 && !loading ? (
              <Text c="dimmed" ta="center" py="xl">
                No active vendors found. Add vendors in the Tech Cost Management system.
              </Text>
            ) : (
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
                    render: (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  },
                  {
                    title: 'Annual Cost',
                    dataIndex: 'annual_cost',
                    render: (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  },
                  {
                    title: 'Contract End',
                    dataIndex: 'contract_end',
                    render: (v: string) => (v ? new Date(v).toLocaleDateString() : 'N/A'),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'is_shadow_tool',
                    render: (v: boolean) =>
                      v ? (
                        <Badge color="red" variant="light">
                          Shadow Tool
                        </Badge>
                      ) : (
                        <Badge color="green" variant="light">
                          Approved
                        </Badge>
                      ),
                  },
                ]}
              />
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="forecasting" pt="md">
          <Stack gap="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                12-Month Burn Rate Forecast
              </Title>
              {forecasts.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  No forecast data available. Forecasts are generated from real cost trends.
                </Text>
              ) : (
                <FuturisticChart
                  data={forecasts.map((forecast: any) => ({
                    month: new Date(forecast.forecast_period + '-01').toLocaleString('default', { month: 'short', year: 'numeric' }),
                    'Projected Cost': parseFloat(forecast.forecasted_amount || 0),
                    'Budget': totalBudgeted,
                  }))}
                  type="composed"
                  title=""
                  height={400}
                  colors={['#ef4444', '#3b82f6']}
                  dataKeys={{ revenue: 'Projected Cost', profit: 'Budget' }}
                />
              )}
            </Card>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={5} mb="md">
                    Infrastructure Cost Projections
                  </Title>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">Current Monthly</Text>
                      <Text fw={600}>${totalActual > 0 ? (totalActual / 1000).toFixed(0) + 'K' : 'N/A'}</Text>
                    </Group>
                    {forecasts.length > 0 ? (
                      <>
                        {forecasts.filter((f: any) => f.forecast_period >= '2025-06').slice(0, 1).map((forecast: any) => (
                          <Group key={forecast.id} justify="space-between">
                            <Text size="sm">6-Month Forecast</Text>
                            <Text fw={600} c="orange">
                              ${(parseFloat(forecast.forecasted_amount || 0) / 1000).toFixed(0)}K
                            </Text>
                          </Group>
                        ))}
                        {forecasts.filter((f: any) => f.forecast_period >= '2025-12').slice(0, 1).map((forecast: any) => (
                          <Group key={forecast.id} justify="space-between">
                            <Text size="sm">12-Month Forecast</Text>
                            <Text fw={600} c="red">
                              ${(parseFloat(forecast.forecasted_amount || 0) / 1000).toFixed(0)}K
                            </Text>
                          </Group>
                        ))}
                      </>
                    ) : (
                      <Text size="sm" c="dimmed">No forecast data available</Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={5} mb="md">
                    Scaling Impact Analysis
                  </Title>
                  <Stack gap="xs">
                    {totalActual > 0 ? (
                      <>
                        <Text size="sm" c="dimmed" mb="xs">Scaling estimates require historical cost data</Text>
                        <Text size="xs" c="dimmed">
                          Add real vendor costs and usage data to generate scaling projections
                        </Text>
                      </>
                    ) : (
                      <Text size="sm" c="dimmed">No cost data available for scaling analysis</Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              12-Month Cost Trend
            </Title>
            {actualCosts.length === 0 && budgets.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No cost data available. Add vendors and budgets to see trends.
              </Text>
            ) : (
              <FuturisticChart
                data={(() => {
                  // Only show real data from database - no fake generation
                  const chartData: any[] = [];
                  const now = new Date();
                  
                  // Aggregate actual costs by period
                  const actualCostsByPeriod: Record<string, number> = {};
                  actualCosts.forEach((cost: any) => {
                    if (!actualCostsByPeriod[cost.period]) {
                      actualCostsByPeriod[cost.period] = 0;
                    }
                    actualCostsByPeriod[cost.period] += parseFloat(cost.amount || 0);
                  });
                  
                  // Aggregate budgets by period
                  const budgetsByPeriod: Record<string, number> = {};
                  budgets.forEach((budget: any) => {
                    if (!budgetsByPeriod[budget.period]) {
                      budgetsByPeriod[budget.period] = 0;
                    }
                    budgetsByPeriod[budget.period] += parseFloat(budget.budgeted_amount || 0);
                  });
                  
                  // Get all periods that have data
                  const allPeriods = new Set([...Object.keys(actualCostsByPeriod), ...Object.keys(budgetsByPeriod)]);
                  
                  // Only show months that have real data - NO FAKE ZEROS
                  allPeriods.forEach(period => {
                    const [year, month] = period.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const chartEntry: any = {
                      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                    };
                    
                    // Only include Budget if we have real budget data
                    if (budgetsByPeriod[period] !== undefined) {
                      chartEntry.Budget = budgetsByPeriod[period];
                    }
                    
                    // Only include Actual if we have real actual cost data
                    if (actualCostsByPeriod[period] !== undefined) {
                      chartEntry.Actual = actualCostsByPeriod[period];
                    }
                    
                    // Only add to chart if we have at least one real value
                    if (chartEntry.Budget !== undefined || chartEntry.Actual !== undefined) {
                      chartData.push(chartEntry);
                    }
                  });
                  
                  // Sort by date
                  chartData.sort((a, b) => {
                    const dateA = new Date(a.month + ' 1');
                    const dateB = new Date(b.month + ' 1');
                    return dateA.getTime() - dateB.getTime();
                  });
                  
                  return chartData;
                })()}
                type="composed"
                title=""
                height={400}
                colors={['#3b82f6', '#10b981']}
                dataKeys={{ revenue: 'Budget', profit: 'Actual' }}
              />
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

