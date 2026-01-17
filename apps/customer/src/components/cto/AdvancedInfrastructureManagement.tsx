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
  Modal,
  TextInput,
  NumberInput,
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
  MultiSelect,
  Switch,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconCloud,
  IconServer,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconEdit,
  IconTrash,
  IconInfoCircle,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock,
  IconChartBar,
  IconShield,
  IconSettings,
  IconBell,
  IconActivity,
  IconDatabase,
  IconNetwork,
  IconFileAlert,
  IconRefresh,
  IconDownload,
  IconFilter,
  IconSearch,
  IconCalendar,
  IconUsers,
  IconCurrencyDollar,
  IconGauge,
  IconChartLine,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';

interface Service {
  id: string;
  service_name: string;
  service_provider: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime_percent: number;
  response_time_ms: number;
}

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'postponed';
  detected_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  affected_services: string[];
  sla_breach: boolean;
}

interface CapacityPlan {
  id: string;
  service_id: string;
  resource_type: string;
  current_capacity: number;
  current_utilization: number;
  utilization_percent: number;
  recommended_action: string;
  action_priority: string;
  estimated_cost: number;
}

interface CostOptimization {
  id: string;
  resource_type: string;
  optimization_type: string;
  current_cost: number;
  potential_savings: number;
  savings_percent: number;
  recommendation: string;
  status: string;
}

interface SLA {
  id: string;
  service_id: string;
  sla_name: string;
  sla_type: string;
  target_value: number;
  current_value: number;
  status: 'meeting' | 'at_risk' | 'breached';
  breach_count: number;
}

interface ProvisioningRequest {
  id: string;
  request_number: string;
  request_type: string;
  resource_type: string;
  service_name: string;
  status: string;
  estimated_cost: number;
  requested_by: string;
  requested_at: string;
}

interface Change {
  id: string;
  change_number: string;
  change_type: string;
  title: string;
  status: string;
  planned_start: string;
  planned_end: string;
  risk_assessment: string;
}

export const AdvancedInfrastructureManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  const [costOptimizations, setCostOptimizations] = useState<CostOptimization[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [provisioningRequests, setProvisioningRequests] = useState<ProvisioningRequest[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const toast = useToast();

  // Modal states
  const [incidentModalOpened, setIncidentModalOpened] = useState(false);
  const [capacityModalOpened, setCapacityModalOpened] = useState(false);
  const [provisioningModalOpened, setProvisioningModalOpened] = useState(false);
  const [changeModalOpened, setChangeModalOpened] = useState(false);
  const [slaModalOpened, setSlaModalOpened] = useState(false);

  // Forms
  const incidentForm = useForm({
    initialValues: {
      title: '',
      description: '',
      severity: 'medium',
      priority: 'p2',
      affected_services: [] as string[],
      service_impact: '',
    },
  });

  const capacityForm = useForm({
    initialValues: {
      service_id: '',
      resource_type: 'compute',
      current_capacity: 0,
      current_utilization: 0,
      projected_growth_rate: 0,
      recommended_action: 'monitor',
      action_priority: 'monitor',
      estimated_cost: 0,
      notes: '',
    },
  });

  useEffect(() => {
    fetchAllData();
    // Set up real-time polling every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServices(),
        fetchIncidents(),
        fetchCapacityPlans(),
        fetchCostOptimizations(),
        fetchSLAs(),
        fetchProvisioningRequests(),
        fetchChanges(),
      ]);
    } catch (error: any) {
      console.error('Error fetching infrastructure data:', error);
      toast.error(error?.message || 'Failed to load infrastructure data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('it_infrastructure')
        .select('*')
        .order('last_check', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
      setServices((data || []) as Service[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching services:', error);
      }
      setServices([]);
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && error.code !== 'PGRST116') throw error;
      setIncidents((data || []) as Incident[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching incidents:', error);
      }
      setIncidents([]);
    }
  };

  const fetchCapacityPlans = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_capacity_plans')
        .select('*')
        .order('action_priority', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
      setCapacityPlans((data || []) as CapacityPlan[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching capacity plans:', error);
      }
      setCapacityPlans([]);
    }
  };

  const fetchCostOptimizations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_cost_optimizations')
        .select('*')
        .eq('status', 'pending')
        .order('potential_savings', { ascending: false })
        .limit(20);

      if (error && error.code !== 'PGRST116') throw error;
      setCostOptimizations((data || []) as CostOptimization[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching cost optimizations:', error);
      }
      setCostOptimizations([]);
    }
  };

  const fetchSLAs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_slas')
        .select('*')
        .eq('is_active', true)
        .order('status', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
      setSlas((data || []) as SLA[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching SLAs:', error);
      }
      setSlas([]);
    }
  };

  const fetchProvisioningRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_provisioning_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(50);

      if (error && error.code !== 'PGRST116') throw error;
      setProvisioningRequests((data || []) as ProvisioningRequest[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching provisioning requests:', error);
      }
      setProvisioningRequests([]);
    }
  };

  const fetchChanges = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('infrastructure_changes')
        .select('*')
        .order('planned_start', { ascending: false })
        .limit(50);

      if (error && error.code !== 'PGRST116') throw error;
      setChanges((data || []) as Change[]);
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching changes:', error);
      }
      setChanges([]);
    }
  };

  const handleCreateIncident = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create incidents', 'Error');
        return;
      }

      const { error } = await (supabase as any)
        .from('infrastructure_incidents')
        .insert({
          ...values,
          created_by: user.id,
        });

      if (error) throw error;
      toast.success('Incident created successfully', 'Success');
      setIncidentModalOpened(false);
      incidentForm.reset();
      fetchIncidents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create incident', 'Error');
    }
  };

  const handleCreateCapacityPlan = async (values: any) => {
    try {
      const { error } = await (supabase as any)
        .from('infrastructure_capacity_plans')
        .insert(values);

      if (error) throw error;
      toast.success('Capacity plan created successfully', 'Success');
      setCapacityModalOpened(false);
      capacityForm.reset();
      fetchCapacityPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create capacity plan', 'Error');
    }
  };

  const provisioningForm = useForm({
    initialValues: {
      request_type: 'provision',
      resource_type: 'compute',
      provider: '',
      service_name: '',
      specifications: '{}',
      estimated_cost: 0,
      justification: '',
      priority: 'normal',
    },
  });

  const handleCreateProvisioningRequest = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create provisioning requests', 'Error');
        return;
      }

      let specificationsJson = {};
      try {
        specificationsJson = JSON.parse(values.specifications || '{}');
      } catch (e) {
        toast.error('Invalid JSON in specifications', 'Error');
        return;
      }

      const { error } = await (supabase as any)
        .from('infrastructure_provisioning_requests')
        .insert({
          request_type: values.request_type,
          resource_type: values.resource_type,
          provider: values.provider,
          service_name: values.service_name,
          specifications: specificationsJson,
          estimated_cost: values.estimated_cost || 0,
          justification: values.justification,
          priority: values.priority,
          requested_by: user.id,
        });

      if (error) throw error;
      toast.success('Provisioning request created successfully', 'Success');
      setProvisioningModalOpened(false);
      provisioningForm.reset();
      fetchProvisioningRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create provisioning request', 'Error');
    }
  };

  // Calculate metrics
  const activeIncidents = incidents.filter(i => ['open', 'investigating'].includes(i.status));
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && ['open', 'investigating'].includes(i.status));
  const slaBreaches = slas.filter(s => s.status === 'breached').length;
  const totalPotentialSavings = costOptimizations.reduce((sum, opt) => sum + opt.potential_savings, 0);
  const urgentCapacityActions = capacityPlans.filter(cp => cp.action_priority === 'immediate' || cp.action_priority === 'urgent').length;
  const avgUptime = services.length > 0
    ? services.reduce((sum, s) => sum + (s.uptime_percent || 0), 0) / services.length
    : 0;
  const operationalServices = services.filter(s => s.status === 'operational').length;

  return (
    <Stack gap="lg" p="md">
      {/* Header */}
      <Group justify="space-between">
        <Box>
          <Title order={2}>Infrastructure Management</Title>
          <Text c="dimmed" size="sm">
            Enterprise-grade infrastructure monitoring, incident management, capacity planning, and operational excellence
          </Text>
        </Box>
        <Group>
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as 'overview' | 'detailed')}
            data={[
              { label: 'Overview', value: 'overview' },
              { label: 'Detailed', value: 'detailed' },
            ]}
          />
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={fetchAllData}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      {/* Critical Alerts Banner */}
      {(criticalIncidents.length > 0 || slaBreaches > 0) && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Critical Infrastructure Alerts"
          color="red"
        >
          <Group>
            {criticalIncidents.length > 0 && (
              <Text>
                <strong>{criticalIncidents.length}</strong> critical incident{criticalIncidents.length > 1 ? 's' : ''} active
              </Text>
            )}
            {slaBreaches > 0 && (
              <Text>
                <strong>{slaBreaches}</strong> SLA breach{slaBreaches > 1 ? 'es' : ''} detected
              </Text>
            )}
            <Button
              size="xs"
              variant="light"
              onClick={() => setActiveTab('incidents')}
            >
              View Details
            </Button>
          </Group>
        </Alert>
      )}

      {/* Key Operational Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Service Uptime</Text>
              <IconServer size={20} color={avgUptime >= 99.9 ? "#10b981" : avgUptime >= 99 ? "#f59e0b" : "#ef4444"} />
            </Group>
            <Text size="xl" fw={700} c={avgUptime >= 99.9 ? "green" : avgUptime >= 99 ? "yellow" : "red"}>
              {avgUptime.toFixed(2)}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {operationalServices}/{services.length} services operational
            </Text>
            <Progress value={avgUptime} size="sm" mt="xs" color={avgUptime >= 99.9 ? "green" : avgUptime >= 99 ? "yellow" : "red"} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Active Incidents</Text>
              <IconFileAlert size={20} color={activeIncidents.length > 0 ? "#ef4444" : "#10b981"} />
            </Group>
            <Text size="xl" fw={700} c={activeIncidents.length > 0 ? "red" : "green"}>
              {activeIncidents.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {criticalIncidents.length} critical
            </Text>
            {activeIncidents.length > 0 && (
              <Progress 
                value={(criticalIncidents.length / activeIncidents.length) * 100} 
                size="sm" 
                mt="xs" 
                color="red" 
              />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">SLA Compliance</Text>
              <IconShield size={20} color={slaBreaches === 0 ? "#10b981" : "#ef4444"} />
            </Group>
            <Text size="xl" fw={700} c={slaBreaches === 0 ? "green" : "red"}>
              {slas.length > 0 ? ((slas.length - slaBreaches) / slas.length * 100).toFixed(1) : 100}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {slaBreaches} breach{slas.length > 0 ? 'es' : ''} • {slas.length} active SLAs
            </Text>
            {slas.length > 0 && (
              <Progress 
                value={((slas.length - slaBreaches) / slas.length) * 100} 
                size="sm" 
                mt="xs" 
                color={slaBreaches === 0 ? "green" : "red"} 
              />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Cost Optimization</Text>
              <IconCurrencyDollar size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              ${(totalPotentialSavings / 1000).toFixed(1)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {costOptimizations.length} pending recommendations
            </Text>
            {costOptimizations.length > 0 && (
              <Progress 
                value={Math.min((totalPotentialSavings / 10000) * 100, 100)} 
                size="sm" 
                mt="xs" 
                color="yellow" 
              />
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Capacity Planning Alert */}
      {urgentCapacityActions > 0 && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Urgent Capacity Actions Required"
          color="orange"
        >
          <Text>
            <strong>{urgentCapacityActions}</strong> service{urgentCapacityActions > 1 ? 's require' : ' requires'} immediate capacity planning attention.
          </Text>
          <Button
            size="xs"
            variant="light"
            mt="xs"
            onClick={() => setActiveTab('capacity')}
          >
            Review Capacity Plans
          </Button>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'dashboard')}>
        <Tabs.List>
          <Tabs.Tab value="dashboard" leftSection={<IconActivity size={16} />}>
            Operations Dashboard
          </Tabs.Tab>
          <Tabs.Tab value="incidents" leftSection={<IconFileAlert size={16} />}>
            Incidents
            {activeIncidents.length > 0 && (
              <Badge size="sm" color="red" variant="filled" ml={8}>
                {activeIncidents.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="capacity" leftSection={<IconGauge size={16} />}>
            Capacity Planning
            {urgentCapacityActions > 0 && (
              <Badge size="sm" color="orange" variant="filled" ml={8}>
                {urgentCapacityActions}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="costs" leftSection={<IconCurrencyDollar size={16} />}>
            Cost Optimization
            {costOptimizations.length > 0 && (
              <Badge size="sm" color="yellow" variant="filled" ml={8}>
                {costOptimizations.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="slas" leftSection={<IconShield size={16} />}>
            SLA Management
            {slaBreaches > 0 && (
              <Badge size="sm" color="red" variant="filled" ml={8}>
                {slaBreaches}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="provisioning" leftSection={<IconPlus size={16} />}>
            Resource Provisioning
          </Tabs.Tab>
          <Tabs.Tab value="changes" leftSection={<IconSettings size={16} />}>
            Change Management
          </Tabs.Tab>
        </Tabs.List>

        {/* Operations Dashboard */}
        <Tabs.Panel value="dashboard" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Service Health Overview</Title>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    size="xs"
                    onClick={() => setActiveTab('services')}
                  >
                    Manage Services
                  </Button>
                </Group>
                <MantineTable
                  data={services}
                  loading={loading}
                  rowKey="id"
                  columns={[
                    { title: 'Service', dataIndex: 'service_name' },
                    { title: 'Provider', dataIndex: 'service_provider' },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (status: string) => (
                        <Badge
                          color={
                            status === 'operational' ? 'green' :
                            status === 'degraded' ? 'yellow' :
                            status === 'down' ? 'red' : 'gray'
                          }
                          variant="light"
                        >
                          {status.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      title: 'Uptime',
                      dataIndex: 'uptime_percent',
                      render: (v: number) => (
                        <Group gap="xs">
                          <Text fw={600} size="sm">{v?.toFixed(2) || 0}%</Text>
                          <Progress value={v || 0} size="sm" style={{ width: 60 }} />
                        </Group>
                      ),
                    },
                    {
                      title: 'Response Time',
                      dataIndex: 'response_time_ms',
                      render: (v: number) => (
                        <Text size="sm">{v || 0}ms</Text>
                      ),
                    },
                  ]}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={5} mb="md">Recent Incidents</Title>
                  {incidents.slice(0, 5).length === 0 ? (
                    <Text c="dimmed" size="sm">No recent incidents</Text>
                  ) : (
                    <Stack gap="xs">
                      {incidents.slice(0, 5).map((incident) => (
                        <Paper key={incident.id} p="xs" withBorder>
                          <Group justify="space-between" mb={4}>
                            <Text fw={600} size="sm">{incident.incident_number}</Text>
                            <Badge
                              size="xs"
                              color={
                                incident.severity === 'critical' ? 'red' :
                                incident.severity === 'high' ? 'orange' :
                                incident.severity === 'medium' ? 'yellow' : 'blue'
                              }
                            >
                              {incident.severity}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {incident.title}
                          </Text>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                  <Button
                    fullWidth
                    variant="light"
                    mt="md"
                    onClick={() => setActiveTab('incidents')}
                  >
                    View All Incidents
                  </Button>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Incident Management */}
        <Tabs.Panel value="incidents" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Incident Management</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  incidentForm.reset();
                  setIncidentModalOpened(true);
                }}
              >
                Create Incident
              </Button>
            </Group>
            <MantineTable
              data={incidents}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'Incident #', dataIndex: 'incident_number', render: (v: string) => <Text fw={600} style={{ fontFamily: 'monospace' }}>{v}</Text> },
                { title: 'Title', dataIndex: 'title' },
                {
                  title: 'Severity',
                  dataIndex: 'severity',
                  render: (severity: string) => (
                    <Badge
                      color={
                        severity === 'critical' ? 'red' :
                        severity === 'high' ? 'orange' :
                        severity === 'medium' ? 'yellow' : 'blue'
                      }
                      variant="light"
                    >
                      {severity.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge
                      color={
                        status === 'open' ? 'red' :
                        status === 'investigating' ? 'orange' :
                        status === 'resolved' ? 'green' : 'gray'
                      }
                      variant="light"
                    >
                      {status.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Detected',
                  dataIndex: 'detected_at',
                  render: (date: string) => dayjs(date).format('MMM D, YYYY HH:mm'),
                },
                {
                  title: 'SLA Breach',
                  dataIndex: 'sla_breach',
                  render: (breach: boolean) => breach ? (
                    <Badge color="red" variant="filled">BREACH</Badge>
                  ) : (
                    <Badge color="green" variant="light">OK</Badge>
                  ),
                },
                {
                  title: 'Actions',
                  dataIndex: 'actions',
                  render: (_: any, record: Incident) => (
                    <Group gap="xs">
                      <Tooltip label="View Details">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        {/* Capacity Planning */}
        <Tabs.Panel value="capacity" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Capacity Planning & Resource Management</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  capacityForm.reset();
                  setCapacityModalOpened(true);
                }}
              >
                Create Capacity Plan
              </Button>
            </Group>
            <MantineTable
              data={capacityPlans}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'Service', dataIndex: 'service_id' },
                { title: 'Resource Type', dataIndex: 'resource_type' },
                {
                  title: 'Utilization',
                  dataIndex: 'utilization_percent',
                  render: (util: number) => (
                    <Group gap="xs">
                      <Text fw={600}>{util?.toFixed(1) || 0}%</Text>
                      <Progress
                        value={util || 0}
                        size="sm"
                        color={util > 80 ? 'red' : util > 60 ? 'yellow' : 'green'}
                        style={{ width: 100 }}
                      />
                    </Group>
                  ),
                },
                {
                  title: 'Recommended Action',
                  dataIndex: 'recommended_action',
                  render: (action: string) => (
                    <Badge
                      color={
                        action === 'scale_up' || action === 'scale_out' ? 'orange' :
                        action === 'optimize' ? 'yellow' : 'blue'
                      }
                      variant="light"
                    >
                      {action.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Priority',
                  dataIndex: 'action_priority',
                  render: (priority: string) => (
                    <Badge
                      color={
                        priority === 'immediate' ? 'red' :
                        priority === 'urgent' ? 'orange' :
                        priority === 'planned' ? 'yellow' : 'blue'
                      }
                      variant="light"
                    >
                      {priority.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Estimated Cost',
                  dataIndex: 'estimated_cost',
                  render: (cost: number) => cost > 0 ? `$${cost.toLocaleString()}` : 'N/A',
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        {/* Cost Optimization */}
        <Tabs.Panel value="costs" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Cost Optimization Recommendations</Title>
                <MantineTable
                  data={costOptimizations}
                  loading={loading}
                  rowKey="id"
                  columns={[
                    { title: 'Resource Type', dataIndex: 'resource_type' },
                    { title: 'Optimization Type', dataIndex: 'optimization_type' },
                    {
                      title: 'Current Cost',
                      dataIndex: 'current_cost',
                      render: (cost: number) => `$${cost.toLocaleString()}`,
                    },
                    {
                      title: 'Potential Savings',
                      dataIndex: 'potential_savings',
                      render: (savings: number) => (
                        <Text fw={700} c="green">${savings.toLocaleString()}</Text>
                      ),
                    },
                    {
                      title: 'Savings %',
                      dataIndex: 'savings_percent',
                      render: (percent: number) => (
                        <Badge color="green" variant="light">
                          {percent.toFixed(1)}%
                        </Badge>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (status: string) => (
                        <Badge
                          color={status === 'pending' ? 'yellow' : status === 'approved' ? 'blue' : 'green'}
                          variant="light"
                        >
                          {status.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      title: 'Actions',
                      dataIndex: 'actions',
                      render: (_: any, record: CostOptimization) => (
                        <Group gap="xs">
                          <Tooltip label="Approve">
                            <ActionIcon variant="subtle" color="green">
                              <IconCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="View Details">
                            <ActionIcon variant="subtle" color="blue">
                              <IconInfoCircle size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    },
                  ]}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={5} mb="md">Optimization Summary</Title>
                <Stack gap="md">
                  <Paper p="md" withBorder>
                    <Text size="sm" c="dimmed">Total Potential Savings</Text>
                    <Text size="xl" fw={700} c="green">
                      ${totalPotentialSavings.toLocaleString()}
                    </Text>
                  </Paper>
                  <Paper p="md" withBorder>
                    <Text size="sm" c="dimmed">Pending Recommendations</Text>
                    <Text size="xl" fw={700}>
                      {costOptimizations.length}
                    </Text>
                  </Paper>
                  <Paper p="md" withBorder>
                    <Text size="sm" c="dimmed">Average Savings %</Text>
                    <Text size="xl" fw={700} c="green">
                      {costOptimizations.length > 0
                        ? (costOptimizations.reduce((sum, opt) => sum + opt.savings_percent, 0) / costOptimizations.length).toFixed(1)
                        : 0}%
                    </Text>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* SLA Management */}
        <Tabs.Panel value="slas" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>SLA Management & Compliance</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setSlaModalOpened(true)}
              >
                Create SLA
              </Button>
            </Group>
            <MantineTable
              data={slas}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'SLA Name', dataIndex: 'sla_name' },
                { title: 'Type', dataIndex: 'sla_type' },
                {
                  title: 'Target',
                  dataIndex: 'target_value',
                  render: (target: number, record: SLA) => (
                    <Text>{target}{record.sla_type === 'uptime' || record.sla_type === 'availability' ? '%' : record.sla_type === 'response_time' ? 'ms' : ''}</Text>
                  ),
                },
                {
                  title: 'Current',
                  dataIndex: 'current_value',
                  render: (current: number, record: SLA) => (
                    <Text fw={600}>{current}{record.sla_type === 'uptime' || record.sla_type === 'availability' ? '%' : record.sla_type === 'response_time' ? 'ms' : ''}</Text>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge
                      color={
                        status === 'meeting' ? 'green' :
                        status === 'at_risk' ? 'yellow' : 'red'
                      }
                      variant="light"
                    >
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Breach Count',
                  dataIndex: 'breach_count',
                  render: (count: number) => count > 0 ? (
                    <Badge color="red" variant="filled">{count}</Badge>
                  ) : (
                    <Badge color="green" variant="light">0</Badge>
                  ),
                },
                {
                  title: 'Actions',
                  dataIndex: 'actions',
                  render: (_: any, record: SLA) => (
                    <Group gap="xs">
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" color="blue">
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        {/* Resource Provisioning */}
        <Tabs.Panel value="provisioning" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Resource Provisioning Requests</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setProvisioningModalOpened(true)}
              >
                Request Provisioning
              </Button>
            </Group>
            <MantineTable
              data={provisioningRequests}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'Request #', dataIndex: 'request_number', render: (v: string) => <Text fw={600} style={{ fontFamily: 'monospace' }}>{v}</Text> },
                { title: 'Type', dataIndex: 'request_type' },
                { title: 'Resource Type', dataIndex: 'resource_type' },
                { title: 'Service', dataIndex: 'service_name' },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge
                      color={
                        status === 'pending' ? 'yellow' :
                        status === 'approved' ? 'blue' :
                        status === 'provisioning' ? 'orange' :
                        status === 'completed' ? 'green' : 'gray'
                      }
                      variant="light"
                    >
                      {status.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Estimated Cost',
                  dataIndex: 'estimated_cost',
                  render: (cost: number) => cost > 0 ? `$${cost.toLocaleString()}` : 'N/A',
                },
                {
                  title: 'Requested',
                  dataIndex: 'requested_at',
                  render: (date: string) => dayjs(date).format('MMM D, YYYY'),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        {/* Change Management */}
        <Tabs.Panel value="changes" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Change Management</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setChangeModalOpened(true)}
              >
                Create Change Request
              </Button>
            </Group>
            <MantineTable
              data={changes}
              loading={loading}
              rowKey="id"
              columns={[
                { title: 'Change #', dataIndex: 'change_number', render: (v: string) => <Text fw={600} style={{ fontFamily: 'monospace' }}>{v}</Text> },
                { title: 'Title', dataIndex: 'title' },
                {
                  title: 'Type',
                  dataIndex: 'change_type',
                  render: (type: string) => (
                    <Badge
                      color={
                        type === 'emergency' ? 'red' :
                        type === 'normal' ? 'blue' : 'gray'
                      }
                      variant="light"
                    >
                      {type.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge
                      color={
                        status === 'approved' ? 'green' :
                        status === 'in_progress' ? 'orange' :
                        status === 'completed' ? 'blue' : 'gray'
                      }
                      variant="light"
                    >
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Risk',
                  dataIndex: 'risk_assessment',
                  render: (risk: string) => (
                    <Badge
                      color={
                        risk === 'critical' ? 'red' :
                        risk === 'high' ? 'orange' :
                        risk === 'medium' ? 'yellow' : 'blue'
                      }
                      variant="light"
                    >
                      {risk.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  title: 'Planned Start',
                  dataIndex: 'planned_start',
                  render: (date: string) => dayjs(date).format('MMM D, YYYY HH:mm'),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Incident Creation Modal */}
      <Modal
        opened={incidentModalOpened}
        onClose={() => setIncidentModalOpened(false)}
        title="Create Incident"
        size="lg"
      >
        <form onSubmit={incidentForm.onSubmit(handleCreateIncident)}>
          <Stack gap="md">
            <TextInput
              label="Incident Title"
              placeholder="Service degradation detected"
              required
              {...incidentForm.getInputProps('title')}
            />
            <Textarea
              label="Description"
              placeholder="Detailed description of the incident..."
              required
              minRows={4}
              {...incidentForm.getInputProps('description')}
            />
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Severity"
                  required
                  data={[
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                  {...incidentForm.getInputProps('severity')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Priority"
                  required
                  data={[
                    { value: 'p0', label: 'P0 - Critical' },
                    { value: 'p1', label: 'P1 - High' },
                    { value: 'p2', label: 'P2 - Medium' },
                    { value: 'p3', label: 'P3 - Low' },
                    { value: 'p4', label: 'P4 - Info' },
                  ]}
                  {...incidentForm.getInputProps('priority')}
                />
              </Grid.Col>
            </Grid>
            <MultiSelect
              label="Affected Services"
              placeholder="Select affected services"
              data={services.map(s => ({ value: s.id, label: s.service_name }))}
              {...incidentForm.getInputProps('affected_services')}
            />
            <Textarea
              label="Service Impact"
              placeholder="Describe the impact on services..."
              minRows={2}
              {...incidentForm.getInputProps('service_impact')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setIncidentModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Incident</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Capacity Plan Modal */}
      <Modal
        opened={capacityModalOpened}
        onClose={() => setCapacityModalOpened(false)}
        title="Create Capacity Plan"
        size="lg"
      >
        <form onSubmit={capacityForm.onSubmit(handleCreateCapacityPlan)}>
          <Stack gap="md">
            <Select
              label="Service"
              required
              data={services.map(s => ({ value: s.id, label: s.service_name }))}
              {...capacityForm.getInputProps('service_id')}
            />
            <Select
              label="Resource Type"
              required
              data={[
                { value: 'compute', label: 'Compute' },
                { value: 'storage', label: 'Storage' },
                { value: 'network', label: 'Network' },
                { value: 'database', label: 'Database' },
              ]}
              {...capacityForm.getInputProps('resource_type')}
            />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Current Capacity"
                  required
                  min={0}
                  {...capacityForm.getInputProps('current_capacity')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Current Utilization"
                  required
                  min={0}
                  {...capacityForm.getInputProps('current_utilization')}
                />
              </Grid.Col>
            </Grid>
            <NumberInput
              label="Projected Growth Rate (% per month)"
              min={0}
              max={100}
              {...capacityForm.getInputProps('projected_growth_rate')}
            />
            <Select
              label="Recommended Action"
              required
              data={[
                { value: 'scale_up', label: 'Scale Up' },
                { value: 'scale_out', label: 'Scale Out' },
                { value: 'optimize', label: 'Optimize' },
                { value: 'monitor', label: 'Monitor' },
                { value: 'no_action', label: 'No Action' },
              ]}
              {...capacityForm.getInputProps('recommended_action')}
            />
            <Select
              label="Action Priority"
              required
              data={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'planned', label: 'Planned' },
                { value: 'monitor', label: 'Monitor' },
              ]}
              {...capacityForm.getInputProps('action_priority')}
            />
            <NumberInput
              label="Estimated Cost"
              min={0}
              {...capacityForm.getInputProps('estimated_cost')}
            />
            <Textarea
              label="Notes"
              minRows={3}
              {...capacityForm.getInputProps('notes')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setCapacityModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Capacity Plan</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Provisioning Request Modal */}
      <Modal
        opened={provisioningModalOpened}
        onClose={() => setProvisioningModalOpened(false)}
        title="Create Provisioning Request"
        size="lg"
      >
        <form onSubmit={provisioningForm.onSubmit(handleCreateProvisioningRequest)}>
          <Stack gap="md">
            <Select
              label="Request Type"
              required
              data={[
                { value: 'provision', label: 'Provision New Resource' },
                { value: 'scale', label: 'Scale Existing Resource' },
                { value: 'decommission', label: 'Decommission Resource' },
                { value: 'modify', label: 'Modify Resource' },
              ]}
              {...provisioningForm.getInputProps('request_type')}
            />
            <Select
              label="Resource Type"
              required
              data={[
                { value: 'compute', label: 'Compute' },
                { value: 'storage', label: 'Storage' },
                { value: 'database', label: 'Database' },
                { value: 'network', label: 'Network' },
                { value: 'service', label: 'Service' },
              ]}
              {...provisioningForm.getInputProps('resource_type')}
            />
            <TextInput
              label="Provider"
              placeholder="AWS, GCP, Azure, Supabase, etc."
              required
              {...provisioningForm.getInputProps('provider')}
            />
            <TextInput
              label="Service Name"
              placeholder="Production API Server"
              required
              {...provisioningForm.getInputProps('service_name')}
            />
            <Textarea
              label="Specifications (JSON)"
              placeholder='{"instance_type": "t3.large", "region": "us-east-1", ...}'
              minRows={4}
              required
              {...provisioningForm.getInputProps('specifications')}
            />
            <NumberInput
              label="Estimated Monthly Cost"
              min={0}
              {...provisioningForm.getInputProps('estimated_cost')}
            />
            <Textarea
              label="Justification"
              placeholder="Business justification for this resource..."
              required
              minRows={3}
              {...provisioningForm.getInputProps('justification')}
            />
            <Select
              label="Priority"
              data={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              {...provisioningForm.getInputProps('priority')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => {
                setProvisioningModalOpened(false);
                provisioningForm.reset();
              }}>
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Change Management Modal - Placeholder */}
      <Modal
        opened={changeModalOpened}
        onClose={() => setChangeModalOpened(false)}
        title="Create Change Request"
        size="lg"
      >
        <Text c="dimmed">Change management form coming soon...</Text>
      </Modal>

      {/* SLA Management Modal - Placeholder */}
      <Modal
        opened={slaModalOpened}
        onClose={() => setSlaModalOpened(false)}
        title="Create SLA"
        size="lg"
      >
        <Text c="dimmed">SLA creation form coming soon...</Text>
      </Modal>
    </Stack>
  );
};
