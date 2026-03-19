// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Text, Grid } from '@mantine/core';
import { IconServer, IconCloud, IconActivity, IconSettings, IconDatabase, IconNetwork, IconPlus } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { PageHeader, DataTable, StatusBadge, EmptyState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { UnifiedPortalShell, PortalTab, PortalKPI, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const serviceColumns: ColumnDef<any>[] = [
  { id: 'service_name', header: 'Service Name', accessor: (row) => row.service_name, sortable: true },
  { id: 'service_provider', header: 'Provider', accessor: (row) => row.service_provider || 'N/A', sortable: true },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'operational' ? 'success' : value === 'degraded' ? 'warning' : 'error'} label={value} size="sm" /> },
  { id: 'uptime_percent', header: 'Uptime %', accessor: (row) => row.uptime_percent, sortable: true, render: (value) => value ? `${Number(value).toFixed(2)}%` : 'N/A' },
  { id: 'response_time_ms', header: 'Response (ms)', accessor: (row) => row.response_time_ms, sortable: true, render: (value) => value ? `${value}ms` : 'N/A' },
];

const TABS: PortalTab[] = [
  { id: 'overview', label: 'Overview', description: 'Infrastructure health and service status.', section: 'Monitoring', icon: IconActivity },
  { id: 'services', label: 'Services', description: 'Monitor service health and performance.', section: 'Monitoring', icon: IconServer },
  { id: 'deployments', label: 'Deployments', description: 'Deployment pipeline and history.', section: 'Infrastructure', icon: IconCloud },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Network and compute resources.', section: 'Infrastructure', icon: IconNetwork },
  { id: 'databases', label: 'Databases', description: 'Database monitoring and management.', section: 'Infrastructure', icon: IconDatabase },
  { id: 'settings', label: 'Settings', description: 'Platform configuration.', section: 'Infrastructure', icon: IconSettings },
];

const SECTIONS = ['Monitoring', 'Infrastructure'];

function PlatformInfrastructureHubContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<PortalKPI[]>([]);
  const toast = useToast();

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('it_infrastructure').select('*').order('service_name', { ascending: true });
      const svc = data || [];
      setServices(svc);
      const avgUptime = svc.length ? svc.reduce((s, v) => s + (Number(v.uptime_percent) || 0), 0) / svc.length : 0;
      const avgResponse = svc.length ? svc.reduce((s, v) => s + (Number(v.response_time_ms) || 0), 0) / svc.length : 0;
      setKpis([
        { id: 'total', label: 'Total Services', value: String(svc.length), delta: 'Monitored', up: true },
        { id: 'uptime', label: 'Avg Uptime', value: `${avgUptime.toFixed(2)}%`, delta: 'All services', up: avgUptime > 99 },
        { id: 'response', label: 'Avg Response', value: `${avgResponse.toFixed(0)}ms`, delta: 'Latency', up: avgResponse < 200 },
        { id: 'operational', label: 'Operational', value: String(svc.filter(s => s.status === 'operational').length), delta: 'Healthy', up: true },
      ]);
    } catch (e: any) { toast.error(e.message, 'Error'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { if (isAuthorized) fetchServices(); }, [isAuthorized, fetchServices]);

  if (authLoading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="Platform & Infrastructure Hub" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
      case 'services':
        return loading ? <SkeletonLoader variant="table" count={5} /> : services.length === 0 ? <EmptyState title="No services" description="Add infrastructure services to monitor" /> : <DataTable data={services} columns={serviceColumns} density="compact" exportable onExport={(f) => console.log('Export', f)} />;
      default:
        return <EmptyState title="Section coming soon" description="This section is under development" />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Platform & Infrastructure"
      portalSubtitle="Infrastructure monitoring and deployment management"
      sectionLabel="Platform Engineering"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      kpis={kpis}
      kpiLabel="Infrastructure Health — Live"
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'Platform Engineer'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}

export default function PlatformInfrastructureHub() {
  return <EmbeddedToastProvider><PlatformInfrastructureHubContent /></EmbeddedToastProvider>;
}
