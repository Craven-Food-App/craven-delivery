import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PortalLayout, PageHeader, DataTable, DetailDrawer, FilterBar, StatusBadge, EmptyState, ErrorState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { SidebarItem, User } from '@/components/tpi';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconCheck, IconRocket, IconFileText, IconClipboard, IconSettings } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';

const testCaseColumns: ColumnDef<any>[] = [
  {
    id: 'name',
    header: 'Test Case',
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
        status={value === 'pass' ? 'success' : value === 'fail' ? 'error' : value === 'blocked' ? 'warning' : 'neutral'}
        label={value}
        size="sm"
      />
    ),
  },
  {
    id: 'priority',
    header: 'Priority',
    accessor: (row) => row.priority,
    sortable: true,
  },
  {
    id: 'assigned_to',
    header: 'Assigned To',
    accessor: (row) => row.assigned_to || 'Unassigned',
    sortable: true,
  },
  {
    id: 'last_run',
    header: 'Last Run',
    accessor: (row) => row.last_run,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : 'Never',
  },
];

const releaseColumns: ColumnDef<any>[] = [
  {
    id: 'version',
    header: 'Version',
    accessor: (row) => row.version,
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.status,
    sortable: true,
    render: (value) => (
      <StatusBadge
        status={value === 'released' ? 'success' : value === 'testing' ? 'warning' : value === 'in-progress' ? 'info' : 'neutral'}
        label={value.replace('-', ' ')}
        size="sm"
      />
    ),
  },
  {
    id: 'release_date',
    header: 'Release Date',
    accessor: (row) => row.release_date,
    sortable: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : 'TBD',
  },
  {
    id: 'test_coverage_percent',
    header: 'Test Coverage',
    accessor: (row) => row.test_coverage_percent,
    sortable: true,
    render: (value) => value ? `${Number(value).toFixed(0)}%` : '0%',
  },
];

export default function QualityReleasePortal() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // Determine active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/releases')) return 'releases';
    if (path.includes('/workflows')) return 'workflows';
    if (path.includes('/coordination')) return 'coordination';
    if (path.includes('/settings')) return 'settings';
    return 'test-cases';
  };
  const [activeSection, setActiveSection] = useState<string>(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
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

  // Fetch test cases
  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setTestCases(data || []);
    } catch (err: any) {
      console.error('Error fetching test cases:', err);
      setError(err.message || 'Failed to load test cases');
      toast.error('Failed to load test cases', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch releases
  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setReleases(data || []);
    } catch (err: any) {
      console.error('Error fetching releases:', err);
      setError(err.message || 'Failed to load releases');
      toast.error('Failed to load releases', 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      if (activeSection === 'test-cases') {
        fetchTestCases();
      } else if (activeSection === 'releases') {
        fetchReleases();
      }
    }
  }, [isAuthorized, activeSection, fetchTestCases, fetchReleases]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'test-cases',
      label: 'Test Cases',
      icon: IconCheck,
      path: '/quality-release/test-cases',
    },
    {
      id: 'releases',
      label: 'Release Management',
      icon: IconRocket,
      path: '/quality-release/releases',
    },
    {
      id: 'workflows',
      label: 'QA Workflows',
      icon: IconFileText,
      path: '/quality-release/workflows',
    },
    {
      id: 'coordination',
      label: 'Testing Coordination',
      icon: IconClipboard,
      path: '/quality-release/coordination',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconSettings,
      path: '/quality-release/settings',
    },
  ];

  const userInfo: User = {
    id: user?.id || '',
    email: user?.email || '',
    name: execUser?.title || 'QA Engineer',
    role: 'Quality & Release',
    initials: execUser?.title?.split(' ').map(n => n[0]).join('') || 'QA',
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'test-cases':
        return (
          <Stack gap="md">
            <PageHeader
              title="Test Cases"
              description="Manage and track test case execution"
              actions={<Button leftSection={<IconPlus size={16} />}>New Test Case</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : error ? (
              <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchTestCases }} />
            ) : testCases.length === 0 ? (
              <EmptyState
                title="No test cases found"
                description="Create your first test case to get started"
              />
            ) : (
              <DataTable
                data={testCases}
                columns={testCaseColumns}
                onRowClick={(row) => setSelectedItem(row.id)}
                exportable
                onExport={(format) => console.log('Export as', format)}
              />
            )}
          </Stack>
        );
      case 'releases':
        return (
          <Stack gap="md">
            <PageHeader
              title="Release Management"
              description="Plan and track software releases"
              actions={<Button leftSection={<IconPlus size={16} />}>New Release</Button>}
            />
            {loading ? (
              <SkeletonLoader variant="table" count={5} />
            ) : error ? (
              <ErrorState message={error} retry={{ label: 'Retry', onRetry: fetchReleases }} />
            ) : releases.length === 0 ? (
              <EmptyState
                title="No releases found"
                description="Create your first release to get started"
              />
            ) : (
              <DataTable
                data={releases}
                columns={releaseColumns}
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
    return <ErrorState message="You do not have access to the Quality & Release Portal" />;
  }

  return (
    <PortalLayout
      portalName="Quality & Release Portal"
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
        title="Quality & Release Portal"
        description="QA workflows, release management, and testing coordination"
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

