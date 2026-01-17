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
  Textarea,
  Modal,
  Tabs,
  Center,
  Alert,
  Divider,
  Progress,
} from '@mantine/core';
import {
  IconDownload,
  IconRefresh,
  IconMessageCircle,
  IconStar,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconEye,
  IconMessageReply,
  IconFilter,
  IconTrendingUp,
  IconTrendingDown,
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const RealTimeFeedbackManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sentimentStats, setSentimentStats] = useState<any>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('customer_reviews')
        .select('*, order_id, rating, comment, created_at, response, responded_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: orderFeedback, error: feedbackError } = await supabase
        .from('order_feedback')
        .select('*, restaurant_rating, driver_rating, food_quality_rating, comments, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (reviewsError) console.warn('Reviews error:', reviewsError);
      if (feedbackError) console.warn('Feedback error:', feedbackError);

      const allFeedback = [
        ...(reviews?.map(r => ({
          id: r.id,
          type: 'review',
          rating: r.rating,
          comment: r.comment,
          date: r.created_at,
          source: 'Customer Review',
          response: r.response,
          respondedAt: r.responded_at,
          sentiment: r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral',
        })) || []),
        ...(orderFeedback?.map(f => ({
          id: f.id,
          type: 'feedback',
          rating: f.restaurant_rating || f.driver_rating || 0,
          comment: f.comments,
          date: f.created_at,
          source: 'Order Feedback',
          response: null,
          respondedAt: null,
          sentiment: (f.restaurant_rating || 0) >= 4 ? 'positive' : (f.restaurant_rating || 0) <= 2 ? 'negative' : 'neutral',
        })) || []),
      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

      // Calculate sentiment stats
      const positive = allFeedback.filter(f => f.sentiment === 'positive').length;
      const negative = allFeedback.filter(f => f.sentiment === 'negative').length;
      const neutral = allFeedback.filter(f => f.sentiment === 'neutral').length;
      const responded = allFeedback.filter(f => f.response).length;
      const pending = allFeedback.filter(f => !f.response).length;

      setSentimentStats({ positive, negative, neutral, responded, pending, total: allFeedback.length });
      setFeedback(allFeedback);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load feedback',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    // Set up real-time subscription
    const channel = supabase
      .channel('feedback-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_reviews' }, () => {
        fetchFeedback();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customer_reviews' }, () => {
        fetchFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRespond = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    try {
      const { error } = await supabase
        .from('customer_reviews')
        .update({
          response: responseText,
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Response saved successfully',
        color: 'green',
      });

      setModalOpened(false);
      setResponseText('');
      setSelectedFeedback(null);
      fetchFeedback();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save response',
        color: 'red',
      });
    }
  };

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'positive') return f.sentiment === 'positive';
    if (filter === 'negative') return f.sentiment === 'negative';
    if (filter === 'neutral') return f.sentiment === 'neutral';
    if (filter === 'pending') return !f.response;
    if (filter === 'responded') return f.response;
    return true;
  });

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
              Real-time Feedback Management
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Monitor and respond to customer feedback in real-time
            </Text>
          </div>
          <Group gap="md">
            <Select
              value={filter}
              onChange={(value) => setFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Feedback' },
                { value: 'positive', label: 'Positive' },
                { value: 'negative', label: 'Negative' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'pending', label: 'Pending Response' },
                { value: 'responded', label: 'Responded' },
              ]}
              leftSection={<IconFilter size={16} />}
              style={{ backgroundColor: 'white' }}
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchFeedback}
              variant="white"
            >
              Refresh
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Stats */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Card withBorder p="lg">
            <Text size="sm" c="dimmed" mb="xs">Total Feedback</Text>
            <Text size="2xl" fw={700}>
              {sentimentStats?.total || 0}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Card withBorder p="lg" style={{ backgroundColor: '#ecfdf5' }}>
            <Text size="sm" c="dimmed" mb="xs">Positive</Text>
            <Text size="2xl" fw={700} c="green">
              {sentimentStats?.positive || 0}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Card withBorder p="lg" style={{ backgroundColor: '#fef2f2' }}>
            <Text size="sm" c="dimmed" mb="xs">Negative</Text>
            <Text size="2xl" fw={700} c="red">
              {sentimentStats?.negative || 0}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Card withBorder p="lg" style={{ backgroundColor: '#fffbeb' }}>
            <Text size="sm" c="dimmed" mb="xs">Pending</Text>
            <Text size="2xl" fw={700} c="orange">
              {sentimentStats?.pending || 0}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Card withBorder p="lg" style={{ backgroundColor: '#f0f9ff' }}>
            <Text size="sm" c="dimmed" mb="xs">Responded</Text>
            <Text size="2xl" fw={700} c="blue">
              {sentimentStats?.responded || 0}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Sentiment Chart */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder p="lg">
            <Title order={4} mb="md">Sentiment Distribution</Title>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Positive', value: sentimentStats?.positive || 0 },
                    { name: 'Negative', value: sentimentStats?.negative || 0 },
                    { name: 'Neutral', value: sentimentStats?.neutral || 0 },
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
            <Title order={4} mb="md">Response Rate</Title>
            <Stack gap="md" mt="md">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Response Rate</Text>
                  <Text fw={700}>
                    {sentimentStats?.total > 0
                      ? ((sentimentStats.responded / sentimentStats.total) * 100).toFixed(1)
                      : 0}%
                  </Text>
                </Group>
                <Progress
                  value={sentimentStats?.total > 0 ? (sentimentStats.responded / sentimentStats.total) * 100 : 0}
                  size="lg"
                  color="blue"
                />
              </div>
              <Alert color="blue" icon={<IconMessageCircle size={16} />}>
                {sentimentStats?.pending || 0} feedback items require attention
              </Alert>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs for Feedback Organization */}
      <Tabs value={activeTab} onChange={(value) => {
        setActiveTab(value || 'all');
        setFilter(value || 'all');
      }}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconMessageCircle size={16} />}>
            All Feedback
          </Tabs.Tab>
          <Tabs.Tab value="pending" leftSection={<IconAlertTriangle size={16} />}>
            Pending Response ({sentimentStats?.pending || 0})
          </Tabs.Tab>
          <Tabs.Tab value="positive" leftSection={<IconCheck size={16} />}>
            Positive ({sentimentStats?.positive || 0})
          </Tabs.Tab>
          <Tabs.Tab value="negative" leftSection={<IconX size={16} />}>
            Negative ({sentimentStats?.negative || 0})
          </Tabs.Tab>
          <Tabs.Tab value="responded" leftSection={<IconCheck size={16} />}>
            Responded ({sentimentStats?.responded || 0})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="lg">
          {/* Feedback Table */}
          <Card withBorder p="lg">
            <Title order={4} mb="md">
              {activeTab === 'all' ? 'All Feedback' :
               activeTab === 'pending' ? 'Pending Response' :
               activeTab === 'positive' ? 'Positive Feedback' :
               activeTab === 'negative' ? 'Negative Feedback' :
               'Responded Feedback'}
            </Title>
            <ScrollArea h={500}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Rating</Table.Th>
                <Table.Th>Sentiment</Table.Th>
                <Table.Th>Comment</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredFeedback.map((item) => (
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
                    <Badge
                      color={
                        item.sentiment === 'positive'
                          ? 'green'
                          : item.sentiment === 'negative'
                          ? 'red'
                          : 'yellow'
                      }
                    >
                      {item.sentiment}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text lineClamp={2} size="sm" style={{ maxWidth: 300 }}>
                      {item.comment || 'No comment'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {item.response ? (
                      <Badge color="green" leftSection={<IconCheck size={12} />}>
                        Responded
                      </Badge>
                    ) : (
                      <Badge color="orange" leftSection={<IconAlertTriangle size={12} />}>
                        Pending
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View Details">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => {
                            setSelectedFeedback(item);
                            setModalOpened(true);
                          }}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {!item.response && (
                        <Tooltip label="Respond">
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setResponseText('');
                              setModalOpened(true);
                            }}
                          >
                            <IconMessageReply size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Response Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedFeedback(null);
          setResponseText('');
        }}
        title="Feedback Details"
        size="lg"
      >
        {selectedFeedback && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Rating</Text>
                <Group gap={4}>
                  <IconStar size={16} fill="gold" color="gold" />
                  <Text fw={700}>{selectedFeedback.rating.toFixed(1)}</Text>
                </Group>
              </Group>
              <Divider my="sm" />
              <Text size="sm" c="dimmed" mb="xs">Comment</Text>
              <Text>{selectedFeedback.comment || 'No comment provided'}</Text>
              <Divider my="sm" />
              <Text size="sm" c="dimmed" mb="xs">Date</Text>
              <Text>{dayjs(selectedFeedback.date).format('MMMM D, YYYY [at] h:mm A')}</Text>
            </Paper>

            {selectedFeedback.response ? (
              <Paper p="md" withBorder style={{ backgroundColor: '#f0f9ff' }}>
                <Text size="sm" c="dimmed" mb="xs">Previous Response</Text>
                <Text>{selectedFeedback.response}</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  {selectedFeedback.respondedAt
                    ? `Responded on ${dayjs(selectedFeedback.respondedAt).format('MMM D, YYYY')}`
                    : ''}
                </Text>
              </Paper>
            ) : (
              <>
                <Textarea
                  label="Response"
                  placeholder="Enter your response to this feedback..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  minRows={4}
                />
                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setModalOpened(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRespond} disabled={!responseText.trim()}>
                    Send Response
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

