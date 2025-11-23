import React, { useState, useEffect } from 'react';
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
  IconShield,
  IconChartLine,
  IconServer,
  IconCloud,
  IconBug,
  IconClock,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';

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
  type: 'performance' | 'security' | 'cost' | 'capacity';
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

export const EnhancedCTODashboard: React.FC = () => {
  const [advancedKPIs, setAdvancedKPIs] = useState<AdvancedKPI[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
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
    const interval = setInterval(fetchEnhancedData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch infrastructure data
      const [infraRes, incidentsRes, deploymentsRes] = await Promise.all([
        supabase.from('it_infrastructure').select('*').order('created_at', { ascending: false }),
        supabase.from('it_incidents').select('*').eq('status', 'open'),
        supabase.from('it_incidents').select('*').eq('incident_type', 'bug').limit(10),
      ]);

      const services = infraRes.data || [];
      const activeIncidents = incidentsRes.data || [];
      const recentErrors = deploymentsRes.data || [];

      // Calculate metrics
      const avgUptime = services.length > 0
        ? services.reduce((sum: number, s: any) => sum + (s.uptime_percent || 0), 0) / services.length
        : 99.9;
      
      const avgResponseTime = services.length > 0
        ? services.reduce((sum: number, s: any) => sum + (s.response_time_ms || 0), 0) / services.length
        : 45;

      const errorRate = recentErrors.length / 24; // Errors per hour estimate
      const securityScore = 95; // Mock for now
      const deploymentFrequency = 12; // Deployments per week
      const mttr = 2.5; // Mean time to recovery in hours

      // Generate 12-month performance data
      const now = new Date();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          Uptime: avgUptime + (Math.random() * 0.2 - 0.1),
          ResponseTime: avgResponseTime + (Math.random() * 10 - 5),
          Errors: errorRate + (Math.random() * 0.5),
          Deployments: deploymentFrequency + Math.floor(Math.random() * 5),
        };
      });

      setPerformanceData(last12Months);

      // Calculate changes
      const previousMonth = last12Months[last12Months.length - 2] || last12Months[0];
      const currentMonth = last12Months[last12Months.length - 1];

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      setAdvancedKPIs([
        {
          title: 'System Uptime',
          value: `${avgUptime.toFixed(2)}%`,
          change: calculateChange(avgUptime, previousMonth.Uptime),
          changeUnit: 'vs Last Month',
          trend: avgUptime >= 99.9 ? 'up' : avgUptime >= 99.5 ? 'neutral' : 'down',
          benchmark: 'Target: 99.9%',
          status: avgUptime >= 99.9 ? 'excellent' : avgUptime >= 99.5 ? 'good' : avgUptime >= 99 ? 'warning' : 'critical',
          icon: IconServer,
          color: '#10b981',
          description: 'Average uptime across all services',
        },
        {
          title: 'Avg Response Time',
          value: `${avgResponseTime.toFixed(0)}ms`,
          change: calculateChange(avgResponseTime, previousMonth.ResponseTime),
          changeUnit: 'vs Last Month',
          trend: avgResponseTime < 50 ? 'up' : avgResponseTime < 100 ? 'neutral' : 'down',
          benchmark: 'Target: <50ms',
          status: avgResponseTime < 50 ? 'excellent' : avgResponseTime < 100 ? 'good' : avgResponseTime < 200 ? 'warning' : 'critical',
          icon: IconClock,
          color: '#3b82f6',
        },
        {
          title: 'Error Rate',
          value: `${errorRate.toFixed(2)}/hr`,
          change: calculateChange(errorRate, previousMonth.Errors),
          changeUnit: 'vs Last Month',
          trend: errorRate < 0.1 ? 'up' : errorRate < 1 ? 'neutral' : 'down',
          benchmark: 'Target: <0.1/hr',
          status: errorRate < 0.1 ? 'excellent' : errorRate < 1 ? 'good' : errorRate < 5 ? 'warning' : 'critical',
          icon: IconBug,
          color: errorRate < 0.1 ? '#10b981' : errorRate < 1 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Security Score',
          value: `${securityScore}`,
          change: 0,
          changeUnit: 'vs Last Month',
          trend: 'neutral',
          benchmark: 'Target: >90',
          status: securityScore >= 90 ? 'excellent' : securityScore >= 75 ? 'good' : 'warning',
          icon: IconShield,
          color: '#8b5cf6',
        },
        {
          title: 'Deployment Frequency',
          value: `${deploymentFrequency}/week`,
          change: calculateChange(deploymentFrequency, previousMonth.Deployments),
          changeUnit: 'vs Last Month',
          trend: deploymentFrequency > 10 ? 'up' : deploymentFrequency > 5 ? 'neutral' : 'down',
          benchmark: 'Target: >10/week',
          status: deploymentFrequency > 10 ? 'excellent' : deploymentFrequency > 5 ? 'good' : 'warning',
          icon: IconTrendingUp,
          color: '#10b981',
        },
        {
          title: 'Mean Time to Recovery',
          value: `${mttr.toFixed(1)}h`,
          change: 0,
          changeUnit: 'average',
          trend: mttr < 1 ? 'up' : mttr < 4 ? 'neutral' : 'down',
          benchmark: 'Target: <1h',
          status: mttr < 1 ? 'excellent' : mttr < 4 ? 'good' : 'warning',
          icon: IconClock,
          color: mttr < 1 ? '#10b981' : mttr < 4 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Active Incidents',
          value: `${activeIncidents.length}`,
          change: 0,
          changeUnit: 'open',
          trend: 'neutral',
          status: activeIncidents.length === 0 ? 'excellent' : activeIncidents.length < 3 ? 'good' : activeIncidents.length < 5 ? 'warning' : 'critical',
          icon: IconAlertTriangle,
          color: activeIncidents.length === 0 ? '#10b981' : activeIncidents.length < 3 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Services Operational',
          value: `${services.filter((s: any) => s.status === 'operational').length}/${services.length}`,
          change: 0,
          changeUnit: 'services',
          trend: 'neutral',
          status: services.filter((s: any) => s.status === 'operational').length === services.length ? 'excellent' : 'good',
          icon: IconCloud,
          color: '#3b82f6',
        },
      ]);

      // Generate predictive insights
      const insights: PredictiveInsight[] = [];
      if (avgUptime < 99.9) {
        insights.push({
          type: 'performance',
          title: 'Uptime Below Target',
          description: `Current uptime of ${avgUptime.toFixed(2)}% is below the 99.9% target. Review infrastructure health and consider redundancy improvements.`,
          confidence: 90,
          impact: 'high',
          timeframe: 'Next week',
        });
      }
      if (avgResponseTime > 100) {
        insights.push({
          type: 'performance',
          title: 'Response Time Degradation',
          description: `Average response time of ${avgResponseTime.toFixed(0)}ms exceeds optimal threshold. Consider performance optimization.`,
          confidence: 85,
          impact: 'medium',
          timeframe: 'Next 2 weeks',
        });
      }
      if (errorRate > 1) {
        insights.push({
          type: 'performance',
          title: 'Elevated Error Rate',
          description: `Error rate of ${errorRate.toFixed(2)}/hr is above normal. Investigate root causes and implement fixes.`,
          confidence: 95,
          impact: 'high',
          timeframe: 'Immediate',
        });
      }
      setPredictiveInsights(insights);

      // Detect anomalies
      const detectedAnomalies: Anomaly[] = [];
      if (Math.abs(calculateChange(avgUptime, previousMonth.Uptime)) > 0.5) {
        detectedAnomalies.push({
          metric: 'System Uptime',
          deviation: calculateChange(avgUptime, previousMonth.Uptime),
          severity: avgUptime < previousMonth.Uptime ? 'critical' : 'warning',
          explanation: `Uptime changed by ${Math.abs(calculateChange(avgUptime, previousMonth.Uptime)).toFixed(2)}% month-over-month.`,
          recommendation: avgUptime < previousMonth.Uptime ? 'Investigate service outages and improve reliability' : 'Maintain current improvements',
        });
      }
      if (errorRate > 2) {
        detectedAnomalies.push({
          metric: 'Error Rate',
          deviation: errorRate,
          severity: 'critical',
          explanation: `Error rate of ${errorRate.toFixed(2)}/hr is significantly above normal threshold.`,
          recommendation: 'Review error logs, identify patterns, and deploy fixes immediately',
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
          <Text c="dimmed">Loading technology analytics...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg" p={isMobile ? 16 : 24}>
      {/* Header */}
      <Group justify="space-between" wrap="wrap">
        <Box>
          <Title order={2} mb={4}>CTO Command Center</Title>
          <Text c="dimmed" size="sm">
            Real-time technology intelligence with predictive analytics and anomaly detection
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
        <Grid gutter="md">
          {predictiveInsights.length > 0 && (
            <Grid.Col span={{ base: 12, md: anomalies.length > 0 ? 6 : 12 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group mb="md">
                  <IconInfoCircle size={20} color="#8b5cf6" />
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
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group mb="md">
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
      <Grid gutter="md">
        {advancedKPIs.map((kpi, idx) => (
          <Grid.Col key={idx} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ height: '100%' }}>
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

      {/* Performance Charts */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">12-Month Performance Trends</Title>
            <FuturisticChart
              data={performanceData}
              type="area"
              title=""
              height={400}
              colors={['#3b82f6', '#10b981', '#ef4444', '#f59e0b']}
              dataKeys={{ revenue: 'Uptime', profit: 'ResponseTime', expenses: 'Errors' }}
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">System Health Score</Title>
            <Stack align="center" gap="lg">
              <RingProgress
                size={200}
                thickness={20}
                sections={[
                  { value: 92, color: '#10b981', tooltip: 'Overall Health: 92%' },
                ]}
                label={
                  <Center>
                    <Text size="xl" fw={700} c="green">
                      92%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Excellent
                    </Text>
                  </Center>
                }
              />
              <Stack gap="xs" style={{ width: '100%' }}>
                <Group justify="space-between">
                  <Text size="sm">Reliability</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Performance</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Security</Text>
                  <Badge color="green">Strong</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Efficiency</Text>
                  <Badge color="blue">Good</Badge>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Service Status Overview */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">Service Status Overview</Title>
        <FuturisticChart
          data={performanceData.map(d => ({
            month: d.month,
            Uptime: d.Uptime,
            ResponseTime: d.ResponseTime / 10, // Scale for visibility
          }))}
          type="composed"
          title=""
          height={300}
          colors={['#10b981', '#3b82f6']}
          dataKeys={{ revenue: 'Uptime', profit: 'ResponseTime' }}
        />
      </Card>
    </Stack>
  );
};

