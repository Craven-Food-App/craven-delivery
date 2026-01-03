import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PortalLayout, PageHeader, KpiCard, DataTable, DetailDrawer, StatusBadge, EmptyState, ErrorState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { SidebarItem, User } from '@/components/tpi';
import { Button, Group, Stack, Grid, Text } from '@mantine/core';
import { IconPlus, IconServer, IconCloud, IconActivity, IconSettings, IconDatabase, IconNetwork } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';

const serviceColumns: ColumnDef<any>[] = [
  {
    id: 'service_name',
    header: 'Service Name',
    accessor: (row) => row.service_name,
    sortable: true,
  },
  {
    id: 'service_provider',
    header: 'Provider',
    accessor: (row) => row.service_provider || 'N/A',
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'operational' ? 'success' : value === 'degraded' ? 'warning' : 'error'}
        label={value}
        size="sm"
      />
    ),
  },
  {
    id: 'uptime_percent',
    header: 'Uptime %',
    accessor: (row) => row.uptime_percent,
    sortable: true,
    render: (value) => value ? `${Number(value).toFixed(2)}%` : 'N/A',
  },
  {
    id: 'response_time_ms',
    header: 'Response Time (ms)',
    accessor: (row) => row.response_time_ms,
    sortable: true,
    render: (value) => value ? `${value}ms` : 'N/A',
  },
  {
    id: 'last_check',
    header: 'Last Check',
    accessor: (row) => row.last_check,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleString() : 'N/A',
  },
];

function PlatformInfrastructureHubContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  
  // Determine active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/services')) return 'services';
    if (path.includes('/deployments')) return 'deployments';
    if (path.includes('/infrastructure')) return 'infrastructure';
    if (path.includes('/databases')) return 'databases';
    if (path.includes('/settings')) return 'settings';
    return 'overview';
  };
  const [activeSection, setActiveSection] = useState<string>(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleBackToHub = useCallback(() => {
    navigate('/hub');
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut, navigate]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('it_infrastructure')
        .select('*')
        .order('service_name', { ascending: true });
      
      if (fetchError) throw fetchError;
      setServices(data || []);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message || 'Failed to load services');
      toast.error('Failed to load services', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      fetchServices();
    }
  }, [isAuthorized, fetchServices]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: IconActivity,
      path: '/platform-infrastructure/overview',
    },
    {
      id: 'services',
      label: 'Services',
      icon: IconServer,
      path: '/platform-infrastructure/services',
    },
    {
      id: 'deployments',
      label: 'Deployments',
      icon: IconCloud,
      path: '/platform-infrastructure/deployments',
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      icon: IconNetwork,
      path: '/platform-infrastructure/infrastructure',
    },
    {
      id: 'databases',
      label: 'Databases',
      icon: IconDatabase,
      path: '/platform-infrastructure/databases',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconSettings,
      path: '/platform-infrastructure/settings',
    },
  ];

  const userInfo: User = {
    id: user?.id || '',
    email: user?.email || '',
    name: execUser?.title || 'Platform Engineer',
    role: 'Platform & Infrastructure',
    initials: execUser?.title?.split(' ').map(n => n[0]).join('') || 'PI',
  };

  const calculateMetrics = () => {
    if (services.length === 0) return { total: 0, avgUptime: 0, avgResponseTime: 0 };
    
    const avgUptime = services.reduce((sum, s) => sum + (Number(s.uptime_percent) || 0), 0) / services.length;
    const avgResponseTime = services.reduce((sum, s) => sum + (Number(s.response_time_ms) || 0), 0) / services.length;
    
    return {
      total: services.length,
      avgUptime: avgUptime.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(0),
    };
  };

  const renderContent = () => {
    if (error) {
      return <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchServices }} />;
    }

    const metrics = calculateMetrics();

    switch (activeSection) {
      case 'overview':
        return (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <KpiCard
                  label="Total Services"
                  value={metrics.total}
                  format="number"
                  status="success"
                  loading={loading}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <KpiCard
                  label="Avg Uptime"
                  value={Number(metrics.avgUptime)}
                  format="percentage"
                  status="success"
                  loading={loading}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <KpiCard
                  label="Avg Response Time"
                  value={Number(metrics.avgResponseTime)}
                  format="duration"
                  status="info"
                  loading={loading}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <KpiCard
                  label="Operational Services"
                  value={services.filter(s => s.status === 'operational').length}
                  format="number"
                  status="info"
                  loading={loading}
                />
              </Grid.Col>
            </Grid>
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : services.length === 0 ? (
              <EmptyState
                title="No services found"
                description="Add infrastructure services to start monitoring"
              />
            ) : (
              <DataTable
                data={services}
                columns={serviceColumns}
                onRowClick={(row) => setSelectedService(row.id)}
                density="compact"
              />
            )}
          </Stack>
        );
      case 'services':
        return (
          <Stack gap="md">
            <PageHeader
              title="Services"
              description="Monitor service health and performance"
              actions={<Button leftSection={<IconPlus size={16} />}>Add Service</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : services.length === 0 ? (
              <EmptyState
                title="No services found"
                description="Add infrastructure services to start monitoring"
              />
            ) : (
              <DataTable
                data={services}
                columns={serviceColumns}
                onRowClick={(row) => setSelectedService(row.id)}
                exportable
                onExport={(format) => console.log('Export as', format)}
              />
            )}
          </Stack>
        );
      default:
        return <EmptyState title="Section coming soon" description="This section is under development" />;
    }
  };

  if (authLoading) {
    return <SkeletonLoader variant="card" count={5} />;
  }

  if (!isAuthorized) {
    return <ErrorState message="You do not have access to the Platform & Infrastructure Hub" />;
  }

  return (
    <PortalLayout
      portalName="Platform & Infrastructure Hub"
      sidebarItems={sidebarItems}
      user={userInfo}
      onUserMenuClick={(action) => {
        if (action === 'logout') handleSignOut();
      }}
      onSearch={(query) => {
        console.log('Search:', query);
      }}
    >
      <PageHeader
        title="Platform & Infrastructure Hub"
        description="Infrastructure monitoring, service health, and deployment management"
      />
      {renderContent()}
      <DetailDrawer
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        title="Service Details"
        entityId={selectedService || undefined}
      >
        <Stack gap="md">
          <Text>Service details will be displayed here</Text>
        </Stack>
      </DetailDrawer>
    </PortalLayout>
  );
}

