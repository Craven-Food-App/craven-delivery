import React, { useState, useEffect, useCallback } from 'react';
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
  Select,
  Table,
  Tabs,
  Alert,
  Box,
  Paper,
  Progress,
  Tooltip,
  ActionIcon,
  Divider,
  Timeline,
  RingProgress,
  SegmentedControl,
  Textarea,
  Switch,
  Loader,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconRocket,
  IconCheck,
  IconX,
  IconClock,
  IconTrendingUp,
  IconInfoCircle,
  IconAlertTriangle,
  IconPlus,
  IconEdit,
  IconTrash,
  IconPlayerPlay,
  IconRefresh,
  IconDownload,
  IconShield,
  IconTestPipe,
  IconCode,
  IconServer,
  IconChartBar,
  IconFileText,
  IconGitBranch,
  IconGitCommit,
  IconWorld,
  IconSettings,
  IconBell,
  IconActivity,
  IconEye,
  IconCopy,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';

interface Pipeline {
  id: string;
  pipeline_name: string;
  pipeline_key: string;
  description: string;
  repository_url: string;
  branch: string;
  trigger_type: 'push' | 'pull_request' | 'schedule' | 'manual' | 'webhook';
  status: 'active' | 'paused' | 'archived' | 'draft';
  last_run_status: 'success' | 'failed' | 'running' | 'cancelled' | 'skipped' | null;
  last_run_at: string | null;
  last_run_duration: number | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_duration: number | null;
}

interface Build {
  id: string;
  build_number: string;
  pipeline_id: string;
  branch: string;
  commit_hash: string;
  commit_message: string | null;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
  stage: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration: number | null;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  test_coverage: number | null;
  quality_gate_status: 'passed' | 'failed' | 'warning' | null;
}

interface TestRun {
  id: string;
  test_run_number: string;
  build_id: string;
  test_suite_name: string;
  test_type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'regression';
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  coverage_percentage: number | null;
  duration: number | null;
}

interface Release {
  id: string;
  release_number: string;
  release_name: string | null;
  release_type: 'major' | 'minor' | 'patch' | 'hotfix' | 'pre-release';
  status: 'draft' | 'scheduled' | 'in_progress' | 'deployed' | 'rolled_back' | 'cancelled';
  target_environment: 'development' | 'staging' | 'production' | 'qa';
  deployment_strategy: 'rolling' | 'blue-green' | 'canary' | 'recreate';
  scheduled_at: string | null;
  deployed_at: string | null;
  rolled_back_at: string | null;
  approved_by: string | null;
}

interface Environment {
  id: string;
  environment_name: string;
  display_name: string;
  environment_type: 'production' | 'staging' | 'development' | 'qa' | 'demo' | 'testing';
  status: 'active' | 'maintenance' | 'degraded' | 'down';
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | null;
  current_release_id: string | null;
  deployed_at: string | null;
}

interface SecurityScan {
  id: string;
  scan_number: string;
  build_id: string;
  scan_type: 'sast' | 'dast' | 'dependency' | 'container' | 'secrets' | 'compliance';
  scanner_tool: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  vulnerabilities_critical: number;
  vulnerabilities_high: number;
  vulnerabilities_medium: number;
  vulnerabilities_low: number;
  total_vulnerabilities: number;
  blocking: boolean;
}

export const DevOpsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const toast = useToast();

  // Data state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [securityScans, setSecurityScans] = useState<SecurityScan[]>([]);

  // Modal states
  const [pipelineModalOpened, setPipelineModalOpened] = useState(false);
  const [buildModalOpened, setBuildModalOpened] = useState(false);
  const [releaseModalOpened, setReleaseModalOpened] = useState(false);
  const [environmentModalOpened, setEnvironmentModalOpened] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  // Forms
  const pipelineForm = useForm({
    initialValues: {
      pipeline_name: '',
      pipeline_key: '',
      description: '',
      repository_url: '',
      branch: 'main',
      trigger_type: 'push' as const,
    },
  });

  const buildForm = useForm({
    initialValues: {
      pipeline_id: '',
      branch: '',
      commit_hash: '',
      commit_message: '',
    },
  });

  const releaseForm = useForm({
    initialValues: {
      release_number: '',
      release_name: '',
      release_type: 'minor' as const,
      build_id: '',
      target_environment: 'staging' as const,
      deployment_strategy: 'rolling' as const,
      release_notes: '',
    },
  });

  const environmentForm = useForm({
    initialValues: {
      environment_name: '',
      display_name: '',
      environment_type: 'staging' as const,
      infrastructure_provider: '',
      region: '',
    },
  });

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPipelines(),
        fetchBuilds(),
        fetchTestRuns(),
        fetchReleases(),
        fetchEnvironments(),
        fetchSecurityScans(),
      ]);
    } catch (error: any) {
      console.error('Error fetching DevOps data:', error);
      toast.error(error?.message || 'Failed to load DevOps data', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_pipelines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipelines((data || []) as Pipeline[]);
    } catch (error: any) {
      console.error('Error fetching pipelines:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchBuilds = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_builds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBuilds((data || []) as Build[]);
    } catch (error: any) {
      console.error('Error fetching builds:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchTestRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTestRuns((data || []) as TestRun[]);
    } catch (error: any) {
      console.error('Error fetching test runs:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReleases((data || []) as Release[]);
    } catch (error: any) {
      console.error('Error fetching releases:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchEnvironments = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_environments')
        .select('*')
        .order('environment_type', { ascending: true });

      if (error) throw error;
      setEnvironments((data || []) as Environment[]);
    } catch (error: any) {
      console.error('Error fetching environments:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchSecurityScans = async () => {
    try {
      const { data, error } = await supabase
        .from('devops_security_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSecurityScans((data || []) as SecurityScan[]);
    } catch (error: any) {
      console.error('Error fetching security scans:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  // Create/Update Pipeline
  const handleCreatePipeline = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create pipelines', 'Error');
        return;
      }

      if (editingPipeline) {
        const { error } = await supabase
          .from('devops_pipelines')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPipeline.id);

        if (error) throw error;
        toast.success('Pipeline updated successfully', 'Success');
      } else {
        const { error } = await supabase
          .from('devops_pipelines')
          .insert({
            ...values,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success('Pipeline created successfully', 'Success');
      }

      setPipelineModalOpened(false);
      setEditingPipeline(null);
      pipelineForm.reset();
      fetchPipelines();
    } catch (error: any) {
      console.error('Error creating pipeline:', error);
      toast.error(error?.message || 'Failed to create pipeline', 'Error');
    }
  };

  // Trigger Build
  const handleTriggerBuild = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to trigger builds', 'Error');
        return;
      }

      const { error } = await (supabase as any)
        .from('devops_builds')
        .insert({
          pipeline_id: values.pipeline_id,
          branch: values.branch,
          commit_hash: values.commit_hash,
          commit_message: values.commit_message,
          status: 'queued',
          triggered_by: user.id,
          triggered_by_type: 'user',
          build_number: `BUILD-${Date.now()}`,
        });

      if (error) throw error;
      toast.success('Build triggered successfully', 'Success');
      setBuildModalOpened(false);
      buildForm.reset();
      fetchBuilds();
    } catch (error: any) {
      console.error('Error triggering build:', error);
      toast.error(error?.message || 'Failed to trigger build', 'Error');
    }
  };

  // Create Release
  const handleCreateRelease = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create releases', 'Error');
        return;
      }

      const { error } = await supabase
        .from('devops_releases')
        .insert({
          ...values,
          status: 'draft',
          created_by: user.id,
        });

      if (error) throw error;
      toast.success('Release created successfully', 'Success');
      setReleaseModalOpened(false);
      releaseForm.reset();
      fetchReleases();
    } catch (error: any) {
      console.error('Error creating release:', error);
      toast.error(error?.message || 'Failed to create release', 'Error');
    }
  };

  // Create Environment
  const handleCreateEnvironment = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create environments', 'Error');
        return;
      }

      const { error } = await supabase
        .from('devops_environments')
        .insert({
          ...values,
          status: 'active',
          health_status: 'unknown',
          created_by: user.id,
        });

      if (error) throw error;
      toast.success('Environment created successfully', 'Success');
      setEnvironmentModalOpened(false);
      environmentForm.reset();
      fetchEnvironments();
    } catch (error: any) {
      console.error('Error creating environment:', error);
      toast.error(error?.message || 'Failed to create environment', 'Error');
    }
  };

  // Cancel Build
  const handleCancelBuild = async (buildId: string) => {
    modals.openConfirmModal({
      title: 'Cancel Build',
      children: <Text size="sm">Are you sure you want to cancel this build?</Text>,
      labels: { confirm: 'Cancel Build', cancel: 'Keep Running' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('devops_builds')
            .update({ status: 'cancelled', completed_at: new Date().toISOString() })
            .eq('id', buildId);

          if (error) throw error;
          toast.success('Build cancelled', 'Success');
          fetchBuilds();
        } catch (error: any) {
          toast.error(error?.message || 'Failed to cancel build', 'Error');
        }
      },
    });
  };

  // Retry Build
  const handleRetryBuild = async (build: Build) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to retry builds', 'Error');
        return;
      }

      const { error } = await (supabase as any)
        .from('devops_builds')
        .insert({
          pipeline_id: build.pipeline_id,
          branch: build.branch,
          commit_hash: build.commit_hash,
          commit_message: build.commit_message,
          status: 'queued',
          triggered_by: user.id,
          triggered_by_type: 'user',
          trigger_reason: 'Retry of failed build',
          build_number: `BUILD-${Date.now()}`,
        });

      if (error) throw error;
      toast.success('Build retried successfully', 'Success');
      fetchBuilds();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to retry build', 'Error');
    }
  };

  // Calculate metrics
  const deploymentFrequency = builds.filter(b => {
    const buildDate = new Date((b as any).created_at || b.queued_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return buildDate >= sevenDaysAgo && b.status === 'success';
  }).length;

  const successRate = builds.length > 0
    ? (builds.filter(b => b.status === 'success').length / builds.length) * 100
    : 0;

  const avgDuration = builds.length > 0
    ? builds
        .filter(b => b.duration !== null)
        .reduce((sum, b) => sum + (b.duration || 0), 0) / builds.filter(b => b.duration !== null).length
    : 0;

  // Calculate MTTR from rollbacks
  const rolledBackReleases = releases.filter(r => r.status === 'rolled_back' && r.deployed_at && r.rolled_back_at);
  const mttr = rolledBackReleases.length > 0
    ? rolledBackReleases.reduce((sum, r) => {
        const deployed = new Date(r.deployed_at!).getTime();
        const rolledBack = new Date(r.rolled_back_at!).getTime();
        return sum + (rolledBack - deployed) / (1000 * 60 * 60); // Convert to hours
      }, 0) / rolledBackReleases.length
    : 0;

  // Auto-refresh
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Build metrics for chart
  const buildMetrics = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekBuilds = builds.filter(b => {
      const buildDate = new Date((b as any).created_at || b.queued_at);
      return buildDate >= weekStart && buildDate < weekEnd;
    });

    buildMetrics.push({
      period: `Week ${12 - i}`,
      total: weekBuilds.length,
      successful: weekBuilds.filter(b => b.status === 'success').length,
      failed: weekBuilds.filter(b => b.status === 'failed').length,
      avgDuration: weekBuilds.length > 0
        ? weekBuilds
            .filter(b => b.duration !== null)
            .reduce((sum, b) => sum + (b.duration || 0), 0) / weekBuilds.filter(b => b.duration !== null).length || 0
        : 0,
    });
  }

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: '400px' }}>
        <Loader size="xl" />
        <Text>Loading DevOps data...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>DevOps & CI/CD Dashboard</Title>
          <Text c="dimmed" size="sm">
            Enterprise-grade pipeline management, build automation, and delivery performance
          </Text>
        </Box>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditingPipeline(null);
              pipelineForm.reset();
              setPipelineModalOpened(true);
            }}
          >
            New Pipeline
          </Button>
          <Badge size="lg" color="violet" variant="light" leftSection={<IconRocket size={16} />}>
            DevOps
          </Badge>
        </Group>
      </Group>

      {/* Key Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Deployment Frequency</Text>
              <IconRocket size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              {deploymentFrequency}/week
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Last 7 days
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Build Success Rate</Text>
              <IconCheck size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              {successRate.toFixed(1)}%
            </Text>
            <Progress value={successRate} color="green" size="sm" mt="xs" />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Avg Build Duration</Text>
              <IconClock size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              {Math.round(avgDuration)}s
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Average build time
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Mean Time to Recovery</Text>
              <IconTrendingUp size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              {mttr > 0 ? `${mttr.toFixed(1)}h` : 'N/A'}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Average recovery time
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconActivity size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="pipelines" leftSection={<IconCode size={16} />}>
            Pipelines ({pipelines.length})
          </Tabs.Tab>
          <Tabs.Tab value="builds" leftSection={<IconRocket size={16} />}>
            Builds ({builds.length})
          </Tabs.Tab>
          <Tabs.Tab value="tests" leftSection={<IconTestPipe size={16} />}>
            Tests ({testRuns.length})
          </Tabs.Tab>
          <Tabs.Tab value="releases" leftSection={<IconWorld size={16} />}>
            Releases ({releases.length})
          </Tabs.Tab>
          <Tabs.Tab value="environments" leftSection={<IconServer size={16} />}>
            Environments ({environments.length})
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
            Security ({securityScans.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid gutter="md">
            <Grid.Col span={12}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  12-Week Build Performance
                </Title>
                <FuturisticChart
                  data={buildMetrics}
                  type="composed"
                  title=""
                  height={400}
                  colors={['#10b981', '#ef4444', '#3b82f6']}
                  dataKeys={{ revenue: 'successful', profit: 'failed', expenses: 'avgDuration' }}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Recent Builds</Title>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => {
                      buildForm.reset();
                      setBuildModalOpened(true);
                    }}
                  >
                    Trigger Build
                  </Button>
                </Group>
                {builds.length === 0 ? (
                  <Alert color="blue">No builds found</Alert>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Build</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Duration</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {builds.slice(0, 10).map((build) => (
                        <Table.Tr key={build.id}>
                          <Table.Td>
                            <Text fw={600}>{build.build_number}</Text>
                            <Text size="xs" c="dimmed">
                              {build.branch}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={
                                build.status === 'success'
                                  ? 'green'
                                  : build.status === 'failed'
                                  ? 'red'
                                  : build.status === 'running'
                                  ? 'blue'
                                  : 'gray'
                              }
                              variant="light"
                            >
                              {build.status.toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {build.duration ? `${build.duration}s` : 'N/A'}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {build.status === 'running' && (
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  onClick={() => handleCancelBuild(build.id)}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                              )}
                              {build.status === 'failed' && (
                                <ActionIcon
                                  color="blue"
                                  variant="light"
                                  onClick={() => handleRetryBuild(build)}
                                >
                                  <IconRefresh size={16} />
                                </ActionIcon>
                              )}
                              <ActionIcon
                                variant="light"
                                onClick={() => {
                                  setSelectedBuild(build);
                                  setBuildModalOpened(true);
                                }}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Active Pipelines</Title>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => {
                      setEditingPipeline(null);
                      pipelineForm.reset();
                      setPipelineModalOpened(true);
                    }}
                  >
                    New Pipeline
                  </Button>
                </Group>
                {pipelines.length === 0 ? (
                  <Alert color="blue">No pipelines configured</Alert>
                ) : (
                  <Stack gap="sm">
                    {pipelines.slice(0, 10).map((pipeline) => (
                      <Paper key={pipeline.id} p="sm" withBorder>
                        <Group justify="space-between">
                          <Box>
                            <Text fw={600}>{pipeline.pipeline_name}</Text>
                            <Text size="xs" c="dimmed">
                              {pipeline.branch} • {pipeline.total_runs} runs
                            </Text>
                          </Box>
                          <Group gap="xs">
                            <Badge
                              color={
                                pipeline.last_run_status === 'success'
                                  ? 'green'
                                  : pipeline.last_run_status === 'failed'
                                  ? 'red'
                                  : 'gray'
                              }
                              variant="light"
                            >
                              {pipeline.last_run_status || 'N/A'}
                            </Badge>
                            <ActionIcon
                              variant="light"
                              onClick={() => {
                                setEditingPipeline(pipeline);
                                pipelineForm.setValues({
                                  pipeline_name: pipeline.pipeline_name,
                                  pipeline_key: pipeline.pipeline_key,
                                  description: pipeline.description || '',
                                  repository_url: pipeline.repository_url,
                                  branch: pipeline.branch,
                              trigger_type: pipeline.trigger_type as any,
                                });
                                setPipelineModalOpened(true);
                              }}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="pipelines" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>CI/CD Pipelines</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setEditingPipeline(null);
                  pipelineForm.reset();
                  setPipelineModalOpened(true);
                }}
              >
                Create Pipeline
              </Button>
            </Group>
            {pipelines.length === 0 ? (
              <Alert color="blue">No pipelines configured. Create your first pipeline to get started.</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Pipeline</Table.Th>
                    <Table.Th>Repository</Table.Th>
                    <Table.Th>Branch</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Last Run</Table.Th>
                    <Table.Th>Success Rate</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pipelines.map((pipeline) => (
                    <Table.Tr key={pipeline.id}>
                      <Table.Td>
                        <Text fw={600}>{pipeline.pipeline_name}</Text>
                        <Text size="xs" c="dimmed">
                          {pipeline.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {pipeline.repository_url.split('/').pop()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" leftSection={<IconGitBranch size={12} />}>
                          {pipeline.branch}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            pipeline.status === 'active'
                              ? 'green'
                              : pipeline.status === 'paused'
                              ? 'yellow'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {pipeline.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {pipeline.last_run_at ? (
                          <Text size="sm">{dayjs(pipeline.last_run_at).fromNow()}</Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            Never
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {pipeline.total_runs > 0 ? (
                          <Text size="sm">
                            {((pipeline.successful_runs / pipeline.total_runs) * 100).toFixed(1)}%
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            N/A
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              buildForm.setValues({
                                pipeline_id: pipeline.id,
                                branch: pipeline.branch,
                                commit_hash: '',
                                commit_message: '',
                              });
                              setBuildModalOpened(true);
                            }}
                          >
                            <IconPlayerPlay size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              setEditingPipeline(pipeline);
                              pipelineForm.setValues({
                                pipeline_name: pipeline.pipeline_name,
                                pipeline_key: pipeline.pipeline_key,
                                description: pipeline.description || '',
                                repository_url: pipeline.repository_url,
                                branch: pipeline.branch,
                                trigger_type: pipeline.trigger_type,
                              });
                              setPipelineModalOpened(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="builds" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Build History</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  buildForm.reset();
                  setBuildModalOpened(true);
                }}
              >
                Trigger Build
              </Button>
            </Group>
            {builds.length === 0 ? (
              <Alert color="blue">No builds found. Trigger a build to get started.</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Build Number</Table.Th>
                    <Table.Th>Branch</Table.Th>
                    <Table.Th>Commit</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Tests</Table.Th>
                    <Table.Th>Coverage</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {builds.map((build) => (
                    <Table.Tr key={build.id}>
                      <Table.Td>
                        <Text fw={600}>{build.build_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" leftSection={<IconGitBranch size={12} />}>
                          {build.branch}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text ff="monospace" size="sm">
                          {build.commit_hash.substring(0, 7)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            build.status === 'success'
                              ? 'green'
                              : build.status === 'failed'
                              ? 'red'
                              : build.status === 'running'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                          leftSection={
                            build.status === 'success' ? (
                              <IconCheck size={12} />
                            ) : build.status === 'failed' ? (
                              <IconX size={12} />
                            ) : (
                              <IconClock size={12} />
                            )
                          }
                        >
                          {build.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {build.duration ? `${build.duration}s` : 'N/A'}
                      </Table.Td>
                      <Table.Td>
                        {build.tests_total > 0 ? (
                          <Text size="sm">
                            {build.tests_passed}/{build.tests_total} passed
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            N/A
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {build.test_coverage !== null ? (
                          <Text size="sm">{build.test_coverage.toFixed(1)}%</Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            N/A
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {build.status === 'running' && (
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleCancelBuild(build.id)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          )}
                          {build.status === 'failed' && (
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => handleRetryBuild(build)}
                            >
                              <IconRefresh size={16} />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              setSelectedBuild(build);
                              setBuildModalOpened(true);
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="tests" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Test Runs
            </Title>
            {testRuns.length === 0 ? (
              <Alert color="blue">No test runs found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Test Run</Table.Th>
                    <Table.Th>Suite</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Results</Table.Th>
                    <Table.Th>Coverage</Table.Th>
                    <Table.Th>Duration</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {testRuns.map((testRun) => (
                    <Table.Tr key={testRun.id}>
                      <Table.Td>
                        <Text fw={600}>{testRun.test_run_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{testRun.test_suite_name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{testRun.test_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            testRun.status === 'passed'
                              ? 'green'
                              : testRun.status === 'failed'
                              ? 'red'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {testRun.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {testRun.passed_tests} passed, {testRun.failed_tests} failed
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {testRun.coverage_percentage !== null ? (
                          <Text size="sm">{testRun.coverage_percentage.toFixed(1)}%</Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            N/A
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {testRun.duration ? `${testRun.duration}s` : 'N/A'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="releases" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Releases</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  releaseForm.reset();
                  setReleaseModalOpened(true);
                }}
              >
                Create Release
              </Button>
            </Group>
            {releases.length === 0 ? (
              <Alert color="blue">No releases found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Release</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Environment</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Deployed At</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {releases.map((release) => (
                    <Table.Tr key={release.id}>
                      <Table.Td>
                        <Text fw={600}>{release.release_number}</Text>
                        {release.release_name && (
                          <Text size="xs" c="dimmed">
                            {release.release_name}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{release.release_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            release.target_environment === 'production'
                              ? 'red'
                              : release.target_environment === 'staging'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {release.target_environment.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            release.status === 'deployed'
                              ? 'green'
                              : release.status === 'rolled_back'
                              ? 'red'
                              : release.status === 'in_progress'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {release.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {release.deployed_at ? (
                          <Text size="sm">{dayjs(release.deployed_at).format('MMM D, YYYY HH:mm')}</Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            Not deployed
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {release.status === 'deployed' && (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() => {
                                modals.openConfirmModal({
                                  title: 'Rollback Release',
                                  children: (
                                    <Text size="sm">
                                      Are you sure you want to rollback {release.release_number}?
                                    </Text>
                                  ),
                                  labels: { confirm: 'Rollback', cancel: 'Cancel' },
                                  confirmProps: { color: 'red' },
                                  onConfirm: async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('devops_releases')
                                        .update({
                                          status: 'rolled_back',
                                          rolled_back_at: new Date().toISOString(),
                                        })
                                        .eq('id', release.id);
                                      if (error) throw error;
                                      toast.success('Release rolled back', 'Success');
                                      fetchReleases();
                                    } catch (error: any) {
                                      toast.error(error?.message || 'Failed to rollback', 'Error');
                                    }
                                  },
                                });
                              }}
                            >
                              Rollback
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="environments" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Environments</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  environmentForm.reset();
                  setEnvironmentModalOpened(true);
                }}
              >
                Create Environment
              </Button>
            </Group>
            {environments.length === 0 ? (
              <Alert color="blue">No environments configured</Alert>
            ) : (
              <Grid gutter="md">
                {environments.map((env) => (
                  <Grid.Col key={env.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600}>{env.display_name}</Text>
                        <Badge
                          color={
                            env.health_status === 'healthy'
                              ? 'green'
                              : env.health_status === 'degraded'
                              ? 'yellow'
                              : env.health_status === 'unhealthy'
                              ? 'red'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {env.health_status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mb="sm">
                        {env.environment_type}
                      </Text>
                      <Group justify="space-between">
                        <Badge
                          color={
                            env.status === 'active'
                              ? 'green'
                              : env.status === 'maintenance'
                              ? 'yellow'
                              : 'red'
                          }
                          variant="light"
                        >
                          {env.status.toUpperCase()}
                        </Badge>
                        {env.deployed_at && (
                          <Text size="xs" c="dimmed">
                            Deployed {dayjs(env.deployed_at).fromNow()}
                          </Text>
                        )}
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Security Scans
            </Title>
            {securityScans.length === 0 ? (
              <Alert color="blue">No security scans found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Scan</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Tool</Table.Th>
                    <Table.Th>Vulnerabilities</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Blocking</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {securityScans.map((scan) => (
                    <Table.Tr key={scan.id}>
                      <Table.Td>
                        <Text fw={600}>{scan.scan_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{scan.scan_type.toUpperCase()}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{scan.scanner_tool}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          {scan.vulnerabilities_critical > 0 && (
                            <Text size="xs" c="red">
                              Critical: {scan.vulnerabilities_critical}
                            </Text>
                          )}
                          {scan.vulnerabilities_high > 0 && (
                            <Text size="xs" c="orange">
                              High: {scan.vulnerabilities_high}
                            </Text>
                          )}
                          {scan.vulnerabilities_medium > 0 && (
                            <Text size="xs" c="yellow">
                              Medium: {scan.vulnerabilities_medium}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed">
                            Total: {scan.total_vulnerabilities}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            scan.status === 'completed'
                              ? 'green'
                              : scan.status === 'failed'
                              ? 'red'
                              : 'blue'
                          }
                          variant="light"
                        >
                          {scan.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {scan.blocking ? (
                          <Badge color="red" variant="light">
                            YES
                          </Badge>
                        ) : (
                          <Badge color="green" variant="light">
                            NO
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Pipeline Modal */}
      <Modal
        opened={pipelineModalOpened}
        onClose={() => {
          setPipelineModalOpened(false);
          setEditingPipeline(null);
          pipelineForm.reset();
        }}
        title={editingPipeline ? 'Edit Pipeline' : 'Create Pipeline'}
        size="lg"
      >
        <form onSubmit={pipelineForm.onSubmit(handleCreatePipeline)}>
          <Stack gap="md">
            <TextInput
              label="Pipeline Name"
              required
              {...pipelineForm.getInputProps('pipeline_name')}
            />
            <TextInput
              label="Pipeline Key"
              required
              placeholder="e.g., main, feature-auth"
              {...pipelineForm.getInputProps('pipeline_key')}
            />
            <Textarea
              label="Description"
              {...pipelineForm.getInputProps('description')}
            />
            <TextInput
              label="Repository URL"
              required
              placeholder="https://github.com/org/repo"
              {...pipelineForm.getInputProps('repository_url')}
            />
            <TextInput
              label="Branch"
              required
              {...pipelineForm.getInputProps('branch')}
            />
            <Select
              label="Trigger Type"
              required
              data={[
                { value: 'push', label: 'Push' },
                { value: 'pull_request', label: 'Pull Request' },
                { value: 'schedule', label: 'Schedule' },
                { value: 'manual', label: 'Manual' },
                { value: 'webhook', label: 'Webhook' },
              ]}
              {...pipelineForm.getInputProps('trigger_type')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setPipelineModalOpened(false);
                  setEditingPipeline(null);
                  pipelineForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingPipeline ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Build Modal */}
      <Modal
        opened={buildModalOpened}
        onClose={() => {
          setBuildModalOpened(false);
          setSelectedBuild(null);
          buildForm.reset();
        }}
        title={selectedBuild ? 'Build Details' : 'Trigger Build'}
        size="lg"
      >
        {selectedBuild ? (
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Build Number: {selectedBuild.build_number}</Text>
              <Badge
                color={
                  selectedBuild.status === 'success'
                    ? 'green'
                    : selectedBuild.status === 'failed'
                    ? 'red'
                    : 'blue'
                }
                variant="light"
              >
                {selectedBuild.status.toUpperCase()}
              </Badge>
            </Group>
            <Divider />
            <Text size="sm">
              <strong>Branch:</strong> {selectedBuild.branch}
            </Text>
            <Text size="sm">
              <strong>Commit:</strong> {selectedBuild.commit_hash}
            </Text>
            {selectedBuild.commit_message && (
              <Text size="sm">
                <strong>Message:</strong> {selectedBuild.commit_message}
              </Text>
            )}
            {selectedBuild.duration && (
              <Text size="sm">
                <strong>Duration:</strong> {selectedBuild.duration}s
              </Text>
            )}
            {selectedBuild.tests_total > 0 && (
              <>
                <Text size="sm">
                  <strong>Tests:</strong> {selectedBuild.tests_passed}/{selectedBuild.tests_total} passed
                </Text>
                {selectedBuild.test_coverage !== null && (
                  <Text size="sm">
                    <strong>Coverage:</strong> {selectedBuild.test_coverage.toFixed(1)}%
                  </Text>
                )}
              </>
            )}
          </Stack>
        ) : (
          <form onSubmit={buildForm.onSubmit(handleTriggerBuild)}>
            <Stack gap="md">
              <Select
                label="Pipeline"
                required
                data={pipelines.map((p) => ({ value: p.id, label: p.pipeline_name }))}
                {...buildForm.getInputProps('pipeline_id')}
              />
              <TextInput
                label="Branch"
                required
                {...buildForm.getInputProps('branch')}
              />
              <TextInput
                label="Commit Hash"
                required
                placeholder="e.g., abc1234"
                {...buildForm.getInputProps('commit_hash')}
              />
              <Textarea
                label="Commit Message"
                {...buildForm.getInputProps('commit_message')}
              />
              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setBuildModalOpened(false);
                    buildForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Trigger Build</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* Release Modal */}
      <Modal
        opened={releaseModalOpened}
        onClose={() => {
          setReleaseModalOpened(false);
          releaseForm.reset();
        }}
        title="Create Release"
        size="lg"
      >
        <form onSubmit={releaseForm.onSubmit(handleCreateRelease)}>
          <Stack gap="md">
            <TextInput
              label="Release Number"
              required
              placeholder="e.g., v2.1.0"
              {...releaseForm.getInputProps('release_number')}
            />
            <TextInput
              label="Release Name"
              {...releaseForm.getInputProps('release_name')}
            />
            <Select
              label="Release Type"
              required
              data={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
                { value: 'patch', label: 'Patch' },
                { value: 'hotfix', label: 'Hotfix' },
                { value: 'pre-release', label: 'Pre-Release' },
              ]}
              {...releaseForm.getInputProps('release_type')}
            />
            <Select
              label="Build"
              data={builds
                .filter((b) => b.status === 'success')
                .map((b) => ({ value: b.id, label: `${b.build_number} - ${b.branch}` }))}
              {...releaseForm.getInputProps('build_id')}
            />
            <Select
              label="Target Environment"
              required
              data={[
                { value: 'development', label: 'Development' },
                { value: 'staging', label: 'Staging' },
                { value: 'production', label: 'Production' },
                { value: 'qa', label: 'QA' },
              ]}
              {...releaseForm.getInputProps('target_environment')}
            />
            <Select
              label="Deployment Strategy"
              required
              data={[
                { value: 'rolling', label: 'Rolling' },
                { value: 'blue-green', label: 'Blue-Green' },
                { value: 'canary', label: 'Canary' },
                { value: 'recreate', label: 'Recreate' },
              ]}
              {...releaseForm.getInputProps('deployment_strategy')}
            />
            <Textarea
              label="Release Notes"
              {...releaseForm.getInputProps('release_notes')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setReleaseModalOpened(false);
                  releaseForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Release</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Environment Modal */}
      <Modal
        opened={environmentModalOpened}
        onClose={() => {
          setEnvironmentModalOpened(false);
          environmentForm.reset();
        }}
        title="Create Environment"
        size="lg"
      >
        <form onSubmit={environmentForm.onSubmit(handleCreateEnvironment)}>
          <Stack gap="md">
            <TextInput
              label="Environment Name"
              required
              placeholder="e.g., production, staging"
              {...environmentForm.getInputProps('environment_name')}
            />
            <TextInput
              label="Display Name"
              required
              {...environmentForm.getInputProps('display_name')}
            />
            <Select
              label="Environment Type"
              required
              data={[
                { value: 'production', label: 'Production' },
                { value: 'staging', label: 'Staging' },
                { value: 'development', label: 'Development' },
                { value: 'qa', label: 'QA' },
                { value: 'demo', label: 'Demo' },
                { value: 'testing', label: 'Testing' },
              ]}
              {...environmentForm.getInputProps('environment_type')}
            />
            <TextInput
              label="Infrastructure Provider"
              placeholder="e.g., AWS, Azure, GCP"
              {...environmentForm.getInputProps('infrastructure_provider')}
            />
            <TextInput
              label="Region"
              {...environmentForm.getInputProps('region')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setEnvironmentModalOpened(false);
                  environmentForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Environment</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
