// @ts-nocheck
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCar,
  IconBuildingStore,
  IconShoppingCart,
  IconFileCheck,
  IconAlertTriangle,
  IconChartBar,
  IconMail,
  IconFileText,
  IconCalendar,
} from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedPortalShell, PortalTab, PortalKPI, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';
import { ExecutiveCalendarTabContent } from '@/components/calendar/ExecutiveCalendarTabContent';

// Lazy load heavy components
const ExecutiveWordProcessor = lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const PurchaseOrderManagement = lazy(() => import('@/components/coo/PurchaseOrderManagement').then(m => ({ default: m.PurchaseOrderManagement })));
const EmbeddedCComms = lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

// Inline sub-components (kept from original)
function FleetDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('fleet_vehicles').select('*').order('created_at', { ascending: false }).limit(100);
      setVehicles(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Fleet Vehicles</h3>
        <span className="text-xs text-muted-foreground">{vehicles.length} vehicles</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No fleet vehicles found</div>
      ) : (
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/50"><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">License</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th></tr></thead>
            <tbody>{vehicles.map(v => (
              <tr key={v.id} className="border-b border-border last:border-0"><td className="px-3 py-2">{v.vehicle_type}</td><td className="px-3 py-2">{v.license_plate}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{v.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PartnerManagement() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('partner_vendors').select('*').order('created_at', { ascending: false }).limit(100);
      setPartners(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Partners & Vendors</h3>
        <span className="text-xs text-muted-foreground">{partners.length} partners</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>
      ) : partners.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No partners found</div>
      ) : (
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/50"><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Rating</th></tr></thead>
            <tbody>{partners.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0"><td className="px-3 py-2">{p.vendor_name}</td><td className="px-3 py-2">{p.vendor_type}</td><td className="px-3 py-2">{p.status}</td><td className="px-3 py-2">{p.performance_rating}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComplianceDashboard() {
  const [records, setRecords] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('compliance_records').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setRecords(data || []));
  }, []);
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Compliance Records</h3>
      {records.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No compliance records</div>
      ) : (
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/50"><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Record</th><th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th></tr></thead>
            <tbody>{records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0"><td className="px-3 py-2">{r.id?.slice(0, 8)}</td><td className="px-3 py-2">{r.status}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OperationsAnalytics() {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Operations analytics module — coming soon</div>;
}

const TABS: PortalTab[] = [
  { id: 'calendar', label: 'Executive Calendar', description: 'Shared leadership schedule (same as Company Portal).', section: 'Operations', icon: IconCalendar },
  { id: 'fleet', label: 'Fleet Management', description: 'Vehicle fleet tracking and maintenance.', section: 'Operations', icon: IconCar },
  { id: 'partners', label: 'Partners & Vendors', description: 'Vendor relationships and performance.', section: 'Operations', icon: IconBuildingStore },
  { id: 'purchase-orders', label: 'Purchase Orders', description: 'Create and manage purchase orders.', section: 'Operations', icon: IconShoppingCart },
  { id: 'compliance', label: 'Compliance', description: 'Regulatory compliance and auditing.', section: 'Operations', icon: IconFileCheck },
  { id: 'analytics', label: 'Operations Analytics', description: 'Operational performance metrics.', section: 'Strategy', icon: IconChartBar },
  { id: 'word', label: 'Word Processor', description: 'Executive document workspace.', section: 'Documents', icon: IconFileText },
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication.', section: 'Documents', icon: IconMail },
];

const SECTIONS = ['Operations', 'Strategy', 'Documents'];

export default function COOPortal() {
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fleet');
  const [kpis, setKpis] = useState<PortalKPI[]>([]);

  useActivityTracking('coo');
  useAutoLogout('coo');

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchMetrics = async () => {
      const [ordersRes, driversRes, vehiclesRes, complianceRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'active'),
        supabase.from('driver_profiles').select('id', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('fleet_vehicles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('compliance_records').select('id', { count: 'exact', head: true }).eq('status', 'valid'),
      ]);
      setKpis([
        { id: 'orders', label: 'Active Orders', value: String(ordersRes.count || 0), delta: 'Live', up: true },
        { id: 'drivers', label: 'Drivers Active', value: String(driversRes.count || 0), delta: 'On road', up: true },
        { id: 'vehicles', label: 'Vehicles', value: String(vehiclesRes.count || 0), delta: 'In service', up: true },
        { id: 'compliance', label: 'Compliance', value: String(complianceRes.count || 0), delta: 'Valid records', up: true },
      ]);
    };
    fetchMetrics();
  }, [isAuthorized]);

  if (loading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="COO Portal" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'calendar': return <ExecutiveCalendarTabContent />;
      case 'fleet': return <FleetDashboard />;
      case 'partners': return <PartnerManagement />;
      case 'purchase-orders': return <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>}><PurchaseOrderManagement /></Suspense>;
      case 'compliance': return <ComplianceDashboard />;
      case 'analytics': return <OperationsAnalytics />;
      case 'word': return <Suspense fallback={null}><ExecutiveWordProcessor storageKey="coo" /></Suspense>;
      case 'c-comms': return <Suspense fallback={null}><EmbeddedCComms /></Suspense>;
      default: return <FleetDashboard />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="COO Portal"
      portalSubtitle="Operations command and fleet management"
      sectionLabel="Executive Workspace"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={kpis}
      kpiLabel="Operations Health — Live"
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'Chief Operating Officer'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
      headerActions={
        <>
          <button onClick={() => navigate('/ceo')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">CEO</button>
          <button onClick={() => navigate('/cfo')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">CFO</button>
        </>
      }
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}
