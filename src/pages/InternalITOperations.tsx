import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PortalLayout, PageHeader, DataTable, DetailDrawer, FilterBar, StatusBadge, EmptyState, ErrorState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { SidebarItem, User } from '@/components/tpi';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconHeadset, IconDeviceDesktop, IconTool, IconSettings, IconUsers } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';

const ticketColumns: ColumnDef<any>[] = [
  {
    id: 'ticket_number',
    header: 'Ticket #',
    accessor: (row) => row.ticket_number,
    sortable: true,
  },
  {
    id: 'subject',
    header: 'Subject',
    accessor: (row) => row.subject,
    sortable: true,
  },
  {
    id: 'category',
    header: 'Category',
    accessor: (row) => row.category,
    sortable: true,
  },
  {
    id: 'priority',
    header: 'Priority',
    accessor: (row) => row.priority,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'urgent' ? 'error' : value === 'high' ? 'warning' : 'info'}
        label={value}
        size="sm"
      />
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'resolved' || value === 'closed' ? 'success' : value === 'in_progress' ? 'info' : value === 'waiting_user' ? 'warning' : 'neutral'}
        label={value.replace('_', ' ')}
        size="sm"
      />
    ),
  },
  {
    id: 'created_at',
    header: 'Created',
    accessor: (row) => row.created_at,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
  },
];

const assetColumns: ColumnDef<any>[] = [
  {
    id: 'asset_name',
    header: 'Asset Name',
    accessor: (row) => row.asset_name,
    sortable: true,
  },
  {
    id: 'asset_type',
    header: 'Type',
    accessor: (row) => row.asset_type,
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'active' ? 'success' : value === 'maintenance' ? 'warning' : 'neutral'}
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
    id: 'purchase_date',
    header: 'Purchase Date',
    accessor: (row) => row.purchase_date,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
  },
];

export default function InternalITOperations() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // Determine active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/assets')) return 'assets';
    if (path.includes('/tooling')) return 'tooling';
    if (path.includes('/users')) return 'users';
    if (path.includes('/settings')) return 'settings';
    return 'help-desk';
  };
  const [activeSection, setActiveSection] = useState<string>(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
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

  // Fetch IT tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('it_help_desk_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
      toast.error('Failed to load tickets', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('it_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setAssets(data || []);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message || 'Failed to load assets');
      toast.error('Failed to load assets', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      if (activeSection === 'help-desk') {
        fetchTickets();
      } else if (activeSection === 'assets') {
        fetchAssets();
      }
    }
  }, [isAuthorized, activeSection, fetchTickets, fetchAssets]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'help-desk',
      label: 'IT Help Desk',
      icon: IconHeadset,
      path: '/internal-it/help-desk',
    },
    {
      id: 'assets',
      label: 'Asset Management',
      icon: IconDeviceDesktop,
      path: '/internal-it/assets',
    },
    {
      id: 'tooling',
      label: 'Internal Tooling',
      icon: IconTool,
      path: '/internal-it/tooling',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: IconUsers,
      path: '/internal-it/users',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconSettings,
      path: '/internal-it/settings',
    },
  ];

  const userInfo: User = {
    id: user?.id || '',
    email: user?.email || '',
    name: execUser?.title || 'IT Support',
    role: 'Internal IT',
    initials: execUser?.title?.split(' ').map(n => n[0]).join('') || 'IT',
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'help-desk':
        return (
          <Stack gap="md">
            <PageHeader
              title="IT Help Desk"
              description="Manage internal IT support tickets"
              actions={<Button leftSection={<IconPlus size={16} />}>New Ticket</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : error ? (
              <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchTickets }} />
            ) : tickets.length === 0 ? (
              <EmptyState
                title="No tickets found"
                description="IT support tickets will appear here"
              />
            ) : (
              <DataTable
                data={tickets}
                columns={ticketColumns}
                onRowClick={(row) => setSelectedItem(row.id)}
                exportable
                onExport={(format) => console.log('Export as', format)}
              />
            )}
          </Stack>
        );
      case 'assets':
        return (
          <Stack gap="md">
            <PageHeader
              title="Asset Management"
              description="Track IT assets and equipment"
              actions={<Button leftSection={<IconPlus size={16} />}>Add Asset</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : error ? (
              <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchAssets }} />
            ) : assets.length === 0 ? (
              <EmptyState
                title="No assets found"
                description="Add IT assets to start tracking"
              />
            ) : (
              <DataTable
                data={assets}
                columns={assetColumns}
                onRowClick={(row) => setSelectedItem(row.id)}
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
    return <ErrorState message="You do not have access to Internal IT Operations" />;
  }

  return (
    <PortalLayout
      portalName="Internal IT Operations"
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
        title="Internal IT Operations"
        description="IT help desk, asset management, and internal tooling"
      />
      {renderContent()}
      <DetailDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Details"
        entityId={selectedItem || undefined}
      >
        <Stack gap="md">
          <Text>Details will be displayed here</Text>
        </Stack>
      </DetailDrawer>
    </PortalLayout>
  );
}

