import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PortalLayout, PageHeader, DataTable, DetailDrawer, FilterBar, StatusBadge, EmptyState, ErrorState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { SidebarItem, User, Filter } from '@/components/tpi';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconRocket, IconList, IconTimeline, IconChartBar, IconUsers, IconSettings } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';

const featureColumns: ColumnDef<any>[] = [
  {
    id: 'name',
    header: 'Feature Name',
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'released' ? 'success' : value === 'in-progress' ? 'info' : value === 'testing' ? 'warning' : 'neutral'}
        label={value.replace('-', ' ')}
        size="sm"
      />
    ),
  },
  {
    id: 'priority',
    header: 'Priority',
    accessor: (row) => row.priority,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'critical' ? 'error' : value === 'high' ? 'warning' : 'info'}
        label={value}
        size="sm"
      />
    ),
  },
  {
    id: 'assigned_to',
    header: 'Assigned To',
    accessor: (row) => row.assigned_to ? 'User' : 'Unassigned',
    sortable: true,
  },
  {
    id: 'target_date',
    header: 'Target Date',
    accessor: (row) => row.target_date,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
  },
];

export default function ProductCommandCenter() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  
  // Determine active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/roadmap')) return 'roadmap';
    if (path.includes('/requests')) return 'requests';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/stakeholders')) return 'stakeholders';
    if (path.includes('/settings')) return 'settings';
    return 'features';
  };
  const [activeSection, setActiveSection] = useState<string>(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  const [features, setFeatures] = useState<any[]>([]);
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

  // Fetch features
  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('product_features')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setFeatures(data || []);
    } catch (err: any) {
      console.error('Error fetching features:', err);
      setError(err.message || 'Failed to load features');
      toast.error('Failed to load features', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      fetchFeatures();
    }
  }, [isAuthorized, fetchFeatures]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'features',
      label: 'Feature Tracking',
      icon: IconList,
      path: '/product-command/features',
    },
    {
      id: 'roadmap',
      label: 'Product Roadmap',
      icon: IconTimeline,
      path: '/product-command/roadmap',
    },
    {
      id: 'requests',
      label: 'Feature Requests',
      icon: IconRocket,
      path: '/product-command/requests',
    },
    {
      id: 'analytics',
      label: 'Product Analytics',
      icon: IconChartBar,
      path: '/product-command/analytics',
    },
    {
      id: 'stakeholders',
      label: 'Stakeholders',
      icon: IconUsers,
      path: '/product-command/stakeholders',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconSettings,
      path: '/product-command/settings',
    },
  ];

  const userInfo: User = {
    id: user?.id || '',
    email: user?.email || '',
    name: execUser?.title || 'Product Manager',
    role: 'Product',
    initials: execUser?.title?.split(' ').map(n => n[0]).join('') || 'PM',
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'features':
        return (
          <Stack gap="md">
            <PageHeader
              title="Feature Tracking"
              description="Track product features from planning to release"
              actions={<Button leftSection={<IconPlus size={16} />}>New Feature</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : error ? (
              <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchFeatures }} />
            ) : features.length === 0 ? (
              <EmptyState
                title="No features found"
                description="Create your first product feature to get started"
              />
            ) : (
              <DataTable
                data={features}
                columns={featureColumns}
                onRowClick={(row) => setSelectedFeature(row.id)}
                exportable
                onExport={(format) => console.log('Export as', format)}
              />
            )}
          </Stack>
        );
      case 'roadmap':
        return (
          <Stack gap="md">
            <PageHeader
              title="Product Roadmap"
              description="Strategic product planning and timeline"
            />
            <EmptyState
              title="Roadmap view coming soon"
              description="Product roadmap visualization is under development"
            />
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
    return <ErrorState message="You do not have access to the Product Command Center" />;
  }

  return (
    <PortalLayout
      portalName="Product Command Center"
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
        title="Product Command Center"
        description="Product management, feature tracking, and roadmap planning"
      />
      {renderContent()}
      <DetailDrawer
        open={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        title="Feature Details"
        entityId={selectedFeature || undefined}
      >
        <Stack gap="md">
          <Text>Feature details will be displayed here</Text>
        </Stack>
      </DetailDrawer>
    </PortalLayout>
  );
}

