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
} from '@mantine/core';
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
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';
import { useForm } from '@mantine/form';

interface Service {
  id: string;
  service_name: string;
  service_provider: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime_percent: number;
  response_time_ms: number;
  region?: string;
  cost_per_month?: number;
}

interface CloudResource {
  provider: string;
  service: string;
  region: string;
  cost: number;
  utilization: number;
  status: string;
}

export const AdvancedInfrastructureManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [cloudResources, setCloudResources] = useState<CloudResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('services');
  const [serviceModalOpened, setServiceModalOpened] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const toast = useToast();

  const serviceForm = useForm({
    initialValues: {
      service_name: '',
      service_provider: '',
      status: 'operational',
      uptime_percent: 99.9,
      response_time_ms: 45,
      region: '',
      cost_per_month: 0,
    },
  });

  useEffect(() => {
    fetchInfrastructureData();
  }, []);

  const fetchInfrastructureData = async () => {
    setLoading(true);
    try {
      // Try to fetch from it_infrastructure table, but handle gracefully if it doesn't exist
      const { data: servicesData, error: servicesError } = await supabase
        .from('it_infrastructure')
        .select('*')
        .order('created_at', { ascending: false });

      if (servicesError) {
        // If table doesn't exist or RLS blocks access, use empty array
        if (servicesError.code === 'PGRST116' || servicesError.message?.includes('does not exist') || servicesError.message?.includes('permission denied')) {
          console.warn('it_infrastructure table not found or not accessible, using empty services array');
          setServices([]);
        } else {
          throw servicesError;
        }
      } else {
        setServices((servicesData || []) as Service[]);
      }

      // Mock cloud resources data
      setCloudResources([
        {
          provider: 'Supabase',
          service: 'Database',
          region: 'US East',
          cost: 2500,
          utilization: 65,
          status: 'operational',
        },
        {
          provider: 'Supabase',
          service: 'Storage',
          region: 'US East',
          cost: 450,
          utilization: 42,
          status: 'operational',
        },
        {
          provider: 'Vercel',
          service: 'Hosting',
          region: 'Global',
          cost: 200,
          utilization: 85,
          status: 'operational',
        },
      ]);
    } catch (error: any) {
      console.error('Error fetching infrastructure data:', error);
      // Don't show error if it's just a missing table - use empty data instead
      if (error?.code === 'PGRST116' || error?.message?.includes('does not exist') || error?.message?.includes('permission denied')) {
        console.warn('Infrastructure table not available, using empty data');
        setServices([]);
      } else {
        toast.error(error?.message || 'Failed to load infrastructure data', 'Error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    setEditingService(null);
    serviceForm.reset();
    setServiceModalOpened(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    serviceForm.setValues(service);
    setServiceModalOpened(true);
  };

  const handleDeleteService = async (id: string) => {
    modals.openConfirmModal({
      title: 'Delete Service',
      children: <Text size="sm">Are you sure you want to delete this service? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('it_infrastructure').delete().eq('id', id);
          if (error) {
            // Handle case where table doesn't exist
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
              toast.error('Infrastructure table not available', 'Error');
              return;
            }
            throw error;
          }
          toast.success('Service deleted successfully', 'Success');
          fetchInfrastructureData();
        } catch (error: any) {
          toast.error(error.message || 'Failed to delete service', 'Error');
        }
      },
    });
  };

  const handleSubmitService = async (values: any) => {
    try {
      if (editingService) {
        const { error } = await supabase
          .from('it_infrastructure')
          .update(values)
          .eq('id', editingService.id);
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            toast.error('Infrastructure table not available. Please create the table first.', 'Error');
            return;
          }
          throw error;
        }
        toast.success('Service updated successfully', 'Success');
      } else {
        const { error } = await supabase.from('it_infrastructure').insert(values);
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            toast.error('Infrastructure table not available. Please create the table first.', 'Error');
            return;
          }
          throw error;
        }
        toast.success('Service created successfully', 'Success');
      }
      setServiceModalOpened(false);
      serviceForm.reset();
      fetchInfrastructureData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save service', 'Error');
    }
  };

  const totalCost = cloudResources.reduce((sum, r) => sum + r.cost, 0);
  const avgUptime = services.length > 0
    ? services.reduce((sum, s) => sum + (s.uptime_percent || 0), 0) / services.length
    : 99.9;
  const operationalServices = services.filter(s => s.status === 'operational').length;

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Advanced Infrastructure Management</Title>
          <Text c="dimmed" size="sm">
            Comprehensive infrastructure monitoring, cloud resource management, and cost optimization
          </Text>
        </Box>
        <Badge size="lg" color="blue" variant="light" leftSection={<IconCloud size={16} />}>
          Infrastructure Ops
        </Badge>
      </Group>

      {/* Key Infrastructure Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Avg Uptime</Text>
              <IconServer size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              {avgUptime.toFixed(2)}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Across {services.length} services
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Operational Services</Text>
              <IconCheck size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              {operationalServices}/{services.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Services online
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Monthly Infrastructure Cost</Text>
              <IconTrendingUp size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              ${(totalCost / 1000).toFixed(1)}K
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Cloud resources
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Resource Utilization</Text>
              <IconTrendingDown size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              {cloudResources.length > 0
                ? Math.round(cloudResources.reduce((sum, r) => sum + r.utilization, 0) / cloudResources.length)
                : 0}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Average utilization
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'services')}>
        <Tabs.List>
          <Tabs.Tab value="services" leftSection={<IconServer size={16} />}>
            Services
          </Tabs.Tab>
          <Tabs.Tab value="cloud" leftSection={<IconCloud size={16} />}>
            Cloud Resources
          </Tabs.Tab>
          <Tabs.Tab value="costs" leftSection={<IconTrendingUp size={16} />}>
            Cost Analysis
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="services" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Service Health</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={handleCreateService}>
                Add Service
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
                        status === 'operational'
                          ? 'green'
                          : status === 'degraded'
                          ? 'yellow'
                          : status === 'down'
                          ? 'red'
                          : 'gray'
                      }
                      variant="light"
                    >
                      {status}
                    </Badge>
                  ),
                },
                {
                  title: 'Uptime',
                  dataIndex: 'uptime_percent',
                  render: (v: number) => (
                    <Group gap="xs">
                      <Text fw={600}>{v?.toFixed(2) || 0}%</Text>
                      <Progress value={v || 0} size="sm" style={{ width: 60 }} />
                    </Group>
                  ),
                },
                { title: 'Response Time', dataIndex: 'response_time_ms', render: (v: number) => `${v || 0}ms` },
                {
                  title: 'Actions',
                  dataIndex: 'actions',
                  render: (_: any, record: Service) => (
                    <Group gap="xs">
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" color="blue" onClick={() => handleEditService(record)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteService(record.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="cloud" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Cloud Resource Management
            </Title>
            <MantineTable
              data={cloudResources}
              loading={loading}
              rowKey={(r: any) => `${r.provider}-${r.service}`}
              columns={[
                { title: 'Provider', dataIndex: 'provider' },
                { title: 'Service', dataIndex: 'service' },
                { title: 'Region', dataIndex: 'region' },
                {
                  title: 'Cost/Month',
                  dataIndex: 'cost',
                  render: (cost: number) => `$${cost.toLocaleString()}`,
                },
                {
                  title: 'Utilization',
                  dataIndex: 'utilization',
                  render: (util: number) => (
                    <Group gap="xs">
                      <Text fw={600}>{util}%</Text>
                      <Progress value={util} size="sm" color={util > 80 ? 'red' : util > 60 ? 'yellow' : 'green'} style={{ width: 100 }} />
                    </Group>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => (
                    <Badge color={status === 'operational' ? 'green' : 'red'} variant="light">
                      {status}
                    </Badge>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="costs" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  6-Month Cost Trend
                </Title>
                <FuturisticChart
                  data={Array.from({ length: 6 }, (_, i) => {
                    const month = new Date();
                    month.setMonth(month.getMonth() - (5 - i));
                    return {
                      month: month.toLocaleString('default', { month: 'short' }),
                      Cost: totalCost * (0.9 + Math.random() * 0.2),
                      Budget: totalCost * 1.1,
                    };
                  })}
                  type="composed"
                  title=""
                  height={300}
                  colors={['#3b82f6', '#ef4444']}
                  dataKeys={{ revenue: 'Cost', profit: 'Budget' }}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Cost Breakdown
                </Title>
                <Stack gap="md">
                  {cloudResources.map((resource, idx) => (
                    <Paper key={idx} p="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600}>{resource.service}</Text>
                        <Text fw={700}>${resource.cost.toLocaleString()}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {resource.provider} • {resource.region}
                      </Text>
                    </Paper>
                  ))}
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={700} size="lg">Total</Text>
                    <Text fw={700} size="lg" c="blue">
                      ${totalCost.toLocaleString()}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={serviceModalOpened}
        onClose={() => setServiceModalOpened(false)}
        title={editingService ? 'Edit Service' : 'Add Service'}
      >
        <form onSubmit={serviceForm.onSubmit(handleSubmitService)}>
          <Stack gap="md">
            <TextInput
              label="Service Name"
              placeholder="API Gateway"
              required
              {...serviceForm.getInputProps('service_name')}
            />
            <TextInput
              label="Provider"
              placeholder="Supabase"
              required
              {...serviceForm.getInputProps('service_provider')}
            />
            <Select
              label="Status"
              required
              data={[
                { value: 'operational', label: 'Operational' },
                { value: 'degraded', label: 'Degraded' },
                { value: 'down', label: 'Down' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
              {...serviceForm.getInputProps('status')}
            />
            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Uptime %"
                  min={0}
                  max={100}
                  decimalScale={2}
                  {...serviceForm.getInputProps('uptime_percent')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Response Time (ms)"
                  min={0}
                  {...serviceForm.getInputProps('response_time_ms')}
                />
              </Grid.Col>
            </Grid>
            <TextInput label="Region" placeholder="US East" {...serviceForm.getInputProps('region')} />
            <NumberInput
              label="Cost per Month ($)"
              min={0}
              {...serviceForm.getInputProps('cost_per_month')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setServiceModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

