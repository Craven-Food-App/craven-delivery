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
      // Fetch security audits/findings
      const { data: auditsData, error: auditsError } = await supabase
        .from('security_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditsError) {
        if (auditsError.code === 'PGRST116' || auditsError.message?.includes('does not exist')) {
          console.warn('security_audits table not found, using empty findings');
          setFindings([]);
        } else {
          console.error('Error fetching security audits:', auditsError);
          console.error('Error details:', {
            code: auditsError.code,
            message: auditsError.message,
            details: auditsError.details,
            hint: auditsError.hint,
          });
          throw auditsError;
        }
      } else {
        console.log('Security audits fetched:', auditsData?.length || 0, 'findings');
        setFindings((auditsData || []) as SecurityFinding[]);
      }

      // Fetch real compliance status from compliance_tracking table
      const { data: complianceData, error: complianceError } = await supabase
        .from('compliance_tracking')
        .select('*')
        .order('last_audit_date', { ascending: false });

      if (complianceError) {
        if (complianceError.code === 'PGRST116' || complianceError.message?.includes('does not exist')) {
          console.warn('compliance_tracking table not found, using empty compliance status');
          setComplianceStatus([]);
        } else {
          console.error('Error fetching compliance data:', complianceError);
          setComplianceStatus([]);
        }
      } else {
        // Transform compliance_tracking data to ComplianceStatus format
        const realCompliance: ComplianceStatus[] = (complianceData || []).map((record: any) => {
          // Map compliance_status to our status enum
          let status: 'compliant' | 'partial' | 'non-compliant' = 'non-compliant';
          if (record.compliance_status === 'compliant') {
            status = 'compliant';
          } else if (record.compliance_status === 'partial' || record.compliance_status === 'in_progress') {
            status = 'partial';
          }

          // Calculate score based on compliance status and risk level
          let score = 0;
          if (status === 'compliant') {
            score = record.risk_level === 'low' ? 95 : record.risk_level === 'medium' ? 85 : 75;
          } else if (status === 'partial') {
            score = record.risk_level === 'low' ? 70 : record.risk_level === 'medium' ? 60 : 50;
          } else {
            score = record.risk_level === 'low' ? 40 : record.risk_level === 'medium' ? 30 : 20;
          }

          return {
            framework: record.regulation_name || record.regulation_type || 'Unknown Framework',
            status: status,
            score: score,
            lastAudit: record.last_audit_date || record.updated_at || record.created_at,
          };
        });

        setComplianceStatus(realCompliance);
      }
    } catch (error: any) {
      console.error('Error fetching security data:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to load security data', 'Error');
      }
      setFindings([]);
      setComplianceStatus([]);
    } finally {
      setLoading(false);
    }
  };

  const criticalFindings = findings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length;
  const openFindings = findings.filter(f => f.status === 'open' || f.status === 'in-progress').length;
  
  // Calculate overall security score based on findings
  // Base score of 100, deduct points for open findings
  const totalFindings = findings.length;
  const resolvedFindings = findings.filter(f => f.status === 'resolved').length;
  const overallSecurityScore = totalFindings > 0
    ? Math.max(0, Math.min(100, Math.round(
        100 - (criticalFindings * 10) - (openFindings * 5) + (resolvedFindings * 2)
      )))
    : 100; // Perfect score if no findings
  
  const avgComplianceScore = complianceStatus.length > 0
    ? complianceStatus.reduce((sum, c) => sum + c.score, 0) / complianceStatus.length
    : 0;

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
            <Text size="xl" fw={700} c={avgComplianceScore >= 80 ? 'green' : avgComplianceScore >= 60 ? 'yellow' : 'red'}>
              {complianceStatus.length > 0 ? Math.round(avgComplianceScore) : 0}%
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
                {complianceStatus.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Alert color="blue" title="No compliance data">
                        <Text size="sm">
                          No compliance tracking records found. Compliance frameworks will appear here once tracked in the system.
                        </Text>
                      </Alert>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  complianceStatus.map((compliance, idx) => (
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
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              12-Month Security Trend
            </Title>
            {findings.length > 0 ? (
              <FuturisticChart
                data={(() => {
                  // Generate trend data from actual findings over last 12 months
                  // Only include months that have actual findings
                  const now = new Date();
                  const chartData: any[] = [];
                  
                  for (let i = 0; i < 12; i++) {
                    const month = new Date(now);
                    month.setMonth(month.getMonth() - (11 - i));
                    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                    
                    // Count findings for this month
                    const monthFindings = findings.filter(f => {
                      const findingDate = new Date(f.created_at);
                      return findingDate >= monthStart && findingDate <= monthEnd;
                    });
                    
                    // Only include month if it has findings
                    if (monthFindings.length > 0) {
                      const monthOpenFindings = monthFindings.filter(f => f.status === 'open' || f.status === 'in-progress').length;
                      const monthScore = Math.max(0, Math.min(100, 100 - (monthOpenFindings * 5)));
                      
                      chartData.push({
                        month: month.toLocaleString('default', { month: 'short' }),
                        SecurityScore: monthScore,
                        Findings: monthOpenFindings,
                      });
                    }
                  }
                  
                  return chartData;
                })()}
                type="line"
                title=""
                height={350}
                colors={['#8b5cf6', '#ef4444']}
                dataKeys={{ revenue: 'SecurityScore', profit: 'Findings' }}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No security findings data available. Security audits will appear here once conducted.
              </Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};


