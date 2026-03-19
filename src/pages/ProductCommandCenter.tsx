// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Text } from '@mantine/core';
import { IconList, IconTimeline, IconRocket, IconChartBar, IconUsers, IconSettings, IconPlus } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { PageHeader, DataTable, StatusBadge, EmptyState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { UnifiedPortalShell, PortalTab, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const featureColumns: ColumnDef<any>[] = [
  { id: 'name', header: 'Feature Name', accessor: (row) => row.name, sortable: true },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'released' ? 'success' : value === 'in-progress' ? 'info' : value === 'testing' ? 'warning' : 'neutral'} label={value?.replace('-', ' ')} size="sm" /> },
  { id: 'priority', header: 'Priority', accessor: (row) => row.priority, sortable: true, render: (value) => <StatusBadge status={value === 'critical' ? 'error' : value === 'high' ? 'warning' : 'info'} label={value} size="sm" /> },
  { id: 'target_date', header: 'Target Date', accessor: (row) => row.target_date, sortable: true, render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
];

const TABS: PortalTab[] = [
  { id: 'features', label: 'Feature Tracking', description: 'Track product features from planning to release.', section: 'Product', icon: IconList },
  { id: 'roadmap', label: 'Product Roadmap', description: 'Strategic product planning and timeline.', section: 'Product', icon: IconTimeline },
  { id: 'requests', label: 'Feature Requests', description: 'User and stakeholder feature requests.', section: 'Product', icon: IconRocket },
  { id: 'analytics', label: 'Product Analytics', description: 'Usage analytics and adoption metrics.', section: 'Insights', icon: IconChartBar },
  { id: 'stakeholders', label: 'Stakeholders', description: 'Stakeholder communication and updates.', section: 'Insights', icon: IconUsers },
  { id: 'settings', label: 'Settings', description: 'Product portal configuration.', section: 'Insights', icon: IconSettings },
];

const SECTIONS = ['Product', 'Insights'];

function ProductCommandCenterContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('features');
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from('product_features').select('*').order('created_at', { ascending: false }); setFeatures(data || []); } catch (e: any) { toast.error(e.message, 'Error'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) fetchFeatures();
  }, [isAuthorized, fetchFeatures]);

  if (authLoading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="Product Command Center" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeSection) {
      case 'features':
        return loading ? <SkeletonLoader variant="table" count={5} /> : features.length === 0 ? <EmptyState title="No features" description="Create your first product feature" /> : <DataTable data={features} columns={featureColumns} exportable onExport={(f) => console.log('Export', f)} />;
      case 'roadmap':
        return <EmptyState title="Roadmap coming soon" description="Product roadmap visualization is under development" />;
      default:
        return <EmptyState title="Section coming soon" description="This section is under development" />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Product Command Center"
      portalSubtitle="Product management, feature tracking, and roadmap"
      sectionLabel="Product Management"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'Product Manager'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}

export default function ProductCommandCenter() {
  return <EmbeddedToastProvider><ProductCommandCenterContent /></EmbeddedToastProvider>;
}
