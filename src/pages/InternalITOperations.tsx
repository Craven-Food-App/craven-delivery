// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Text } from '@mantine/core';
import {
  IconHeadset,
  IconDeviceDesktop,
  IconTool,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { PageHeader, DataTable, StatusBadge, EmptyState, SkeletonLoader, ColumnDef } from '@/components/tpi';
import { UnifiedPortalShell, PortalTab, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const ticketColumns: ColumnDef<any>[] = [
  { id: 'ticket_number', header: 'Ticket #', accessor: (row) => row.ticket_number, sortable: true },
  { id: 'subject', header: 'Subject', accessor: (row) => row.subject, sortable: true },
  { id: 'category', header: 'Category', accessor: (row) => row.category, sortable: true },
  { id: 'priority', header: 'Priority', accessor: (row) => row.priority, sortable: true, render: (value) => <StatusBadge status={value === 'urgent' ? 'error' : value === 'high' ? 'warning' : 'info'} label={value} size="sm" /> },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'resolved' || value === 'closed' ? 'success' : value === 'in_progress' ? 'info' : 'neutral'} label={value?.replace('_', ' ')} size="sm" /> },
  { id: 'created_at', header: 'Created', accessor: (row) => row.created_at, sortable: true, render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
];

const assetColumns: ColumnDef<any>[] = [
  { id: 'asset_name', header: 'Asset Name', accessor: (row) => row.asset_name, sortable: true },
  { id: 'asset_type', header: 'Type', accessor: (row) => row.asset_type, sortable: true },
  { id: 'status', header: 'Status', accessor: (row) => row.status, sortable: true, render: (value) => <StatusBadge status={value === 'active' ? 'success' : value === 'maintenance' ? 'warning' : 'neutral'} label={value} size="sm" /> },
  { id: 'assigned_to', header: 'Assigned To', accessor: (row) => row.assigned_to ? 'User' : 'Unassigned', sortable: true },
];

const TABS: PortalTab[] = [
  { id: 'help-desk', label: 'IT Help Desk', description: 'Internal IT support ticket management.', section: 'Operations', icon: IconHeadset },
  { id: 'assets', label: 'Asset Management', description: 'Track IT assets and equipment inventory.', section: 'Operations', icon: IconDeviceDesktop },
  { id: 'tooling', label: 'Internal Tooling', description: 'Internal tool configuration and setup.', section: 'Management', icon: IconTool },
  { id: 'users', label: 'User Management', description: 'IT user account administration.', section: 'Management', icon: IconUsers },
  { id: 'settings', label: 'Settings', description: 'IT operations configuration.', section: 'Management', icon: IconSettings },
];

const SECTIONS = ['Operations', 'Management'];

export default function InternalITOperations() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('help-desk');
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('it_help_desk_tickets').select('*').order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setTickets(data || []);
    } catch (err: any) { setError(err.message); toast.error('Failed to load tickets', 'Error'); } finally { setLoading(false); }
  }, [toast]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('it_assets').select('*').order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setAssets(data || []);
    } catch (err: any) { setError(err.message); toast.error('Failed to load assets', 'Error'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeSection === 'help-desk') fetchTickets();
    else if (activeSection === 'assets') fetchAssets();
  }, [isAuthorized, activeSection, fetchTickets, fetchAssets]);

  if (authLoading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="Internal IT Operations" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeSection) {
      case 'help-desk':
        return loading ? <SkeletonLoader variant="table" count={5} /> : tickets.length === 0 ? <EmptyState title="No tickets found" description="IT support tickets will appear here" /> : <DataTable data={tickets} columns={ticketColumns} exportable onExport={(f) => console.log('Export', f)} />;
      case 'assets':
        return loading ? <SkeletonLoader variant="table" count={5} /> : assets.length === 0 ? <EmptyState title="No assets found" description="Add IT assets to start tracking" /> : <DataTable data={assets} columns={assetColumns} exportable onExport={(f) => console.log('Export', f)} />;
      default:
        return <EmptyState title="Section coming soon" description="This section is under development" />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Internal IT Operations"
      portalSubtitle="IT help desk, asset management, and internal tooling"
      sectionLabel="IT Operations"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'IT Support'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}
