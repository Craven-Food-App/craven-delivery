// @ts-nocheck
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
  Progress,
  RingProgress,
  Modal,
  TextInput,
  Textarea,
  Center,
  Timeline,
  Divider,
  ActionIcon,
  Tooltip,
  Tabs,
} from '@mantine/core';
import {
  IconDownload,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconClock,
  IconTrendingUp,
  IconCalendar,
  IconUsers,
  IconTarget,
  IconFileExport,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Initiative {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  startDate: string;
  dueDate: string;
  progress: number;
  budget: number;
  spent: number;
  milestones: Milestone[];
  risks: string[];
  dependencies: string[];
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
  completedDate?: string;
}

export const StrategicInitiativesTracker: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');

  const fetchInitiatives = async () => {
    setLoading(true);
    try {
      // Fetch initiatives from Supabase if table exists
      const { data, error } = await supabase
        .from('strategic_initiatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist, which is fine
        console.warn('Error fetching initiatives:', error);
      }

      const fetchedInitiatives: Initiative[] = (data || []).map((init: any) => ({
        id: init.id,
        title: init.title,
        description: init.description || '',
        owner: init.owner,
        status: init.status || 'in-progress',
        priority: init.priority || 'medium',
        startDate: init.start_date || '',
        dueDate: init.due_date || '',
        progress: init.progress || 0,
        budget: init.budget || 0,
        spent: init.spent || 0,
        milestones: init.milestones || [],
        risks: init.risks || [],
        dependencies: init.dependencies || [],
      }));

      setInitiatives(fetchedInitiatives);
    } catch (error: any) {
      console.error('Error fetching initiatives:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load initiatives',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const filteredInitiatives = initiatives.filter(init => {
    if (filter === 'all') return true;
    if (filter === 'critical') return init.priority === 'critical';
    if (filter === 'high') return init.priority === 'high';
    if (filter === 'in-progress') return init.status === 'in-progress';
    if (filter === 'on-hold') return init.status === 'on-hold';
    if (filter === 'completed') return init.status === 'completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'on-hold': return 'yellow';
      case 'planning': return 'gray';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const totalBudget = initiatives.reduce((sum, i) => sum + i.budget, 0);
  const totalSpent = initiatives.reduce((sum, i) => sum + i.spent, 0);
  const avgProgress = initiatives.length > 0
    ? initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length
    : 0;

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
              Strategic Initiatives Tracker
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Track and manage strategic initiatives and projects
            </Text>
          </div>
          <Group gap="md">
            <Select
              value={filter}
              onChange={(value) => setFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Initiatives' },
                { value: 'critical', label: 'Critical Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'on-hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
              ]}
              style={{ backgroundColor: 'white' }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setSelectedInitiative(null);
                setModalOpened(true);
              }}
              variant="white"
            >
              New Initiative
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchInitiatives}
              variant="white"
            >
              Refresh
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Summary Metrics */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Text size="sm" c="dimmed" mb="xs">Total Initiatives</Text>
            <Text size="2xl" fw={700}>
              {initiatives.length}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Text size="sm" c="dimmed" mb="xs">Average Progress</Text>
            <Text size="2xl" fw={700} c="blue">
              {avgProgress.toFixed(0)}%
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Text size="sm" c="dimmed" mb="xs">Total Budget</Text>
            <Text size="2xl" fw={700} c="green">
              ${(totalBudget / 1000).toFixed(0)}K
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="lg">
            <Text size="sm" c="dimmed" mb="xs">Budget Spent</Text>
            <Text size="2xl" fw={700} c="orange">
              ${(totalSpent / 1000).toFixed(0)}K
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Initiatives List */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'all')}>
        <Tabs.List>
          <Tabs.Tab value="all">All Initiatives</Tabs.Tab>
          <Tabs.Tab value="in-progress">In Progress</Tabs.Tab>
          <Tabs.Tab value="on-hold">On Hold</Tabs.Tab>
          <Tabs.Tab value="completed">Completed</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="lg">
          <Stack gap="lg">
            {filteredInitiatives
              .filter(i => activeTab === 'all' || i.status === activeTab)
              .map((initiative) => (
                <Card key={initiative.id} withBorder p="lg">
                  <Group justify="space-between" mb="md" wrap="wrap">
                    <div style={{ flex: 1 }}>
                      <Group gap="md" mb="xs">
                        <Title order={4}>{initiative.title}</Title>
                        <Badge color={getStatusColor(initiative.status)}>
                          {initiative.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                        <Badge color={getPriorityColor(initiative.priority)} variant="light">
                          {initiative.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mb="xs">
                        {initiative.description}
                      </Text>
                      <Group gap="md">
                        <Text size="sm" c="dimmed">
                          Owner: <Text span fw={600}>{initiative.owner}</Text>
                        </Text>
                        <Text size="sm" c="dimmed">
                          Due: <Text span fw={600}>{dayjs(initiative.dueDate).format('MMM D, YYYY')}</Text>
                        </Text>
                        <Text size="sm" c="dimmed">
                          Budget: <Text span fw={600}>${(initiative.budget / 1000).toFixed(0)}K</Text>
                        </Text>
                      </Group>
                    </div>
                    <Group>
                      <RingProgress
                        size={80}
                        thickness={8}
                        sections={[{
                          value: initiative.progress,
                          color: initiative.progress >= 80 ? 'green' : initiative.progress >= 50 ? 'yellow' : 'red'
                        }]}
                        label={
                          <Text size="lg" fw={700} ta="center">
                            {initiative.progress}%
                          </Text>
                        }
                      />
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => {
                          setSelectedInitiative(initiative);
                          setModalOpened(true);
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Divider my="md" />

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text fw={600} size="sm" mb="md">Milestones</Text>
                      <Timeline active={initiative.milestones.filter(m => m.completed).length - 1} bulletSize={20} lineWidth={2}>
                        {initiative.milestones.map((milestone) => (
                          <Timeline.Item
                            key={milestone.id}
                            bullet={milestone.completed ? <IconCheck size={12} /> : <IconClock size={12} />}
                            title={milestone.name}
                          >
                            <Text c="dimmed" size="sm">
                              Due: {dayjs(milestone.dueDate).format('MMM D, YYYY')}
                            </Text>
                            {milestone.completed && milestone.completedDate && (
                              <Text size="xs" c="green" mt={4}>
                                Completed: {dayjs(milestone.completedDate).format('MMM D, YYYY')}
                              </Text>
                            )}
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="md">
                        <div>
                          <Text fw={600} size="sm" mb="xs">Progress</Text>
                          <Progress
                            value={initiative.progress}
                            size="lg"
                            color={initiative.progress >= 80 ? 'green' : initiative.progress >= 50 ? 'yellow' : 'red'}
                          />
                        </div>
                        {initiative.risks.length > 0 && (
                          <div>
                            <Text fw={600} size="sm" mb="xs">Risks</Text>
                            <Stack gap="xs">
                              {initiative.risks.map((risk, idx) => (
                                <Paper key={idx} p="xs" withBorder style={{ backgroundColor: '#fef2f2' }}>
                                  <Group gap="xs">
                                    <IconAlertTriangle size={16} color="red" />
                                    <Text size="sm">{risk}</Text>
                                  </Group>
                                </Paper>
                              ))}
                            </Stack>
                          </div>
                        )}
                        {initiative.dependencies.length > 0 && (
                          <div>
                            <Text fw={600} size="sm" mb="xs">Dependencies</Text>
                            <Stack gap="xs">
                              {initiative.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="light" color="blue">
                                  {dep}
                                </Badge>
                              ))}
                            </Stack>
                          </div>
                        )}
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Card>
              ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Initiative Detail Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedInitiative(null);
        }}
        title={selectedInitiative ? 'Edit Initiative' : 'New Initiative'}
        size="xl"
      >
        {selectedInitiative ? (
          <Stack gap="md">
            <TextInput label="Title" value={selectedInitiative.title} readOnly />
            <Textarea label="Description" value={selectedInitiative.description} readOnly minRows={3} />
            <Group>
              <TextInput label="Owner" value={selectedInitiative.owner} readOnly style={{ flex: 1 }} />
              <Select
                label="Status"
                value={selectedInitiative.status}
                data={[
                  { value: 'planning', label: 'Planning' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'on-hold', label: 'On Hold' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                style={{ flex: 1 }}
              />
            </Group>
            <Divider />
            <Text fw={600} size="sm" mb="md">Milestones</Text>
            <Stack gap="md">
              {selectedInitiative.milestones.map((milestone) => (
                <Paper key={milestone.id} p="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{milestone.name}</Text>
                      <Text size="sm" c="dimmed">
                        Due: {dayjs(milestone.dueDate).format('MMM D, YYYY')}
                      </Text>
                    </div>
                    <Badge color={milestone.completed ? 'green' : 'gray'}>
                      {milestone.completed ? 'Completed' : 'Pending'}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack gap="md">
            <TextInput label="Title" placeholder="Enter initiative title..." required />
            <Textarea label="Description" placeholder="Enter description..." minRows={3} required />
            <Group>
              <TextInput label="Owner" placeholder="Owner name..." style={{ flex: 1 }} required />
              <Select
                label="Priority"
                data={[
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                style={{ flex: 1 }}
              />
            </Group>
            <Group>
              <TextInput label="Start Date" type="date" style={{ flex: 1 }} />
              <TextInput label="Due Date" type="date" style={{ flex: 1 }} />
            </Group>
            <TextInput label="Budget" placeholder="Enter budget..." type="number" />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                notifications.show({ title: 'Success', message: 'Initiative created', color: 'green' });
                setModalOpened(false);
              }}>
                Create Initiative
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

