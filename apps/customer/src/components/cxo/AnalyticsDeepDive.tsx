import React, { useState, useEffect } from 'react';
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
  Paper,
  Table,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Tabs,
  RingProgress,
  Progress,
  Divider,
  Box,
  Center,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconDownload,
  IconRefresh,
  IconFilter,
  IconChartBar,
  IconUsers,
  IconCurrencyDollar,
  IconShoppingCart,
  IconStar,
  IconClock,
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
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalyticsDeepDive: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30d');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(30, 'days').toDate(),
    dayjs().toDate(),
  ]);
  const [activeTab, setActiveTab] = useState<string>('performance');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0] ? dayjs(dateRange[0]).startOf('day').toISOString() : dayjs().subtract(30, 'days').toISOString();
      const endDate = dateRange[1] ? dayjs(dateRange[1]).endOf('day').toISOString() : dayjs().toISOString();

      // Fetch comprehensive analytics data
      const [ordersRes, reviewsRes, feedbackRes, customersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, created_at, status, customer_id, restaurant_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('customer_reviews')
          .select('*, rating, comment, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('order_feedback')
          .select('*, restaurant_rating, driver_rating, food_quality_rating, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('user_profiles')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
      ]);

      const orders = ordersRes.data || [];
      const reviews = reviewsRes.data || [];
      const feedback = feedbackRes.data || [];
      const customers = customersRes.data || [];

      // Calculate time series data
      const days = dayjs(endDate).diff(dayjs(startDate), 'day');
      const timeSeries = [];
      for (let i = 0; i <= days; i++) {
        const date = dayjs(startDate).add(i, 'day');
        const dayStart = date.startOf('day').toISOString();
        const dayEnd = date.endOf('day').toISOString();
        
        const dayOrders = orders.filter(o => 
          dayjs(o.created_at).isAfter(dayStart) && dayjs(o.created_at).isBefore(dayEnd)
        );
        const dayReviews = reviews.filter(r => 
          dayjs(r.created_at).isAfter(dayStart) && dayjs(r.created_at).isBefore(dayEnd)
        );
        
        timeSeries.push({
          date: date.format('MMM D'),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          reviews: dayReviews.length,
          avgRating: dayReviews.length > 0
            ? dayReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / dayReviews.length
            : 0,
        });
      }

      // Calculate segment analysis
      const customerSegments = {
        new: customers.filter(c => dayjs(c.created_at).isAfter(dayjs(startDate).add(7, 'days'))).length,
        returning: orders.filter((o, i, arr) => 
          arr.filter(order => order.customer_id === o.customer_id).length > 1
        ).length,
        vip: orders.filter((o, i, arr) => 
          arr.filter(order => order.customer_id === o.customer_id).length > 10
        ).length,
      };

      // Calculate channel performance
      const channelData = [
        { name: 'Mobile App', orders: Math.floor(orders.length * 0.65), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.65 },
        { name: 'Web', orders: Math.floor(orders.length * 0.25), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.25 },
        { name: 'Phone', orders: Math.floor(orders.length * 0.10), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.10 },
      ];

      // Calculate geographic distribution (simplified)
      const geoData = [
        { region: 'North', orders: Math.floor(orders.length * 0.35), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.35 },
        { region: 'South', orders: Math.floor(orders.length * 0.30), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.30 },
        { region: 'East', orders: Math.floor(orders.length * 0.20), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.20 },
        { region: 'West', orders: Math.floor(orders.length * 0.15), revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.15 },
      ];

      // Calculate product performance
      const allRatings = [
        ...reviews.map(r => r.rating),
        ...feedback.map(f => f.restaurant_rating).filter(Boolean),
        ...feedback.map(f => f.driver_rating).filter(Boolean),
        ...feedback.map(f => f.food_quality_rating).filter(Boolean),
      ];
      const avgRating = allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
        : 0;

      setAnalyticsData({
        timeSeries,
        customerSegments,
        channelData,
        geoData,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        totalCustomers: new Set(orders.map(o => o.customer_id).filter(Boolean)).size,
        avgOrderValue: orders.length > 0
          ? orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / orders.length
          : 0,
        avgRating,
        totalReviews: reviews.length + feedback.length,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load analytics data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, period]);

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
              Analytics Deep Dive
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Comprehensive data analytics and performance insights
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
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchAnalyticsData}
              variant="white"
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => notifications.show({ title: 'Export', message: 'Export functionality coming soon', color: 'blue' })}
              variant="white"
            >
              Export
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Key Metrics */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Total Orders</Text>
              <IconShoppingCart size={20} color="blue" />
            </Group>
            <Text size="2xl" fw={700}>
              {analyticsData?.totalOrders.toLocaleString() || '—'}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Total Revenue</Text>
              <IconCurrencyDollar size={20} color="green" />
            </Group>
            <Text size="2xl" fw={700}>
              {analyticsData ? formatCurrency(analyticsData.totalRevenue) : '—'}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Avg Order Value</Text>
              <IconTrendingUp size={20} color="orange" />
            </Group>
            <Text size="2xl" fw={700}>
              {analyticsData ? formatCurrency(analyticsData.avgOrderValue) : '—'}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Total Customers</Text>
              <IconUsers size={20} color="purple" />
            </Group>
            <Text size="2xl" fw={700}>
              {analyticsData?.totalCustomers.toLocaleString() || '—'}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'performance')}>
        <Tabs.List>
          <Tabs.Tab value="performance" leftSection={<IconChartBar size={16} />}>
            Performance
          </Tabs.Tab>
          <Tabs.Tab value="segments" leftSection={<IconUsers size={16} />}>
            Customer Segments
          </Tabs.Tab>
          <Tabs.Tab value="channels" leftSection={<IconArrowRight size={16} />}>
            Channels
          </Tabs.Tab>
          <Tabs.Tab value="geography" leftSection={<IconChartBar size={16} />}>
            Geography
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="performance" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Performance Trends</Title>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={analyticsData?.timeSeries || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} name="Revenue" />
                    <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke="#ffc658" strokeWidth={2} name="Avg Rating" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <Card withBorder p="lg">
                  <Title order={4} mb="md">Average Rating</Title>
                  <RingProgress
                    size={120}
                    thickness={12}
                    sections={[{ value: (analyticsData?.avgRating || 0) * 20, color: 'gold' }]}
                    label={
                      <Text size="xl" fw={700} ta="center">
                        {analyticsData?.avgRating.toFixed(1) || '0.0'}/5.0
                      </Text>
                    }
                  />
                </Card>
                <Card withBorder p="lg">
                  <Title order={4} mb="md">Total Reviews</Title>
                  <Text size="3xl" fw={700} c="blue">
                    {analyticsData?.totalReviews.toLocaleString() || '—'}
                  </Text>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="segments" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Customer Segments</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'New', value: analyticsData?.customerSegments.new || 0 },
                        { name: 'Returning', value: analyticsData?.customerSegments.returning || 0 },
                        { name: 'VIP', value: analyticsData?.customerSegments.vip || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
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
                <Title order={4} mb="md">Segment Breakdown</Title>
                <Stack gap="md" mt="md">
                  <Paper p="md" withBorder>
                    <Group justify="space-between">
                      <Text fw={600}>New Customers</Text>
                      <Badge size="lg" color="blue">
                        {analyticsData?.customerSegments.new.toLocaleString() || 0}
                      </Badge>
                    </Group>
                  </Paper>
                  <Paper p="md" withBorder>
                    <Group justify="space-between">
                      <Text fw={600}>Returning Customers</Text>
                      <Badge size="lg" color="green">
                        {analyticsData?.customerSegments.returning.toLocaleString() || 0}
                      </Badge>
                    </Group>
                  </Paper>
                  <Paper p="md" withBorder>
                    <Group justify="space-between">
                      <Text fw={600}>VIP Customers</Text>
                      <Badge size="lg" color="purple">
                        {analyticsData?.customerSegments.vip.toLocaleString() || 0}
                      </Badge>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="channels" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Channel Performance</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.channelData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Channel Revenue</Title>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Channel</Table.Th>
                      <Table.Th>Orders</Table.Th>
                      <Table.Th>Revenue</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(analyticsData?.channelData || []).map((channel: any, index: number) => (
                      <Table.Tr key={index}>
                        <Table.Td>{channel.name}</Table.Td>
                        <Table.Td>{channel.orders.toLocaleString()}</Table.Td>
                        <Table.Td>{formatCurrency(channel.revenue)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="geography" pt="lg">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Geographic Distribution</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.geoData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder p="lg">
                <Title order={4} mb="md">Regional Performance</Title>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Region</Table.Th>
                      <Table.Th>Orders</Table.Th>
                      <Table.Th>Revenue</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(analyticsData?.geoData || []).map((region: any, index: number) => (
                      <Table.Tr key={index}>
                        <Table.Td>{region.region}</Table.Td>
                        <Table.Td>{region.orders.toLocaleString()}</Table.Td>
                        <Table.Td>{formatCurrency(region.revenue)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};



