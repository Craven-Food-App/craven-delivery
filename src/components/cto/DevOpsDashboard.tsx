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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('deployments');
  const toast = useToast();

  useEffect(() => {
    fetchDevOpsData();
    const interval = setInterval(fetchDevOpsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevOpsData = async () => {
    setLoading(true);
    try {
      // Mock deployment data
      const mockDeployments: Deployment[] = [
        {
          id: '1',
          branch: 'main',
          environment: 'production',
          status: 'success',
          duration: 245,
          commit: 'a1b2c3d',
          deployed_at: new Date().toISOString(),
        },
        {
          id: '2',
          branch: 'develop',
          environment: 'staging',
          status: 'success',
          duration: 198,
          commit: 'e4f5g6h',
          deployed_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          branch: 'feature/new-api',
          environment: 'staging',
          status: 'failed',
          duration: 312,
          commit: 'i7j8k9l',
          deployed_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ];

      setDeployments(mockDeployments);

      // Generate build metrics for last 12 weeks
      const metrics: BuildMetric[] = Array.from({ length: 12 }, (_, i) => {
        const week = new Date();
        week.setDate(week.getDate() - (11 - i) * 7);
        return {
          period: `Week ${i + 1}`,
          total: 20 + Math.floor(Math.random() * 10),
          successful: 18 + Math.floor(Math.random() * 8),
          failed: 1 + Math.floor(Math.random() * 3),
          avgDuration: 200 + Math.random() * 100,
        };
      });

      setBuildMetrics(metrics);
    } catch (error) {
      console.error('Error fetching DevOps data:', error);
      toast.error('Failed to load DevOps data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const deploymentFrequency = deployments.filter(d => d.status === 'success').length;
  const successRate = deployments.length > 0
    ? (deployments.filter(d => d.status === 'success').length / deployments.length) * 100
    : 100;
  const avgDuration = deployments.length > 0
    ? deployments.reduce((sum, d) => sum + d.duration, 0) / deployments.length
    : 0;
  const mttr = 2.5; // Mean time to recovery in hours

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
              {mttr.toFixed(1)}h
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
                        {deployment.environment}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={deployment.status === 'success' ? 'green' : deployment.status === 'failed' ? 'red' : 'yellow'}
                        variant="light"
                        leftSection={deployment.status === 'success' ? <IconCheck size={12} /> : <IconX size={12} />}
                      >
                        {deployment.status}
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


