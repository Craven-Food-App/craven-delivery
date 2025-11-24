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
  Timeline,
  Box,
  Paper,
  Progress,
  Alert,
  Loader,
  Tabs,
  Table,
  Tooltip,
  ActionIcon,
  Center,
  Modal,
  TextInput,
  Textarea,
  Select,
} from '@mantine/core';
import {
  IconRocket,
  IconCode,
  IconServer,
  IconShield,
  IconPlus,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
  IconGitBranch,
  IconLink,
  IconBan,
  IconCircleCheck,
  IconX,
  IconChartBar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface Initiative {
  id: string;
  title: string;
  description: string;
  quarter: string;
  year: number;
  start_date: string;
  target_end_date: string;
  actual_end_date?: string;
  status: string;
  health_score: string;
  priority: string;
  progress_percentage: number;
  github_milestone_id?: number;
  github_milestone_url?: string;
  github_issues_count: number;
  github_prs_count: number;
  days_behind_schedule: number;
  escalation_sent: boolean;
  last_github_sync_at?: string;
  dependencies?: Dependency[];
  blocked_by?: string[];
}

interface Dependency {
  id: string;
  depends_on_initiative_id: string;
  depends_on_title: string;
  required_milestone?: string;
  is_blocking: boolean;
}

interface SlipAlert {
  id: string;
  initiative_id: string;
  initiative_title: string;
  days_behind: number;
  severity: string;
  alert_message: string;
  acknowledged: boolean;
}

export const TechnologyRoadmap: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [alerts, setAlerts] = useState<SlipAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('roadmap');
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quarter: 'Q1',
    year: new Date().getFullYear(),
    start_date: '',
    target_end_date: '',
    priority: 'medium',
    status: 'planned',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load initiatives
      const { data: initData, error: initError } = await supabase
        .from('cto_roadmap_initiatives')
        .select('*')
        .order('year', { ascending: true })
        .order('quarter', { ascending: true });

      if (initError) throw initError;

      // Load dependencies for each initiative
      const initiativesWithDeps = await Promise.all(
        (initData || []).map(async (init: any) => {
          const { data: deps } = await supabase
            .from('cto_roadmap_dependencies')
            .select(`
              *,
              depends_on:cto_roadmap_initiatives!depends_on_initiative_id(title)
            `)
            .eq('dependent_initiative_id', init.id)
            .eq('is_blocking', true);

          const dependencies = (deps || []).map((dep: any) => ({
            id: dep.id,
            depends_on_initiative_id: dep.depends_on_initiative_id,
            depends_on_title: Array.isArray(dep.depends_on) ? dep.depends_on[0]?.title : dep.depends_on?.title,
            required_milestone: dep.required_milestone,
            is_blocking: dep.is_blocking,
          }));

          return { ...init, dependencies };
        })
      );

      setInitiatives(initiativesWithDeps as Initiative[]);

      // Load slip alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('cto_roadmap_slip_alerts')
        .select(`
          *,
          initiative:cto_roadmap_initiatives!initiative_id(title)
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      const slipAlerts = (alertsData || []).map((alert: any) => ({
        id: alert.id,
        initiative_id: alert.initiative_id,
        initiative_title: Array.isArray(alert.initiative) ? alert.initiative[0]?.title : alert.initiative?.title,
        days_behind: alert.days_behind,
        severity: alert.severity,
        alert_message: alert.alert_message,
        acknowledged: alert.acknowledged,
      }));

      setAlerts(slipAlerts as SlipAlert[]);
    } catch (error: any) {
      console.error('Error loading roadmap data:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load roadmap data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncGitHub = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-sync-github-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          github_owner: 'cravenusa',
          github_repo: 'craven-delivery',
        }),
      });

      const result = await response.json();
      if (result.success) {
        notifications.show({
          title: 'Success',
          message: `Synced ${result.synced} initiatives from GitHub`,
          color: 'green',
        });
        loadData();
      } else {
        throw new Error(result.error || 'Failed to sync');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to sync GitHub',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  const detectSlips = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-detect-roadmap-slips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        notifications.show({
          title: 'Analysis Complete',
          message: `Detected ${result.alerts_created} slip alerts`,
          color: result.alerts_created > 0 ? 'orange' : 'green',
        });
        loadData();
      } else {
        throw new Error(result.error || 'Failed to detect slips');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to detect slips',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  const checkDependencies = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-check-dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        notifications.show({
          title: 'Dependencies Checked',
          message: `${result.blocked} blocked, ${result.unblocked} unblocked`,
          color: 'blue',
        });
        loadData();
      } else {
        throw new Error(result.error || 'Failed to check dependencies');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to check dependencies',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateInitiative = async () => {
    if (!formData.title || !formData.target_end_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Title and target end date are required',
        color: 'red',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('cto_roadmap_initiatives')
        .insert({
          title: formData.title,
          description: formData.description || null,
          quarter: formData.quarter,
          year: formData.year,
          start_date: formData.start_date || null,
          target_end_date: formData.target_end_date,
          priority: formData.priority,
          status: formData.status,
          owner_id: user?.id || null,
        });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Initiative created successfully',
        color: 'green',
      });

      setCreateModalOpened(false);
      setFormData({
        title: '',
        description: '',
        quarter: 'Q1',
        year: new Date().getFullYear(),
        start_date: '',
        target_end_date: '',
        priority: 'medium',
        status: 'planned',
      });
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create initiative',
        color: 'red',
      });
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'on_track': return 'green';
      case 'at_risk': return 'yellow';
      case 'off_track': return 'orange';
      case 'blocked': return 'red';
      default: return 'gray';
    }
  };

  const getHealthLabel = (health: string) => {
    return health.replace('_', ' ').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'blocked': return 'red';
      case 'planned': return 'gray';
      default: return 'gray';
    }
  };

  // Group initiatives by quarter
  const groupedInitiatives = initiatives.reduce((acc, init) => {
    const key = `${init.quarter}-${init.year}`;
    if (!acc[key]) {
      acc[key] = { quarter: init.quarter, year: init.year, initiatives: [] };
    }
    acc[key].initiatives.push(init);
    return acc;
  }, {} as Record<string, { quarter: string; year: number; initiatives: Initiative[] }>);

  const roadmapQuarters = Object.values(groupedInitiatives).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    return (qOrder[a.quarter as keyof typeof qOrder] || 0) - (qOrder[b.quarter as keyof typeof qOrder] || 0);
  });

  const totalInitiatives = initiatives.length;
  const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
  const inProgressInitiatives = initiatives.filter(i => i.status === 'in-progress').length;
  const blockedInitiatives = initiatives.filter(i => i.status === 'blocked').length;
  const atRiskInitiatives = initiatives.filter(i => i.health_score === 'at_risk' || i.health_score === 'off_track').length;

  if (loading) {
    return (
      <Stack gap="lg" p="md">
        <Center>
          <Loader size="lg" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Technology Roadmap</Title>
          <Text c="dimmed" size="sm">
            Real-time execution engine: Auto-track progress, detect slips, manage dependencies
          </Text>
        </Box>
        <Badge size="lg" color="violet" variant="light" leftSection={<IconRocket size={16} />}>
          Execution Engine
        </Badge>
      </Group>

      {/* Action Buttons */}
      <Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpened(true)}
          color="green"
        >
          Create Initiative
        </Button>
        <Button
          leftSection={<IconGitBranch size={16} />}
          onClick={syncGitHub}
          loading={syncing}
          color="blue"
        >
          Sync GitHub
        </Button>
        <Button
          leftSection={<IconAlertTriangle size={16} />}
          onClick={detectSlips}
          loading={syncing}
          color="orange"
        >
          Detect Slips
        </Button>
        <Button
          leftSection={<IconLink size={16} />}
          onClick={checkDependencies}
          loading={syncing}
          color="violet"
        >
          Check Dependencies
        </Button>
      </Group>

      {/* Slip Alerts */}
      {alerts.length > 0 && (
        <Alert icon={<IconAlertTriangle size={16} />} title={`${alerts.length} Slip Alert(s)`} color="orange">
          <Stack gap="xs">
            {alerts.map((alert) => (
              <Group key={alert.id} justify="space-between">
                <Box>
                  <Text fw={600}>{alert.initiative_title}</Text>
                  <Text size="sm" c="dimmed">{alert.alert_message}</Text>
                </Box>
                <Badge color={alert.severity === 'critical' ? 'red' : 'orange'} variant="light">
                  {alert.severity} • {alert.days_behind} days behind
                </Badge>
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Roadmap Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Initiatives</Text>
              <IconRocket size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              {totalInitiatives}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Completed</Text>
              <IconCheck size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              {completedInitiatives}
            </Text>
            <Progress
              value={totalInitiatives > 0 ? (completedInitiatives / totalInitiatives) * 100 : 0}
              color="green"
              size="sm"
              mt="xs"
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">At Risk / Off Track</Text>
              <IconAlertTriangle size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="orange">
              {atRiskInitiatives}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Blocked</Text>
              <IconBan size={20} color="#ef4444" />
            </Group>
            <Text size="xl" fw={700} c="red">
              {blockedInitiatives}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'roadmap')}>
        <Tabs.List>
          <Tabs.Tab value="roadmap" leftSection={<IconRocket size={16} />}>
            Roadmap
          </Tabs.Tab>
          <Tabs.Tab value="alerts" leftSection={<IconAlertTriangle size={16} />}>
            Slip Alerts ({alerts.length})
          </Tabs.Tab>
          <Tabs.Tab value="dependencies" leftSection={<IconLink size={16} />}>
            Dependencies
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="roadmap" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Technology Roadmap
            </Title>
            <Timeline active={-1} bulletSize={24} lineWidth={2}>
              {roadmapQuarters.map((quarter) => (
                <Timeline.Item
                  key={`${quarter.quarter}-${quarter.year}`}
                  bullet={<IconRocket size={12} />}
                  title={`${quarter.quarter} ${quarter.year}`}
                >
                  <Stack gap="md" mt="xs">
                    {quarter.initiatives.map((initiative) => (
                      <Paper key={initiative.id} p="md" withBorder>
                        <Group justify="space-between" mb="xs">
                          <Box style={{ flex: 1 }}>
                            <Group gap="xs" mb="xs">
                              <Text fw={600}>{initiative.title}</Text>
                              {initiative.github_milestone_url && (
                                <Tooltip label="View on GitHub">
                                  <ActionIcon
                                    size="sm"
                                    variant="light"
                                    component="a"
                                    href={initiative.github_milestone_url}
                                    target="_blank"
                                  >
                                    <IconGitBranch size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                            <Text size="sm" c="dimmed" mb="xs">
                              {initiative.description}
                            </Text>
                            <Group gap="xs" mb="xs">
                              <Badge color={getStatusColor(initiative.status)} variant="light">
                                {initiative.status}
                              </Badge>
                              <Badge color={getHealthColor(initiative.health_score)} variant="light">
                                {getHealthLabel(initiative.health_score)}
                              </Badge>
                              {initiative.days_behind_schedule > 0 && (
                                <Badge color="red" variant="light">
                                  {initiative.days_behind_schedule} days behind
                                </Badge>
                              )}
                            </Group>
                            {initiative.progress_percentage > 0 && (
                              <Progress
                                value={initiative.progress_percentage}
                                 color={getHealthColor(initiative.health_score)}
                                 size="sm"
                                 mt="xs"
                               />
                            )}
                            {initiative.dependencies && initiative.dependencies.length > 0 && (
                              <Alert icon={<IconLink size={14} />} color="blue" mt="xs" title="Dependencies">
                                <Stack gap="xs">
                                  {initiative.dependencies.map((dep) => (
                                    <Text key={dep.id} size="xs">
                                      Depends on: <strong>{dep.depends_on_title}</strong>
                                      {dep.required_milestone && ` (${dep.required_milestone})`}
                                    </Text>
                                  ))}
                                </Stack>
                              </Alert>
                            )}
                            {initiative.github_issues_count > 0 && (
                              <Group gap="xs" mt="xs">
                                <Text size="xs" c="dimmed">
                                  {initiative.github_issues_count} issues • {initiative.github_prs_count} PRs
                                </Text>
                                {initiative.last_github_sync_at && (
                                  <Text size="xs" c="dimmed">
                                    Synced: {new Date(initiative.last_github_sync_at).toLocaleString()}
                                  </Text>
                                )}
                              </Group>
                            )}
                          </Box>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="alerts" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Slip Detection Alerts</Title>
            {alerts.length === 0 ? (
              <Alert icon={<IconCircleCheck size={16} />} color="green" title="All Clear">
                No slip alerts. All initiatives are on track.
              </Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Initiative</Table.Th>
                    <Table.Th>Days Behind</Table.Th>
                    <Table.Th>Severity</Table.Th>
                    <Table.Th>Alert</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {alerts.map((alert) => (
                    <Table.Tr key={alert.id}>
                      <Table.Td>
                        <Text fw={600}>{alert.initiative_title}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="red" variant="light">{alert.days_behind}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={alert.severity === 'critical' ? 'red' : 'orange'} variant="light">
                          {alert.severity}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{alert.alert_message}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="dependencies" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Initiative Dependencies</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Initiative</Table.Th>
                  <Table.Th>Depends On</Table.Th>
                  <Table.Th>Required Milestone</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {initiatives
                  .filter(i => i.dependencies && i.dependencies.length > 0)
                  .map((initiative) =>
                    initiative.dependencies?.map((dep) => (
                      <Table.Tr key={dep.id}>
                        <Table.Td>
                          <Text fw={600}>{initiative.title}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text>{dep.depends_on_title}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{dep.required_milestone || 'Any completion'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={initiative.status === 'blocked' ? 'red' : 'green'} variant="light">
                            {initiative.status === 'blocked' ? 'Blocked' : 'Active'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Create Initiative Modal */}
      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Create New Initiative"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="e.g., Implement Real-time Analytics Dashboard"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Describe the initiative..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Quarter"
                required
                data={['Q1', 'Q2', 'Q3', 'Q4']}
                value={formData.quarter}
                onChange={(value) => setFormData({ ...formData, quarter: value || 'Q1' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Year"
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </Grid.Col>
          </Grid>
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Target End Date"
                type="date"
                required
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
              />
            </Grid.Col>
          </Grid>
          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Priority"
                data={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value || 'medium' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Status"
                data={[
                  { value: 'planned', label: 'Planned' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'blocked', label: 'Blocked' },
                ]}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value || 'planned' })}
              />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInitiative}>
              Create Initiative
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
