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
  IconTarget,
  IconUsers,
  IconTrendingUp,
  IconCalendar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface OKR {
  id: string;
  objective: string;
  keyResults: KeyResult[];
  owner: string;
  quarter: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'behind';
}

interface KeyResult {
  id: string;
  description: string;
  target: string;
  current: string;
  progress: number;
}

export const TeamAlignmentOKRs: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [allOkrs, setAllOkrs] = useState<OKR[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1 2025');
  const [newOKR, setNewOKR] = useState({ objective: '', owner: '', quarter: selectedQuarter });

  const fetchOKRs = async () => {
    setLoading(true);
    try {
      // Fetch OKRs from Supabase if table exists
      const { data, error } = await supabase
        .from('okrs')
        .select('*')
        .eq('quarter', selectedQuarter)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist, which is fine
        console.warn('Error fetching OKRs:', error);
      }

      const fetchedOKRs: OKR[] = (data || []).map((okr: any) => ({
        id: okr.id,
        objective: okr.objective,
        keyResults: okr.key_results || [],
        owner: okr.owner,
        quarter: okr.quarter,
        progress: okr.progress || 0,
        status: okr.status || 'on-track',
      }));

      setAllOkrs(fetchedOKRs);
      setOkrs(fetchedOKRs);
    } catch (error: any) {
      console.error('Error fetching OKRs:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load OKRs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOKRs();
  }, [selectedQuarter]);

  const handleCreateOKR = () => {
    notifications.show({
      title: 'OKR Creation',
      message: 'OKR creation functionality will be implemented',
      color: 'blue',
    });
    setModalOpened(false);
  };

  // Filter OKRs based on active tab
  const filteredOkrs = React.useMemo(() => {
    if (activeTab === 'all') return allOkrs;
    if (activeTab === 'on-track') return allOkrs.filter(okr => okr.status === 'on-track');
    if (activeTab === 'at-risk') return allOkrs.filter(okr => okr.status === 'at-risk');
    if (activeTab === 'behind') return allOkrs.filter(okr => okr.status === 'behind');
    return allOkrs;
  }, [activeTab, allOkrs]);

  const overallProgress = filteredOkrs.length > 0
    ? filteredOkrs.reduce((sum, okr) => sum + okr.progress, 0) / filteredOkrs.length
    : 0;

  const onTrackCount = allOkrs.filter(okr => okr.status === 'on-track').length;
  const atRiskCount = allOkrs.filter(okr => okr.status === 'at-risk').length;
  const behindCount = allOkrs.filter(okr => okr.status === 'behind').length;

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
              Team Alignment & OKRs
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Track objectives, key results, and team alignment
            </Text>
          </div>
          <Group gap="md">
            <Select
              value={selectedQuarter}
              onChange={(value) => setSelectedQuarter(value || 'Q1 2025')}
              data={[
                { value: 'Q1 2025', label: 'Q1 2025' },
                { value: 'Q2 2025', label: 'Q2 2025' },
                { value: 'Q3 2025', label: 'Q3 2025' },
                { value: 'Q4 2025', label: 'Q4 2025' },
              ]}
              style={{ backgroundColor: 'white' }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setModalOpened(true)}
              variant="white"
            >
              New OKR
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchOKRs}
              variant="white"
            >
              Refresh
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Overall Progress */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="lg">
            <Title order={4} mb="md">Overall Progress</Title>
            <RingProgress
              size={200}
              thickness={20}
              sections={[{ value: overallProgress, color: overallProgress >= 80 ? 'green' : overallProgress >= 60 ? 'yellow' : 'red' }]}
              label={
                <Text size="3xl" fw={700} ta="center">
                  {overallProgress.toFixed(0)}%
                </Text>
              }
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder p="lg">
            <Title order={4} mb="md">Status Overview</Title>
            <Grid gutter="md" mt="md">
              <Grid.Col span={4}>
                <Paper p="md" withBorder style={{ backgroundColor: '#ecfdf5' }}>
                  <Group>
                    <IconCheck size={32} color="green" />
                    <div>
                      <Text size="sm" c="dimmed">On Track</Text>
                      <Text size="2xl" fw={700} c="green">
                        {onTrackCount}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </Grid.Col>
              <Grid.Col span={4}>
                <Paper p="md" withBorder style={{ backgroundColor: '#fffbeb' }}>
                  <Group>
                    <IconTarget size={32} color="orange" />
                    <div>
                      <Text size="sm" c="dimmed">At Risk</Text>
                      <Text size="2xl" fw={700} c="orange">
                        {atRiskCount}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </Grid.Col>
              <Grid.Col span={4}>
                <Paper p="md" withBorder style={{ backgroundColor: '#fef2f2' }}>
                  <Group>
                    <IconX size={32} color="red" />
                    <div>
                      <Text size="sm" c="dimmed">Behind</Text>
                      <Text size="2xl" fw={700} c="red">
                        {behindCount}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs for OKR Filtering */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'all')}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconTarget size={16} />}>
            All OKRs ({allOkrs.length})
          </Tabs.Tab>
          <Tabs.Tab value="on-track" leftSection={<IconCheck size={16} />}>
            On Track ({onTrackCount})
          </Tabs.Tab>
          <Tabs.Tab value="at-risk" leftSection={<IconTarget size={16} />}>
            At Risk ({atRiskCount})
          </Tabs.Tab>
          <Tabs.Tab value="behind" leftSection={<IconX size={16} />}>
            Behind ({behindCount})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="lg">
          {/* OKRs List */}
          <Stack gap="lg">
            {filteredOkrs.length === 0 ? (
              <Card withBorder p="xl">
                <Center>
                  <Text c="dimmed" size="lg">No OKRs found for this filter</Text>
                </Center>
              </Card>
            ) : (
              filteredOkrs.map((okr) => (
          <Card key={okr.id} withBorder p="lg">
            <Group justify="space-between" mb="md">
              <div style={{ flex: 1 }}>
                <Group gap="md" mb="xs">
                  <Title order={4}>{okr.objective}</Title>
                  <Badge
                    color={
                      okr.status === 'on-track'
                        ? 'green'
                        : okr.status === 'at-risk'
                        ? 'yellow'
                        : 'red'
                    }
                  >
                    {okr.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </Group>
                <Group gap="md">
                  <Text size="sm" c="dimmed">
                    Owner: <Text span fw={600}>{okr.owner}</Text>
                  </Text>
                  <Text size="sm" c="dimmed">
                    Quarter: <Text span fw={600}>{okr.quarter}</Text>
                  </Text>
                </Group>
              </div>
              <RingProgress
                size={80}
                thickness={8}
                sections={[{ value: okr.progress, color: okr.progress >= 80 ? 'green' : okr.progress >= 60 ? 'yellow' : 'red' }]}
                label={
                  <Text size="lg" fw={700} ta="center">
                    {okr.progress}%
                  </Text>
                }
              />
            </Group>

            <Divider my="md" />

            <Stack gap="md">
              <Text fw={600} size="sm">Key Results:</Text>
              {okr.keyResults.map((kr) => (
                <Paper key={kr.id} p="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{kr.description}</Text>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">
                        {kr.current} / {kr.target}
                      </Text>
                      <Badge color={kr.progress >= 80 ? 'green' : kr.progress >= 60 ? 'yellow' : 'red'}>
                        {kr.progress}%
                      </Badge>
                    </Group>
                  </Group>
                  <Progress
                    value={kr.progress}
                    size="sm"
                    color={kr.progress >= 80 ? 'green' : kr.progress >= 60 ? 'yellow' : 'red'}
                  />
                </Paper>
              ))}
            </Stack>
          </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Create OKR Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setNewOKR({ objective: '', owner: '', quarter: selectedQuarter });
        }}
        title="Create New OKR"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Objective"
            placeholder="Enter the objective..."
            value={newOKR.objective}
            onChange={(e) => setNewOKR({ ...newOKR, objective: e.target.value })}
            required
          />
          <TextInput
            label="Owner"
            placeholder="Team or individual name..."
            value={newOKR.owner}
            onChange={(e) => setNewOKR({ ...newOKR, owner: e.target.value })}
            required
          />
          <Select
            label="Quarter"
            value={newOKR.quarter}
            onChange={(value) => setNewOKR({ ...newOKR, quarter: value || selectedQuarter })}
            data={[
              { value: 'Q1 2025', label: 'Q1 2025' },
              { value: 'Q2 2025', label: 'Q2 2025' },
              { value: 'Q3 2025', label: 'Q3 2025' },
              { value: 'Q4 2025', label: 'Q4 2025' },
            ]}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOKR} disabled={!newOKR.objective || !newOKR.owner}>
              Create OKR
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

