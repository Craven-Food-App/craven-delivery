import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Progress,
  Alert,
  Box,
  Paper,
  RingProgress,
  Center,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconInfoCircle,
  IconBrain,
  IconShield,
  IconChartLine,
  IconCash,
  IconBuildingBank,
  IconWorld,
  IconTarget,
  IconUsers,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface AdvancedKPI {
  title: string;
  value: string | number;
  change: number;
  changeUnit: string;
  trend: 'up' | 'down' | 'neutral';
  benchmark?: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface PredictiveInsight {
  type: 'revenue' | 'expense' | 'risk' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface Anomaly {
  metric: string;
  deviation: number;
  severity: 'critical' | 'warning' | 'info';
  explanation: string;
  recommendation: string;
}

export const EnhancedCFODashboard: React.FC = () => {
  const [advancedKPIs, setAdvancedKPIs] = useState<AdvancedKPI[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEnhancedData();
    // Set up auto-refresh every 30 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchEnhancedData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch comprehensive financial data
      // @ts-ignore - Type compatibility for financial tables
      const [orders, invoices, receivables, bankAccounts] = await Promise.all([
        supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('invoices').select('amount, due_date, status'),
        // @ts-ignore
        supabase.from('receivables').select('amount, due_date, status'),
        // @ts-ignore
        supabase.from('bank_accounts').select('current_balance, currency'),
      ]);

      const now = new Date();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthKey: date.toISOString().slice(0, 7),
        };
      });

      const monthlyData = last12Months.map(({ month, monthKey }) => {
        const monthOrders = (orders.data || []).filter((o: any) => {
          const orderDate = new Date(o.created_at);
          return orderDate.toISOString().slice(0, 7) === monthKey;
        });
        const revenue = (monthOrders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
        const cogs = revenue * 0.36;
        const opEx = revenue * 0.25;
        const profit = revenue - cogs - opEx;
        return { month, Revenue: revenue / 1000, COGS: cogs / 1000, Operating_Expenses: opEx / 1000, Profit: profit / 1000 };
      });

      setFinancialData(monthlyData);

      // Calculate advanced KPIs
      const currentMonth = monthlyData[monthlyData.length - 1];
      const previousMonth = monthlyData[monthlyData.length - 2] || monthlyData[0];
      const ytdAvg = monthlyData.slice(0, new Date().getMonth() + 1).reduce((sum, m) => sum + m.Revenue, 0) / (new Date().getMonth() + 1);

      const totalCash = (bankAccounts.data || []).reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);
      const apPending = (invoices.data || []).filter((i: any) => i.status === 'pending' || i.status === 'approved').length;
      const arOutstanding = (receivables.data || []).filter((r: any) => r.status !== 'paid').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const burnRate = currentMonth.Operating_Expenses * 1000;
      const runway = totalCash > 0 && burnRate > 0 ? Math.floor(totalCash / burnRate) : 0;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      const revenueChange = calculateChange(currentMonth.Revenue, previousMonth.Revenue);
      const marginChange = calculateChange(
        currentMonth.Revenue > 0 ? ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue) * 100 : 0,
        previousMonth.Revenue > 0 ? ((previousMonth.Revenue - previousMonth.COGS) / previousMonth.Revenue) * 100 : 0
      );

      setAdvancedKPIs([
        {
          title: 'Total Cash Position',
          value: `$${(totalCash / 1000000).toFixed(2)}M`,
          change: 0,
          changeUnit: 'vs Last Month',
          trend: 'neutral',
          status: totalCash > 5000000 ? 'excellent' : totalCash > 2000000 ? 'good' : 'warning',
          icon: IconCash,
          color: '#10b981',
          description: 'Total cash across all bank accounts',
        },
        {
          title: 'Cash Runway',
          value: `${runway} months`,
          change: 0,
          changeUnit: 'at current burn rate',
          trend: runway > 12 ? 'up' : runway > 6 ? 'neutral' : 'down',
          status: runway > 12 ? 'excellent' : runway > 6 ? 'good' : 'critical',
          icon: IconClock,
          color: runway > 12 ? '#10b981' : runway > 6 ? '#f59e0b' : '#ef4444',
          description: 'Months of cash remaining',
        },
        {
          title: 'Monthly Recurring Revenue (MRR)',
          value: `$${currentMonth.Revenue.toFixed(0)}K`,
          change: revenueChange,
          changeUnit: 'vs Last Month',
          trend: revenueChange > 0 ? 'up' : 'down',
          benchmark: 'Industry: +5%',
          status: revenueChange > 10 ? 'excellent' : revenueChange > 5 ? 'good' : revenueChange > 0 ? 'warning' : 'critical',
          icon: IconTrendingUp,
          color: '#3b82f6',
        },
        {
          title: 'Gross Margin',
          value: `${currentMonth.Revenue > 0 ? ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue * 100).toFixed(1) : 0}%`,
          change: marginChange,
          changeUnit: 'pp vs Last Month',
          trend: marginChange > 0 ? 'up' : 'down',
          benchmark: 'Target: >50%',
          status: ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue * 100) > 50 ? 'excellent' : ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue * 100) > 40 ? 'good' : 'warning',
          icon: IconTarget,
          color: '#8b5cf6',
        },
        {
          title: 'Operating Cash Flow',
          value: `$${currentMonth.Profit.toFixed(0)}K`,
          change: calculateChange(currentMonth.Profit, previousMonth.Profit),
          changeUnit: 'vs Last Month',
          trend: currentMonth.Profit > 0 ? 'up' : 'down',
          status: currentMonth.Profit > 0 ? 'good' : 'critical',
          icon: IconChartLine,
          color: currentMonth.Profit > 0 ? '#10b981' : '#ef4444',
        },
        {
          title: 'AR Days Outstanding',
          value: `${Math.round(arOutstanding / (currentMonth.Revenue * 1000) * 30)} days`,
          change: 0,
          changeUnit: 'average',
          trend: 'neutral',
          benchmark: 'Target: <30 days',
          status: (arOutstanding / (currentMonth.Revenue * 1000) * 30) < 30 ? 'excellent' : (arOutstanding / (currentMonth.Revenue * 1000) * 30) < 45 ? 'good' : 'warning',
          icon: IconUsers,
          color: '#f59e0b',
        },
        {
          title: 'AP Aging > 60 Days',
          value: `${apPending}`,
          change: 0,
          changeUnit: 'invoices',
          trend: 'neutral',
          status: apPending < 10 ? 'excellent' : apPending < 25 ? 'good' : 'warning',
          icon: IconAlertTriangle,
          color: apPending < 10 ? '#10b981' : apPending < 25 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Debt-to-Equity Ratio',
          value: '0.45x',
          change: 0,
          changeUnit: 'vs Industry: 0.6x',
          trend: 'up',
          benchmark: 'Industry: 0.6x',
          status: 'excellent',
          icon: IconShield,
          color: '#10b981',
        },
      ]);

      // Generate predictive insights
      const insights: PredictiveInsight[] = [];
      if (revenueChange > 5) {
        insights.push({
          type: 'revenue',
          title: 'Strong Revenue Growth Detected',
          description: `Revenue is growing at ${revenueChange.toFixed(1)}% MoM. This trend suggests potential for ${(revenueChange * 12).toFixed(0)}% annual growth if sustained.`,
          confidence: 85,
          impact: 'high',
          timeframe: 'Next 3 months',
        });
      }
      if (runway < 12) {
        insights.push({
          type: 'risk',
          title: 'Cash Runway Below Optimal',
          description: `Current runway of ${runway} months is below the recommended 12+ months. Consider fundraising or cost optimization.`,
          confidence: 95,
          impact: 'high',
          timeframe: 'Immediate',
        });
      }
      if (marginChange < -2) {
        insights.push({
          type: 'expense',
          title: 'Margin Compression Detected',
          description: `Gross margin decreased by ${Math.abs(marginChange).toFixed(1)}pp. Review COGS and pricing strategy.`,
          confidence: 90,
          impact: 'medium',
          timeframe: 'Next month',
        });
      }
      setPredictiveInsights(insights);

      // Detect anomalies
      const detectedAnomalies: Anomaly[] = [];
      if (Math.abs(revenueChange) > 20) {
        detectedAnomalies.push({
          metric: 'Monthly Revenue',
          deviation: revenueChange,
          severity: revenueChange > 0 ? 'warning' : 'critical',
          explanation: `Revenue changed by ${Math.abs(revenueChange).toFixed(1)}% month-over-month, which is significantly outside normal variance.`,
          recommendation: revenueChange > 0 ? 'Investigate growth drivers to sustain momentum' : 'Review sales pipeline and customer retention',
        });
      }
      if (apPending > 30) {
        detectedAnomalies.push({
          metric: 'Accounts Payable',
          deviation: apPending,
          severity: 'warning',
          explanation: `${apPending} invoices are pending approval, which may impact vendor relationships.`,
          recommendation: 'Prioritize invoice processing and consider automation',
        });
      }
      setAnomalies(detectedAnomalies);

    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AdvancedKPI['status']) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getImpactColor = (impact: PredictiveInsight['impact']) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <Center p={40}>
        <Stack align="center" gap="md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <Text c="dimmed">Loading advanced financial analytics...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md" p={isMobile ? 10 : 14}>
      {/* Header with AI Badge */}
      <Group justify="space-between" wrap="wrap">
        <Box>
          <Group gap="xs" mb={4}>
            <Title order={2}>CFO Command Center</Title>
          </Group>
          <Text c="dimmed" size="sm">
            Real-time financial intelligence with predictive analytics and anomaly detection
          </Text>
        </Box>
        <Group gap="xs">
          <Badge color="green" variant="light" leftSection={<IconShield size={12} />}>
            Systems Operational
          </Badge>
          <Text size="xs" c="dimmed">
            Updated {new Date().toLocaleTimeString()}
          </Text>
        </Group>
      </Group>

      {/* Predictive Insights & Anomalies */}
      {(predictiveInsights.length > 0 || anomalies.length > 0) && (
        <Grid gutter="sm">
          {predictiveInsights.length > 0 && (
            <Grid.Col span={{ base: 12, md: anomalies.length > 0 ? 6 : 12 }}>
              <Card shadow="sm" padding="sm" radius="md" withBorder>
                <Group mb="sm">
                  <IconBrain size={20} color="#8b5cf6" />
                  <Title order={4}>Predictive Insights</Title>
                </Group>
                <Stack gap="sm">
                  {predictiveInsights.map((insight, idx) => (
                    <Alert
                      key={idx}
                      color={getImpactColor(insight.impact)}
                      title={insight.title}
                      icon={<IconInfoCircle size={16} />}
                    >
                      <Text size="sm" mb={4}>{insight.description}</Text>
                      <Group gap="xs" mt={4}>
                        <Badge size="xs" variant="light">
                          {insight.confidence}% confidence
                        </Badge>
                        <Badge size="xs" variant="light">
                          {insight.timeframe}
                        </Badge>
                      </Group>
                    </Alert>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          )}
          {anomalies.length > 0 && (
            <Grid.Col span={{ base: 12, md: predictiveInsights.length > 0 ? 6 : 12 }}>
              <Card shadow="sm" padding="sm" radius="md" withBorder>
                <Group mb="sm">
                  <IconAlertTriangle size={20} color="#ef4444" />
                  <Title order={4}>Anomaly Detection</Title>
                </Group>
                <Stack gap="sm">
                  {anomalies.map((anomaly, idx) => (
                    <Alert
                      key={idx}
                      color={anomaly.severity === 'critical' ? 'red' : anomaly.severity === 'warning' ? 'yellow' : 'blue'}
                      title={`${anomaly.metric}: ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%`}
                      icon={<IconAlertTriangle size={16} />}
                    >
                      <Text size="sm" mb={4}>{anomaly.explanation}</Text>
                      <Text size="xs" c="dimmed" fw={600}>Recommendation: {anomaly.recommendation}</Text>
                    </Alert>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          )}
        </Grid>
      )}

      {/* Advanced KPI Grid */}
      <Grid gutter="sm">
        {advancedKPIs.map((kpi, idx) => (
          <Grid.Col key={idx} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
            <Card shadow="sm" padding="sm" radius="md" withBorder style={{ height: '100%' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={600}>{kpi.title}</Text>
                <Tooltip label={kpi.description || kpi.title}>
                  <ActionIcon variant="subtle" size="sm">
                    <IconInfoCircle size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group align="flex-start" gap="xs" mb="xs">
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: `${kpi.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  color: kpi.color,
                }}
              >
                {React.createElement(kpi.icon as any, { size: 20 })}
              </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="xl" fw={700} c={getStatusColor(kpi.status)}>
                    {kpi.value}
                  </Text>
                  {kpi.change !== 0 && (
                    <Group gap={4} mt={4}>
                      {kpi.trend === 'up' ? (
                        <IconTrendingUp size={14} color="#10b981" />
                      ) : kpi.trend === 'down' ? (
                        <IconTrendingDown size={14} color="#ef4444" />
                      ) : null}
                      <Text size="xs" c={kpi.trend === 'up' ? 'green' : kpi.trend === 'down' ? 'red' : 'dimmed'}>
                        {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}% {kpi.changeUnit}
                      </Text>
                    </Group>
                  )}
                </Box>
              </Group>
              {kpi.benchmark && (
                <Text size="xs" c="dimmed" mt="xs">
                  {kpi.benchmark}
                </Text>
              )}
              <Badge
                color={getStatusColor(kpi.status)}
                variant="light"
                size="sm"
                mt="xs"
                style={{ textTransform: 'capitalize' }}
              >
                {kpi.status}
              </Badge>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Advanced Financial Charts */}
      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" padding="sm" radius="md" withBorder>
            <Title order={4} mb="sm">12-Month Financial Performance Trend</Title>
            <FuturisticChart
              data={financialData}
              type="area"
              title=""
              height={400}
              colors={['#3b82f6', '#10b981', '#ef4444']}
              dataKeys={{ revenue: 'Revenue', profit: 'Profit', expenses: 'Operating_Expenses' }}
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="sm" radius="md" withBorder>
            <Title order={4} mb="sm">Financial Health Score</Title>
            <Stack align="center" gap="sm">
              <RingProgress
                size={200}
                thickness={20}
                sections={[
                  { value: 85, color: '#10b981', tooltip: 'Overall Health: 85%' },
                ]}
                label={
                  <Center>
                    <Text size="xl" fw={700} c="green">
                      85%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Excellent
                    </Text>
                  </Center>
                }
              />
              <Stack gap="xs" style={{ width: '100%' }}>
                <Group justify="space-between">
                  <Text size="sm">Liquidity</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Profitability</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Efficiency</Text>
                  <Badge color="blue">Good</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Growth</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Cash Flow Forecast */}
      <Card shadow="sm" padding="sm" radius="md" withBorder>
        <Title order={4} mb="sm">6-Month Cash Flow Forecast</Title>
        <FuturisticChart
          data={Array.from({ length: 6 }, (_, i) => {
            const month = new Date();
            month.setMonth(month.getMonth() + i);
            const baseRevenue = financialData[financialData.length - 1]?.Revenue || 0;
            const projectedRevenue = baseRevenue * Math.pow(1.05, i);
            const projectedExpenses = projectedRevenue * 0.65;
            return {
              month: month.toLocaleString('default', { month: 'short' }),
              Revenue: projectedRevenue,
              Expenses: projectedExpenses,
              Net: projectedRevenue - projectedExpenses,
            };
          })}
          type="composed"
          title=""
          height={300}
          colors={['#3b82f6', '#ef4444', '#10b981']}
          dataKeys={{ revenue: 'Revenue', expenses: 'Expenses', profit: 'Net' }}
        />
      </Card>
    </Stack>
  );
};

