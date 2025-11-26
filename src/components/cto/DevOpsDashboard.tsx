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
  Table,
  Tabs,
  Alert,
  Box,
  Paper,
  Progress,
  Tooltip,
} from '@mantine/core';
import {
  IconRocket,
  IconCheck,
  IconX,
  IconClock,
  IconTrendingUp,
  IconInfoCircle,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';

interface Deployment {
  id: string;
  branch: string;
  environment: string;
  status: 'success' | 'failed' | 'in_progress';
  duration: number;
  commit: string;
  deployed_at: string;
}

interface BuildMetric {
  period: string;
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
}

export const DevOpsDashboard: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [buildMetrics, setBuildMetrics] = useState<BuildMetric[]>([]);
  const [mttr, setMttr] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('deployments');
  const toast = useToast();

  useEffect(() => {
    fetchDevOpsData();
    fetchMTTR();
    // Set up auto-refresh every 30 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchDevOpsData();
        fetchMTTR();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMTTR = async () => {
    try {
      const { data: rolledBack } = await supabase
        .from('cto_architecture_changes')
        .select('deployed_at, rolled_back_at')
        .eq('status', 'rolled_back')
        .not('deployed_at', 'is', null)
        .not('rolled_back_at', 'is', null)
        .limit(10);

      if (rolledBack && rolledBack.length > 0) {
        const recoveryTimes = rolledBack.map((change: any) => {
          const deployed = new Date(change.deployed_at).getTime();
          const rolledBack = new Date(change.rolled_back_at).getTime();
          return (rolledBack - deployed) / (1000 * 60 * 60); // Convert to hours
        });
        const avgMTTR = recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length;
        setMttr(avgMTTR);
      } else {
        setMttr(0);
      }
    } catch (error) {
      console.error('Error calculating MTTR:', error);
      setMttr(0);
    }
  };

  const fetchDevOpsData = async () => {
    setLoading(true);
    try {
      // Fetch real deployments from cto_architecture_changes
      const { data: architectureChanges, error } = await supabase
        .from('cto_architecture_changes')
        .select('*')
        .in('status', ['completed', 'deployed', 'rolled_back'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching deployments:', error);
        setDeployments([]);
      } else {
        // Transform architecture changes to deployment format
        const realDeployments: Deployment[] = (architectureChanges || []).map((change: any) => {
          // Extract branch/environment from change_type or metadata
          const changeType = change.change_type || change.change_type || 'infrastructure';
          const environment = changeType.includes('production') || change.status === 'deployed' ? 'production' : 'staging';
          
          // Extract branch from title or use change_type
          const branchMatch = change.change_title?.match(/(main|master|develop|feature\/[^\s]+)/i);
          const branch = branchMatch ? branchMatch[1].toLowerCase() : changeType;
          
          // Extract commit hash from description or migration_files if available
          const commitMatch = change.change_description?.match(/\b([a-f0-9]{7,})\b/i) || 
                             change.migration_files?.[0]?.match(/\b([a-f0-9]{7,})\b/i);
          const commit = commitMatch ? commitMatch[1].substring(0, 7) : 'unknown';
          
          // Calculate duration from actual timestamps only - no fake data
          const duration = change.deployed_at && change.created_at
            ? Math.floor((new Date(change.deployed_at).getTime() - new Date(change.created_at).getTime()) / 1000)
            : null; // No fake default - show null if no real data
          
          return {
            id: change.id,
            branch: branch,
            environment: environment,
            status: change.status === 'rolled_back' ? 'failed' : change.status === 'completed' || change.status === 'deployed' ? 'success' : 'in_progress',
            duration: duration,
            commit: commit,
            deployed_at: change.deployed_at || change.created_at,
          };
        });

        setDeployments(realDeployments);

        // Calculate build metrics from real deployment data
        const now = new Date();
        const metrics: BuildMetric[] = [];
        
        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          const weekDeployments = realDeployments.filter(d => {
            const deployDate = new Date(d.deployed_at);
            return deployDate >= weekStart && deployDate < weekEnd;
          });
          
          const successful = weekDeployments.filter(d => d.status === 'success').length;
          const failed = weekDeployments.filter(d => d.status === 'failed').length;
          const total = weekDeployments.length;
          const avgDuration = total > 0
            ? weekDeployments.reduce((sum, d) => sum + d.duration, 0) / total
            : 0;
          
          metrics.push({
            period: `Week ${12 - i}`,
            total: total,
            successful: successful,
            failed: failed,
            avgDuration: avgDuration,
          });
        }
        
        setBuildMetrics(metrics);
      }
    } catch (error) {
      console.error('Error fetching DevOps data:', error);
      toast.error('Failed to load DevOps data', 'Error');
      setDeployments([]);
      setBuildMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate deployment frequency (successful deployments in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentDeployments = deployments.filter(d => {
    const deployDate = new Date(d.deployed_at);
    return deployDate >= sevenDaysAgo && d.status === 'success';
  });
  const deploymentFrequency = recentDeployments.length;

  // Calculate success rate from all deployments
  const successRate = deployments.length > 0
    ? (deployments.filter(d => d.status === 'success').length / deployments.length) * 100
    : 0;

  // Calculate average build duration
  const avgDuration = deployments.length > 0
    ? deployments.reduce((sum, d) => sum + d.duration, 0) / deployments.length
    : 0;


  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>DevOps & CI/CD Dashboard</Title>
          <Text c="dimmed" size="sm">
            Deployment pipelines, build metrics, and delivery performance
          </Text>
        </Box>
        <Badge size="lg" color="violet" variant="light" leftSection={<IconRocket size={16} />}>
          DevOps
        </Badge>
      </Group>

      {/* Key DevOps Metrics */}
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

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'deployments')}>
        <Tabs.List>
          <Tabs.Tab value="deployments" leftSection={<IconRocket size={16} />}>
            Recent Deployments
          </Tabs.Tab>
          <Tabs.Tab value="metrics" leftSection={<IconTrendingUp size={16} />}>
            Build Metrics
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="deployments" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Deployment History
            </Title>
            {deployments.length === 0 ? (
              <Alert color="blue" title="No deployments found">
                <Text size="sm">
                  No deployment history available. Deployments will appear here once architecture changes are marked as completed or deployed.
                </Text>
              </Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Branch</Table.Th>
                    <Table.Th>Environment</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Commit</Table.Th>
                    <Table.Th>Deployed At</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {deployments.map((deployment) => (
                    <Table.Tr key={deployment.id}>
                      <Table.Td>
                        <Text fw={600}>{deployment.branch}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={deployment.environment === 'production' ? 'red' : 'blue'}>
                          {deployment.environment.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={deployment.status === 'success' ? 'green' : deployment.status === 'failed' ? 'red' : 'yellow'}
                          variant="light"
                          leftSection={deployment.status === 'success' ? <IconCheck size={12} /> : <IconX size={12} />}
                        >
                          {deployment.status === 'success' ? '✓ SUCCESS' : deployment.status === 'failed' ? 'X FAILED' : 'IN PROGRESS'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{deployment.duration}s</Table.Td>
                      <Table.Td>
                        <Text ff="monospace" size="sm">
                          {deployment.commit}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{new Date(deployment.deployed_at).toLocaleString()}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="metrics" pt="md">
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
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};


