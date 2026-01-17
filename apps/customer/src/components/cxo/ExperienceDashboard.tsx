import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  Grid,
  Badge,
  Button,
  Select,
  Loader,
  Alert,
  Paper,
  RingProgress,
  Progress,
  Table,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Divider,
  Box,
  Tabs,
  Center,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconDownload,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconUsers,
  IconStar,
  IconMessageCircle,
  IconChartBar,
  IconCalendar,
  IconFilter,
  IconArrowRight,
  IconEye,
  IconFileExport,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ExperienceMetrics {
  nps: number;
  csat: number;
  ces: number; // Customer Effort Score
  retentionRate: number;
  churnRate: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  resolutionTime: number; // hours
  revenueImpact: number;
  customerLifetimeValue: number;
}

interface TimeSeriesData {
  date: string;
  nps: number;
  csat: number;
  orders: number;
  revenue: number;
  reviews: number;
}

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

interface JourneyStage {
  stage: string;
  customers: number;
  conversionRate: number;
  dropoffRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ExperienceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ExperienceMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData>({ positive: 0, negative: 0, neutral: 0 });
  const [journeyStages, setJourneyStages] = useState<JourneyStage[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(30, 'days').toDate(),
    dayjs().toDate(),
  ]);
  const [period, setPeriod] = useState<string>('30d');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch all experience data
  const fetchExperienceData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0] ? dayjs(dateRange[0]).startOf('day').toISOString() : dayjs().subtract(30, 'days').toISOString();
      const endDate = dateRange[1] ? dayjs(dateRange[1]).endOf('day').toISOString() : dayjs().toISOString();

      // Fetch orders for revenue and volume metrics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status, customer_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Fetch customer reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('customer_reviews')
        .select('*, order_id, rating, comment, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (reviewsError) console.warn('Reviews error:', reviewsError);

      // Fetch order feedback
      const { data: feedback, error: feedbackError } = await supabase
        .from('order_feedback')
        .select('*, restaurant_rating, driver_rating, food_quality_rating, comments, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (feedbackError) console.warn('Feedback error:', feedbackError);

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const allRatings = [
        ...(reviews?.map(r => r.rating) || []),
        ...(feedback?.map(f => f.restaurant_rating).filter(Boolean) || []),
        ...(feedback?.map(f => f.driver_rating).filter(Boolean) || []),
        ...(feedback?.map(f => f.food_quality_rating).filter(Boolean) || []),
      ];
      const averageRating = allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
        : 0;

      // Calculate NPS (Net Promoter Score)
      const promoters = allRatings.filter(r => r >= 4.5).length;
      const detractors = allRatings.filter(r => r <= 2.5).length;
      const totalRatings = allRatings.length;
      const nps = totalRatings > 0 ? ((promoters - detractors) / totalRatings) * 100 : 0;

      // Calculate CSAT (Customer Satisfaction)
      const satisfied = allRatings.filter(r => r >= 4).length;
      const csat = totalRatings > 0 ? (satisfied / totalRatings) * 100 : 0;

      // Calculate sentiment
      const positiveCount = allRatings.filter(r => r >= 4).length;
      const negativeCount = allRatings.filter(r => r <= 2).length;
      const neutralCount = totalRatings - positiveCount - negativeCount;

      // Calculate retention (simplified - customers with multiple orders)
      const customerOrderCounts = new Map<string, number>();
      orders?.forEach(order => {
        if (order.customer_id) {
          customerOrderCounts.set(order.customer_id, (customerOrderCounts.get(order.customer_id) || 0) + 1);
        }
      });
      const repeatCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;
      const retentionRate = customerOrderCounts.size > 0 ? (repeatCustomers / customerOrderCounts.size) * 100 : 0;

      // Calculate churn rate (simplified)
      const churnRate = 100 - retentionRate;

      // Build time series data
      const days = dayjs(endDate).diff(dayjs(startDate), 'day');
      const timeSeries: TimeSeriesData[] = [];
      for (let i = 0; i <= days; i++) {
        const date = dayjs(startDate).add(i, 'day');
        const dayStart = date.startOf('day').toISOString();
        const dayEnd = date.endOf('day').toISOString();
        
        const dayOrders = orders?.filter(o => 
          dayjs(o.created_at).isAfter(dayStart) && dayjs(o.created_at).isBefore(dayEnd)
        ) || [];
        const dayReviews = reviews?.filter(r => 
          dayjs(r.created_at).isAfter(dayStart) && dayjs(r.created_at).isBefore(dayEnd)
        ) || [];
        
        const dayRatings = [
          ...dayReviews.map(r => r.rating),
          ...(feedback?.filter(f => 
            dayjs(f.created_at).isAfter(dayStart) && dayjs(f.created_at).isBefore(dayEnd)
          ).map(f => f.restaurant_rating).filter(Boolean) || []),
        ];
        
        const dayNps = dayRatings.length > 0
          ? ((dayRatings.filter(r => r >= 4.5).length - dayRatings.filter(r => r <= 2.5).length) / dayRatings.length) * 100
          : 0;
        const dayCsat = dayRatings.length > 0
          ? (dayRatings.filter(r => r >= 4).length / dayRatings.length) * 100
          : 0;

        timeSeries.push({
          date: date.format('MMM D'),
          nps: dayNps,
          csat: dayCsat,
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          reviews: dayReviews.length,
        });
      }

      // Build journey stages (simplified funnel)
      const totalCustomers = customerOrderCounts.size;
      const browsingCustomers = Math.floor(totalCustomers * 1.5); // Estimate
      const cartCustomers = Math.floor(totalCustomers * 1.2);
      const checkoutCustomers = Math.floor(totalCustomers * 1.1);
      
      const stages: JourneyStage[] = [
        {
          stage: 'Awareness',
          customers: browsingCustomers,
          conversionRate: 100,
          dropoffRate: 0,
        },
        {
          stage: 'Consideration',
          customers: cartCustomers,
          conversionRate: (cartCustomers / browsingCustomers) * 100,
          dropoffRate: ((browsingCustomers - cartCustomers) / browsingCustomers) * 100,
        },
        {
          stage: 'Purchase',
          customers: checkoutCustomers,
          conversionRate: (checkoutCustomers / browsingCustomers) * 100,
          dropoffRate: ((cartCustomers - checkoutCustomers) / cartCustomers) * 100,
        },
        {
          stage: 'Completed',
          customers: totalCustomers,
          conversionRate: (totalCustomers / browsingCustomers) * 100,
          dropoffRate: ((checkoutCustomers - totalCustomers) / checkoutCustomers) * 100,
        },
      ];

      // Get recent feedback
      const recent = [
        ...(reviews?.slice(0, 10).map(r => ({
          id: r.id,
          type: 'review',
          rating: r.rating,
          comment: r.comment,
          date: r.created_at,
          source: 'Customer Review',
        })) || []),
        ...(feedback?.slice(0, 10).map(f => ({
          id: f.id,
          type: 'feedback',
          rating: f.restaurant_rating || f.driver_rating || 0,
          comment: f.comments,
          date: f.created_at,
          source: 'Order Feedback',
        })) || []),
      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()).slice(0, 10);

      // Calculate response rate from actual data
      const respondedReviews = reviews?.filter(r => r.response).length || 0;
      const responseRate = reviews?.length > 0 ? (respondedReviews / reviews.length) * 100 : 0;

      // Calculate resolution time from support tickets if available
      const { data: supportTickets } = await supabase
        .from('support_tickets')
        .select('created_at, resolved_at')
        .not('resolved_at', 'is', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .catch(() => ({ data: [] }));

      const resolutionTimes = (supportTickets || []).map(ticket => {
        if (ticket.resolved_at) {
          return dayjs(ticket.resolved_at).diff(dayjs(ticket.created_at), 'hour', true);
        }
        return 0;
      });
      const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

      // Calculate CES from feedback if available
      const cesRatings = feedback?.filter(f => f.effort_score).map(f => f.effort_score) || [];
      const ces = cesRatings.length > 0
        ? cesRatings.reduce((sum, score) => sum + score, 0) / cesRatings.length
        : 0;

      setMetrics({
        nps,
        csat,
        ces,
        retentionRate,
        churnRate,
        averageRating,
        totalReviews: reviews?.length || 0,
        responseRate,
        resolutionTime: avgResolutionTime,
        revenueImpact: totalRevenue * 0.15, // Estimate 15% impact
        customerLifetimeValue: totalRevenue / (customerOrderCounts.size || 1),
      });

      setTimeSeriesData(timeSeries);
      setSentimentData({
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      });
      setJourneyStages(stages);
      setRecentFeedback(recent);
    } catch (error: any) {
      console.error('Error fetching experience data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load experience data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperienceData();
  }, [dateRange, period]);

  const handleExport = () => {
    // Export functionality
    notifications.show({
      title: 'Export',
      message: 'Export functionality will be implemented',
      color: 'blue',
    });
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="xl" p="lg">
      {/* Header */}
      <Card p="xl" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title order={1} style={{ color: 'white', marginBottom: '8px' }}>
              Experience Dashboard
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Comprehensive customer experience analytics and insights
            </Text>
          </div>
          <Group gap="md">
            <Select
              value={period}
              onChange={(value) => {
                setPeriod(value || '30d');
                const days = value === '7d' ? 7 : value === '30d' ? 30 : value === '90d' ? 90 : 365;
                setDateRange([dayjs().subtract(days, 'days').toDate(), dayjs().toDate()]);
              }}
              data={[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
                { value: '1y', label: 'Last Year' },
              ]}
              style={{ backgroundColor: 'white' }}
            />
            <DatePickerInput
              type="range"
              value={dateRange}
              onChange={setDateRange}
              placeholder="Custom Date Range"
              leftSection={<IconCalendar size={16} />}
              style={{ backgroundColor: 'white' }}
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchExperienceData}
              variant="white"
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
              variant="white"
            >
              Export
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Key Metrics Grid */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" style={{ height: '100%' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>NPS</Text>
              <Badge color={metrics && metrics.nps >= 50 ? 'green' : metrics && metrics.nps >= 0 ? 'yellow' : 'red'}>
                {metrics ? formatPercent(metrics.nps) : '—'}
              </Badge>
            </Group>
            <Text size="2xl" fw={700} mb="xs">
              {metrics ? Math.round(metrics.nps) : '—'}
            </Text>
            <Group gap={4}>
              {metrics && metrics.nps > 0 ? (
                <IconTrendingUp size={16} color="green" />
              ) : (
                <IconTrendingDown size={16} color="red" />
              )}
              <Text size="xs" c="dimmed">Net Promoter Score</Text>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" style={{ height: '100%' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>CSAT</Text>
              <Badge color={metrics && metrics.csat >= 80 ? 'green' : metrics && metrics.csat >= 60 ? 'yellow' : 'red'}>
                {metrics ? formatPercent(metrics.csat) : '—'}
              </Badge>
            </Group>
            <Text size="2xl" fw={700} mb="xs">
              {metrics ? Math.round(metrics.csat) : '—'}%
            </Text>
            <Group gap={4}>
              <IconStar size={16} color="orange" />
              <Text size="xs" c="dimmed">Customer Satisfaction</Text>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" style={{ height: '100%' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Retention</Text>
              <Badge color={metrics && metrics.retentionRate >= 70 ? 'green' : 'yellow'}>
                {metrics ? formatPercent(metrics.retentionRate) : '—'}
              </Badge>
            </Group>
            <Text size="2xl" fw={700} mb="xs">
              {metrics ? Math.round(metrics.retentionRate) : '—'}%
            </Text>
            <Group gap={4}>
              <IconUsers size={16} color="blue" />
              <Text size="xs" c="dimmed">Customer Retention Rate</Text>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg" style={{ height: '100%' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Avg Rating</Text>
              <Badge color={metrics && metrics.averageRating >= 4 ? 'green' : 'yellow'}>
                {metrics ? metrics.averageRating.toFixed(1) : '—'}
              </Badge>
            </Group>
            <Text size="2xl" fw={700} mb="xs">
              {metrics ? metrics.averageRating.toFixed(1) : '—'}/5.0
            </Text>
            <Group gap={4}>
              <IconStar size={16} color="gold" />
              <Text size="xs" c="dimmed">Average Customer Rating</Text>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="journey" leftSection={<IconArrowRight size={16} />}>
            Customer Journey
          </Tabs.Tab>
          <Tabs.Tab value="sentiment" leftSection={<IconMessageCircle size={16} />}>
            Sentiment Analysis
          </Tabs.Tab>
          <Tabs.Tab value="feedback" leftSection={<IconMessageCircle size={16} />}>
            Recent Feedback
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          <Grid gutter="lg">
            {/* Time Series Charts */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Experience Metrics Trend</Title>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="nps" stackId="1" stroke="#8884d8" fill="#8884d8" name="NPS" />
                    <Area yAxisId="left" type="monotone" dataKey="csat" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="CSAT %" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#ffc658" name="Orders" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <Card withBorder p="lg">
                  <Title order={4} mb="md">Revenue Impact</Title>
                  <Text size="3xl" fw={700} c="green" mb="xs">
                    {metrics ? formatCurrency(metrics.revenueImpact) : '—'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Estimated revenue impact from experience improvements
                  </Text>
                </Card>

                <Card withBorder p="lg">
                  <Title order={4} mb="md">Customer Lifetime Value</Title>
                  <Text size="3xl" fw={700} c="blue" mb="xs">
                    {metrics ? formatCurrency(metrics.customerLifetimeValue) : '—'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Average CLV based on current period
                  </Text>
                </Card>

                <Card withBorder p="lg">
                  <Title order={4} mb="md">Response Rate</Title>
                  <RingProgress
                    size={120}
                    thickness={12}
                    sections={[{ value: metrics?.responseRate || 0, color: 'blue' }]}
                    label={
                      <Text size="xl" fw={700} ta="center">
                        {metrics ? Math.round(metrics.responseRate) : 0}%
                      </Text>
                    }
                  />
                </Card>
              </Stack>
            </Grid.Col>

            {/* Additional Metrics */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Orders & Reviews Trend</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                    <Bar dataKey="reviews" fill="#82ca9d" name="Reviews" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Revenue Trend</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#ff8042" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="journey" pt="lg">
          <Card withBorder p="lg">
            <Title order={4} mb="md">Customer Journey Funnel</Title>
            <Stack gap="md">
              {journeyStages.map((stage, index) => (
                <div key={index}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{stage.stage}</Text>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">{stage.customers.toLocaleString()} customers</Text>
                      <Badge color={stage.conversionRate >= 70 ? 'green' : stage.conversionRate >= 50 ? 'yellow' : 'red'}>
                        {stage.conversionRate.toFixed(1)}% conversion
                      </Badge>
                    </Group>
                  </Group>
                  <Progress value={stage.conversionRate} size="lg" color={stage.conversionRate >= 70 ? 'green' : 'yellow'} />
                  {stage.dropoffRate > 0 && (
                    <Text size="xs" c="red" mt={4}>
                      {stage.dropoffRate.toFixed(1)}% dropoff
                    </Text>
                  )}
                </div>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="sentiment" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Sentiment Distribution</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: sentimentData.positive },
                        { name: 'Negative', value: sentimentData.negative },
                        { name: 'Neutral', value: sentimentData.neutral },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[sentimentData.positive, sentimentData.negative, sentimentData.neutral].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Sentiment Breakdown</Title>
                <Stack gap="md" mt="md">
                  <Paper p="md" withBorder style={{ backgroundColor: '#ecfdf5' }}>
                    <Group justify="space-between">
                      <Group>
                        <IconCheck size={24} color="green" />
                        <Text fw={600}>Positive</Text>
                      </Group>
                      <Text size="xl" fw={700} c="green">
                        {sentimentData.positive}
                      </Text>
                    </Group>
                  </Paper>
                  <Paper p="md" withBorder style={{ backgroundColor: '#fef2f2' }}>
                    <Group justify="space-between">
                      <Group>
                        <IconX size={24} color="red" />
                        <Text fw={600}>Negative</Text>
                      </Group>
                      <Text size="xl" fw={700} c="red">
                        {sentimentData.negative}
                      </Text>
                    </Group>
                  </Paper>
                  <Paper p="md" withBorder style={{ backgroundColor: '#fefce8' }}>
                    <Group justify="space-between">
                      <Group>
                        <IconMessageCircle size={24} color="yellow" />
                        <Text fw={600}>Neutral</Text>
                      </Group>
                      <Text size="xl" fw={700} c="yellow">
                        {sentimentData.neutral}
                      </Text>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="feedback" pt="lg">
          <Card withBorder p="lg">
            <Title order={4} mb="md">Recent Customer Feedback</Title>
            <ScrollArea h={500}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Rating</Table.Th>
                    <Table.Th>Comment</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentFeedback.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{dayjs(item.date).format('MMM D, YYYY')}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{item.source}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <IconStar size={16} fill="gold" color="gold" />
                          <Text fw={600}>{item.rating.toFixed(1)}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text lineClamp={2} size="sm">
                          {item.comment || 'No comment'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="View Details">
                          <ActionIcon variant="light" color="blue">
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

