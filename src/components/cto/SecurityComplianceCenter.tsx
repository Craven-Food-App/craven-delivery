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
  ActionIcon,
} from '@mantine/core';
import {
  IconShield,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconTrendingUp,
  IconLock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';

interface SecurityFinding {
  id: string;
  finding: string;
  audit_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'accepted';
  created_at: string;
}

interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: number;
  lastAudit: string;
}

export const SecurityComplianceCenter: React.FC = () => {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('findings');
  const toast = useToast();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const { data: auditsData, error } = await supabase
        .from('security_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFindings((auditsData || []) as SecurityFinding[]);

      // Mock compliance status
      setComplianceStatus([
        {
          framework: 'SOC 2 Type II',
          status: 'compliant',
          score: 95,
          lastAudit: '2024-01-15',
        },
        {
          framework: 'ISO 27001',
          status: 'partial',
          score: 78,
          lastAudit: '2024-02-01',
        },
        {
          framework: 'GDPR',
          status: 'compliant',
          score: 92,
          lastAudit: '2024-01-20',
        },
        {
          framework: 'PCI DSS',
          status: 'non-compliant',
          score: 45,
          lastAudit: '2024-01-10',
        },
      ]);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const criticalFindings = findings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length;
  const openFindings = findings.filter(f => f.status === 'open' || f.status === 'in-progress').length;
  const overallSecurityScore = 85; // Calculated from various factors
  const avgComplianceScore = complianceStatus.reduce((sum, c) => sum + c.score, 0) / complianceStatus.length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'blue';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'green';
      case 'partial': return 'yellow';
      default: return 'red';
    }
  };

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Security & Compliance Center</Title>
          <Text c="dimmed" size="sm">
            Security posture, vulnerability management, and compliance monitoring
          </Text>
        </Box>
        <Badge size="lg" color="red" variant="light" leftSection={<IconShield size={16} />}>
          Security Ops
        </Badge>
      </Group>

      {/* Key Security Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Security Score</Text>
              <IconShield size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              {overallSecurityScore}
            </Text>
            <Progress value={overallSecurityScore} color="violet" size="sm" mt="xs" />
            <Text size="xs" c="dimmed" mt={4}>
              Overall security posture
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Critical Findings</Text>
              <IconAlertTriangle size={20} color="#ef4444" />
            </Group>
            <Text size="xl" fw={700} c={criticalFindings > 0 ? 'red' : 'green'}>
              {criticalFindings}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Unresolved critical issues
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Open Findings</Text>
              <IconLock size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              {openFindings}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Active security issues
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Compliance Score</Text>
              <IconCheck size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              {Math.round(avgComplianceScore)}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Average across frameworks
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'findings')}>
        <Tabs.List>
          <Tabs.Tab value="findings" leftSection={<IconAlertTriangle size={16} />}>
            Security Findings
          </Tabs.Tab>
          <Tabs.Tab value="compliance" leftSection={<IconCheck size={16} />}>
            Compliance Status
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<IconTrendingUp size={16} />}>
            Security Trends
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="findings" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Security Audit Findings
            </Title>
            <MantineTable
              data={findings}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'Finding', dataIndex: 'finding' },
                { title: 'Type', dataIndex: 'audit_type' },
                {
                  title: 'Severity',
                  dataIndex: 'severity',
                  render: (severity: string) => (
                    <Badge color={getSeverityColor(severity)} variant="light">
                      {severity}
                    </Badge>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge
                      color={status === 'resolved' ? 'green' : status === 'in-progress' ? 'yellow' : 'red'}
                      variant="light"
                    >
                      {status}
                    </Badge>
                  ),
                },
                {
                  title: 'Date',
                  dataIndex: 'created_at',
                  render: (v: string) => new Date(v).toLocaleDateString(),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="compliance" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Compliance Framework Status
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Framework</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Score</Table.Th>
                  <Table.Th>Last Audit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {complianceStatus.map((compliance, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Text fw={600}>{compliance.framework}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getComplianceColor(compliance.status)} variant="light">
                        {compliance.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={600}>{compliance.score}%</Text>
                        <Progress value={compliance.score} size="sm" style={{ width: 100 }} />
                      </Group>
                    </Table.Td>
                    <Table.Td>{new Date(compliance.lastAudit).toLocaleDateString()}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              12-Month Security Trend
            </Title>
            <FuturisticChart
              data={Array.from({ length: 12 }, (_, i) => {
                const month = new Date();
                month.setMonth(month.getMonth() - (11 - i));
                return {
                  month: month.toLocaleString('default', { month: 'short' }),
                  SecurityScore: overallSecurityScore + (Math.random() * 10 - 5),
                  Findings: openFindings + Math.floor(Math.random() * 5),
                };
              })}
              type="line"
              title=""
              height={350}
              colors={['#8b5cf6', '#ef4444']}
              dataKeys={{ revenue: 'SecurityScore', profit: 'Findings' }}
            />
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};


