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
  const [costHistory, setCostHistory] = useState<any[]>([]);
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
    },
  });

  useEffect(() => {
    fetchInfrastructureData();
  }, []);

  const fetchInfrastructureData = async () => {
    setLoading(true);
    try {
      // Verify user has access
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      // Fetch services from it_infrastructure table
      const { data: servicesData, error: servicesError } = await supabase
        .from('it_infrastructure')
        .select('*')
        .order('last_check', { ascending: false });

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        if (servicesError.code === 'PGRST116' || servicesError.message?.includes('does not exist') || servicesError.message?.includes('permission denied')) {
          console.warn('it_infrastructure table not found or not accessible, using empty services array');
          setServices([]);
        } else {
          toast.error(`Failed to load services: ${servicesError.message}`, 'Error');
          throw servicesError;
        }
      } else {
        console.log('Fetched services:', servicesData);
        console.log('Number of services fetched:', servicesData?.length || 0);
        const servicesArray = (servicesData || []) as Service[];
        setServices(servicesArray);
        console.log('Services state set to:', servicesArray);
      }

      // Fetch real cloud resources from tech_vendors table
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('tech_vendors')
        .select(`
          *,
          category:tech_cost_categories(name)
        `)
        .eq('is_active', true)
        .order('monthly_cost', { ascending: false });

      if (vendorsError) {
        if (vendorsError.code === 'PGRST116' || vendorsError.message?.includes('does not exist')) {
          console.warn('tech_vendors table not found, using empty cloud resources');
          setCloudResources([]);
        } else {
          console.error('Error fetching cloud resources:', vendorsError);
          setCloudResources([]);
        }
      } else {
        // Transform vendors data to cloud resources format
        // ONLY include resources with real region and utilization data - NO PLACEHOLDER DEFAULTS
        const resources: CloudResource[] = (vendorsData || [])
          .filter((vendor: any) => {
            // Only include vendors that have real utilization data in metadata
            const hasUtilization = vendor.metadata?.utilization !== undefined || vendor.metadata?.usage_percent !== undefined;
            const hasRegion = vendor.metadata?.region || vendor.metadata?.location;
            // Require at least utilization OR region to be present (prefer both)
            return hasUtilization || hasRegion;
          })
          .map((vendor: any) => {
            // Only use real data from metadata - NO DEFAULTS
            const region = vendor.metadata?.region || vendor.metadata?.location || null;
            const utilization = vendor.metadata?.utilization !== undefined 
              ? vendor.metadata.utilization 
              : vendor.metadata?.usage_percent !== undefined 
                ? vendor.metadata.usage_percent 
                : null;
            
            return {
              provider: vendor.name,
              service: vendor.service_name,
              region: region || 'N/A', // Show N/A only if truly no data, but filter out vendors without any metadata
              cost: Number(vendor.monthly_cost) || 0,
              utilization: utilization !== null ? Number(utilization) : null,
              status: vendor.is_active ? 'operational' : 'inactive',
            };
          })
          .filter((resource: CloudResource) => {
            // Final filter: only show resources that have at least utilization OR region data
            return resource.utilization !== null || (resource.region && resource.region !== 'N/A');
          });
        
        setCloudResources(resources);
      }

      // Fetch cost history from tech_actual_costs AND real budgets from tech_budgets
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: costsData } = await supabase
        .from('tech_actual_costs')
        .select('period, amount')
        .order('period', { ascending: true })
        .limit(6);
      
      // Fetch real budget data from tech_budgets table
      const { data: budgetsData } = await supabase
        .from('tech_budgets')
        .select('period, budgeted_amount')
        .order('period', { ascending: true })
        .limit(6);
      
      // Combine actual costs with real budgets - only show periods with real data
      if (costsData || budgetsData) {
        const allPeriods = new Set([
          ...(costsData || []).map((c: any) => c.period),
          ...(budgetsData || []).map((b: any) => b.period)
        ]);
        
        const combinedData = Array.from(allPeriods).map(period => {
          const cost = (costsData || []).find((c: any) => c.period === period);
          const budget = (budgetsData || []).find((b: any) => b.period === period);
          
          return {
            period,
            amount: cost ? Number(cost.amount) : null,
            budgeted_amount: budget ? Number(budget.budgeted_amount) : null,
          };
        }).filter(item => item.amount !== null || item.budgeted_amount !== null); // Only include periods with at least one real value
        
        setCostHistory(combinedData);
      } else {
        setCostHistory([]);
      }
    } catch (error: any) {
      console.error('Error fetching infrastructure data:', error);
      if (error?.code === 'PGRST116' || error?.message?.includes('does not exist') || error?.message?.includes('permission denied')) {
        console.warn('Infrastructure table not available, using empty data');
        setServices([]);
        setCloudResources([]);
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
      // Only include fields that exist in the it_infrastructure schema
      const allowedFields = ['service_name', 'service_provider', 'status', 'uptime_percent', 'response_time_ms', 'metadata'];
      const filteredValues: any = {};
      
      allowedFields.forEach(field => {
        if (values[field] !== undefined) {
          filteredValues[field] = values[field];
        }
      });

      if (editingService) {
        const { error } = await supabase
          .from('it_infrastructure')
          .update(filteredValues)
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
        const { data: newService, error } = await supabase
          .from('it_infrastructure')
          .insert(filteredValues)
          .select()
          .single();
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            toast.error('Infrastructure table not available. Please create the table first.', 'Error');
            return;
          }
          throw error;
        }
        toast.success('Service created successfully', 'Success');
        console.log('New service created:', newService);
        // Close modal first
        setServiceModalOpened(false);
        serviceForm.reset();
        // Always refetch to ensure we have the latest data from the server
        await fetchInfrastructureData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save service', 'Error');
    }
  };

  const totalCost = cloudResources.reduce((sum, r) => sum + r.cost, 0);
  const avgUptime = services.length > 0
    ? services.reduce((sum, s) => sum + (s.uptime_percent || 0), 0) / services.length
    : 0;
  const operationalServices = services.filter(s => s.status === 'operational').length;
  // Only calculate average from resources with real utilization data
  const resourcesWithUtilization = cloudResources.filter(r => r.utilization !== null);
  const avgUtilization = resourcesWithUtilization.length > 0
    ? Math.round(resourcesWithUtilization.reduce((sum, r) => sum + (r.utilization || 0), 0) / resourcesWithUtilization.length)
    : null;

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
            <Text size="xl" fw={700} c={avgUptime >= 99.9 ? "green" : avgUptime >= 99 ? "yellow" : "red"}>
              {services.length > 0 ? avgUptime.toFixed(2) : '0.00'}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Across {services.length} {services.length === 1 ? 'service' : 'services'}
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
              {avgUtilization !== null ? `${avgUtilization}%` : 'N/A'}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {avgUtilization !== null ? 'Average utilization' : 'No utilization data'}
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
            {cloudResources.length === 0 && !loading ? (
              <Text c="dimmed" ta="center" py="xl">
                No cloud resources with real utilization/region data available. 
                Add vendors with metadata (region, utilization) to see cloud resources here.
              </Text>
            ) : (
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
                  render: (util: number | null) => {
                    if (util === null || util === undefined) {
                      return <Text c="dimmed" size="sm">No data</Text>;
                    }
                    return (
                      <Group gap="xs">
                        <Text fw={600}>{util}%</Text>
                        <Progress value={util} size="sm" color={util > 80 ? 'red' : util > 60 ? 'yellow' : 'green'} style={{ width: 100 }} />
                      </Group>
                    );
                  },
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
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="costs" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  6-Month Cost Trend
                </Title>
                {costHistory.length > 0 ? (
                  <FuturisticChart
                    data={costHistory.map((item: any) => {
                      const monthLabel = new Date(item.period + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
                      const chartData: any = { month: monthLabel };
                      
                      // Only include Cost if we have real actual cost data
                      if (item.amount !== null) {
                        chartData.Cost = Number(item.amount);
                      }
                      
                      // Only include Budget if we have real budget data
                      if (item.budgeted_amount !== null) {
                        chartData.Budget = Number(item.budgeted_amount);
                      }
                      
                      return chartData;
                    })}
                    type="composed"
                    title=""
                    height={300}
                    colors={['#3b82f6', '#ef4444']}
                    dataKeys={{ revenue: 'Cost', profit: 'Budget' }}
                  />
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No cost history data available. Add actual costs and budgets to see trends.
                  </Text>
                )}
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

