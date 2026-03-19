// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Text } from '@mantine/core';
import { IconCheck, IconRocket, IconFileText, IconClipboard, IconSettings, IconPlus } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { PageHeader, DataTable, StatusBadge, EmptyState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { UnifiedPortalShell, PortalTab, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const testCaseColumns: ColumnDef<any>[] = [
  { id: 'name', header: 'Test Case', accessor: (row) => row.name, sortable: true },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'pass' ? 'success' : value === 'fail' ? 'error' : value === 'blocked' ? 'warning' : 'neutral'} label={value} size="sm" /> },
  { id: 'priority', header: 'Priority', accessor: (row) => row.priority, sortable: true },
  { id: 'assigned_to', header: 'Assigned To', accessor: (row) => row.assigned_to || 'Unassigned', sortable: true },
  { id: 'last_run', header: 'Last Run', accessor: (row) => row.last_run, sortable: true, render: (value) => value ? new Date(value).toLocaleDateString() : 'Never' },
];

const releaseColumns: ColumnDef<any>[] = [
  { id: 'version', header: 'Version', accessor: (row) => row.version, sortable: true },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'released' ? 'success' : value === 'testing' ? 'warning' : 'info'} label={value?.replace('-', ' ')} size="sm" /> },
  { id: 'release_date', header: 'Release Date', accessor: (row) => row.release_date, sortable: true, render: (value) => value ? new Date(value).toLocaleDateString() : 'TBD' },
  { id: 'test_coverage_percent', header: 'Coverage', accessor: (row) => row.test_coverage_percent, sortable: true, render: (value) => value ? `${Number(value).toFixed(0)}%` : '0%' },
];

const TABS: PortalTab[] = [
  { id: 'test-cases', label: 'Test Cases', description: 'Manage and track test case execution.', section: 'Quality', icon: IconCheck },
  { id: 'releases', label: 'Release Management', description: 'Plan and track software releases.', section: 'Quality', icon: IconRocket },
  { id: 'workflows', label: 'QA Workflows', description: 'Quality assurance process workflows.', section: 'Process', icon: IconFileText },
  { id: 'coordination', label: 'Testing Coordination', description: 'Cross-team testing coordination.', section: 'Process', icon: IconClipboard },
  { id: 'settings', label: 'Settings', description: 'QA portal configuration.', section: 'Process', icon: IconSettings },
];

const SECTIONS = ['Quality', 'Process'];

function QualityReleasePortalContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('test-cases');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from('test_cases').select('*').order('created_at', { ascending: false }); setTestCases(data || []); } catch (e: any) { toast.error(e.message, 'Error'); } finally { setLoading(false); }
  }, [toast]);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from('releases').select('*').order('created_at', { ascending: false }); setReleases(data || []); } catch (e: any) { toast.error(e.message, 'Error'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeSection === 'test-cases') fetchTestCases();
    else if (activeSection === 'releases') fetchReleases();
  }, [isAuthorized, activeSection, fetchTestCases, fetchReleases]);

  if (authLoading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="Quality & Release Portal" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeSection) {
      case 'test-cases':
        return loading ? <SkeletonLoader variant="table" count={5} /> : testCases.length === 0 ? <EmptyState title="No test cases" description="Create your first test case" /> : <DataTable data={testCases} columns={testCaseColumns} exportable onExport={(f) => console.log('Export', f)} />;
      case 'releases':
        return loading ? <SkeletonLoader variant="table" count={5} /> : releases.length === 0 ? <EmptyState title="No releases" description="Create your first release" /> : <DataTable data={releases} columns={releaseColumns} exportable onExport={(f) => console.log('Export', f)} />;
      default:
        return <EmptyState title="Section coming soon" description="This section is under development" />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Quality & Release"
      portalSubtitle="QA workflows, release management, and testing"
      sectionLabel="Quality Assurance"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'QA Engineer'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}

export default function QualityReleasePortal() {
  return <EmbeddedToastProvider><QualityReleasePortalContent /></EmbeddedToastProvider>;
}
