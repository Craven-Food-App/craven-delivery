// @ts-nocheck
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconBuildingStore,
  IconBulb,
  IconChartBar,
  IconClock,
  IconCode,
  IconCurrencyDollar,
  IconFileText,
  IconLogout,
  IconMail,
  IconPencil,
  IconRocket,
  IconSchool,
  IconShield,
  IconTrophy,
  IconUsers,
  IconCalendar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { cn } from '@/lib/utils';
import { ExecutiveCalendarTabContent } from '@/components/calendar/ExecutiveCalendarTabContent';

// Lazy-loaded modules
const PersonnelManager = lazy(() => import('@/components/ceo/PersonnelManager').then(m => ({ default: m.PersonnelManager })));
const FinancialApprovals = lazy(() => import('@/components/ceo/FinancialApprovals').then(m => ({ default: m.FinancialApprovals })));
const CodeChangeQueue = lazy(() => import('@/components/ceo/CodeChangeQueue').then(m => ({ default: m.CodeChangeQueue })));
const EmergencyControls = lazy(() => import('@/components/ceo/EmergencyControls').then(m => ({ default: m.EmergencyControls })));
const StrategicPlanning = lazy(() => import('@/components/ceo/StrategicPlanning').then(m => ({ default: m.StrategicPlanning })));
const StrategicMindMap = lazy(() => import('@/components/ceo/StrategicMindMap').then(m => ({ default: m.StrategicMindMap })));
const AuditTrail = lazy(() => import('@/components/ceo/AuditTrail').then(m => ({ default: m.AuditTrail })));
const QuickActions = lazy(() => import('@/components/ceo/QuickActions').then(m => ({ default: m.QuickActions })));
const EquityDashboard = lazy(() => import('@/components/ceo/EquityDashboard').then(m => ({ default: m.EquityDashboard })));
const ExecutiveCommunicationsCenter = lazy(() => import('@/components/executive/ExecutiveCommunicationsCenter'));
const CEOSignatureManager = lazy(() => import('@/components/ceo/CEOSignatureManager'));
const ExecutiveWordProcessor = lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const ActiveUsersMonitor = lazy(() => import('@/components/ceo/ActiveUsersMonitor'));
const InternsManagement = lazy(() => import('@/components/ceo/InternsManagement').then(m => ({ default: m.InternsManagement })));
const CfoEvaluationGatePanel = lazy(() => import('@/components/cfo/CfoEvaluationGatePanel'));
const CtoEvaluationGatePanel = lazy(() => import('@/components/cto/CtoEvaluationGatePanel'));
const EmbeddedCComms = lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

interface CEOMetrics {
  totalRevenue: number;
  prevMonthRevenue: number;
  revenueGrowth: number;
  cashFlow: number;
  burnRate: number;
  totalEmployees: number;
  activeEmployees: number;
  feeders: number;
  merchants: number;
  pendingApprovals: number;
  pendingCodeChanges: number;
  totalOrders: number;
  prevMonthOrders: number;
}

type TabId =
  | 'overview'
  | 'active-users'
  | 'financial'
  | 'code-changes'
  | 'executive-evaluations'
  | 'personnel'
  | 'interns'
  | 'equity'
  | 'strategic'
  | 'mindmap'
  | 'emergency'
  | 'audit'
  | 'signature'
  | 'word'
  | 'c-comms'
  | 'c-comms'
  | 'calendar';

interface TabDefinition {
  id: TabId;
  label: string;
  description: string;
  section: 'Operations' | 'Approvals' | 'People' | 'Strategy' | 'Documents';
  icon: any;
}

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: 'overview', label: 'Command Center', description: 'Executive snapshot and rapid action workflows.', section: 'Operations', icon: IconChartBar },
  { id: 'calendar', label: 'Executive Calendar', description: 'Shared leadership schedule (same as Company Portal).', section: 'Operations', icon: IconCalendar },
  { id: 'active-users', label: 'Live Users', description: 'Active sessions, traffic, and behavioral signal stream.', section: 'Operations', icon: IconActivity },
  { id: 'financial', label: 'Spend Approvals', description: 'Approve and triage pending spending decisions.', section: 'Approvals', icon: IconCurrencyDollar },
  { id: 'code-changes', label: 'Code Reviews', description: 'Production code-change approval and release risk gate.', section: 'Approvals', icon: IconCode },
  { id: 'executive-evaluations', label: 'Exec Evaluations', description: 'Board-defensible review workflows for C-suite leadership.', section: 'Approvals', icon: IconShield },
  { id: 'personnel', label: 'Personnel', description: 'Headcount, hiring, and organizational controls.', section: 'People', icon: IconUsers },
  { id: 'interns', label: 'Interns & Pathway', description: 'Intern program pipeline and conversion visibility.', section: 'People', icon: IconSchool },
  { id: 'equity', label: 'Equity', description: 'Ownership structure and grant visibility.', section: 'People', icon: IconTrophy },
  { id: 'strategic', label: 'Strategic Planning', description: 'Multi-quarter objectives and execution oversight.', section: 'Strategy', icon: IconRocket },
  { id: 'mindmap', label: 'Decision Map', description: 'Strategic dependency map and decision branching.', section: 'Strategy', icon: IconBulb },
  { id: 'emergency', label: 'Emergency', description: 'Critical controls for incident response and intervention.', section: 'Strategy', icon: IconAlertTriangle },
  { id: 'audit', label: 'Audit Trail', description: 'Executive-grade compliance and accountability evidence.', section: 'Documents', icon: IconFileText },
  { id: 'signature', label: 'Signatures', description: 'Secure signature workflow for approvals and legal docs.', section: 'Documents', icon: IconPencil },
  { id: 'word', label: 'Briefings', description: 'Executive writing workspace for memos and briefs.', section: 'Documents', icon: IconFileText },
  
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication workspace.', section: 'Documents', icon: IconMail },
];

const SECTION_ORDER: TabDefinition['section'][] = ['Operations', 'Approvals', 'People', 'Strategy', 'Documents'];

const CEOPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth('ceo');
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useActivityTracking('ceo');
  useAutoLogout('ceo');

  const tabMap = useMemo(() => {
    return TAB_DEFINITIONS.reduce((acc, tab) => {
      acc[tab.id] = tab;
      return acc;
    }, {} as Record<TabId, TabDefinition>);
  }, []);

  const handleNavigateToCFO = useCallback(() => {
    const host = window.location.hostname;
    if (/^ceo\./i.test(host)) {
      window.location.href = `${window.location.protocol}//${host.replace(/^ceo\./i, 'cfo.')}`;
      return;
    }
    navigate('/cfo');
  }, [navigate]);

  const handleTabChange = useCallback((tab: TabId | 'accountability') => {
    if (tab === 'accountability') {
      setTimeout(() => navigate('/executive/discipline'), 0);
      return;
    }
    setActiveTab(tab);
  }, [navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <QuickActions onNavigate={handleTabChange} />;
      case 'calendar':
        return <ExecutiveCalendarTabContent />;
      case 'executive-evaluations':
        return (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold text-foreground">Executive Evaluation Gates</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Initiate and review time-boxed, board-defensible evaluations for C-suite officers.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CFO Evaluation</h4>
              <CfoEvaluationGatePanel mode="ceo" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CTO Evaluation</h4>
              <CtoEvaluationGatePanel mode="ceo" />
            </div>
          </div>
        );
      case 'personnel':
        return <PersonnelManager />;
      case 'financial':
        return <FinancialApprovals />;
      case 'code-changes':
        return <CodeChangeQueue />;
      case 'equity':
        return <EquityDashboard />;
      case 'strategic':
        return <StrategicPlanning />;
      case 'mindmap':
        return <StrategicMindMap />;
      case 'emergency':
        return <EmergencyControls />;
      case 'audit':
        return <AuditTrail />;
      case 'signature':
        return <CEOSignatureManager />;
      case 'c-comms':
        return <EmbeddedCComms />;
      case 'word':
        return <ExecutiveWordProcessor storageKey="ceo" />;
      case 'active-users':
        return <ActiveUsersMonitor />;
      case 'interns':
        return <InternsManagement />;
      default:
        return <QuickActions onNavigate={handleTabChange} />;
    }
  };

  const fetchCEOMetrics = useCallback(async () => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [employeesRes, approvalsRes, ordersThisRes, ordersPrevRes, codeRes, feedersRes, merchantsRes] = await Promise.all([
        supabase.from('employees').select('id, employment_status, salary'),
        supabase.from('ceo_financial_approvals').select('id, status').eq('status', 'pending'),
        supabase.from('orders').select('id, total_amount, total_cents, amount_total_cents').gte('created_at', thisMonthStart),
        supabase.from('orders').select('id, total_amount, total_cents, amount_total_cents').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
        supabase.from('code_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('craver_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (approvalsRes.error) throw approvalsRes.error;
      if (ordersThisRes.error) throw ordersThisRes.error;
      if (ordersPrevRes.error) throw ordersPrevRes.error;
      if (codeRes.error) throw codeRes.error;
      if (feedersRes.error) throw feedersRes.error;
      if (merchantsRes.error) throw merchantsRes.error;

      const getOrderAmountCents = (order: any) => {
        if (typeof order.total_cents === 'number') return order.total_cents;
        if (typeof order.amount_total_cents === 'number') return order.amount_total_cents;
        if (typeof order.total_amount === 'number') return order.total_amount;
        return 0;
      };

      const employees = employeesRes.data || [];
      const activeEmps = employees.filter((e: any) => e.employment_status === 'active');
      const totalPayroll = employees.reduce((sum: number, employee: any) => sum + (employee.salary || 0), 0);
      const thisMonthOrders = ordersThisRes.data || [];
      const prevMonthOrders = ordersPrevRes.data || [];

      const thisMonthRevenueCents = thisMonthOrders.reduce((sum: number, order: any) => sum + getOrderAmountCents(order), 0);
      const prevMonthRevenueCents = prevMonthOrders.reduce((sum: number, order: any) => sum + getOrderAmountCents(order), 0);

      const totalRevenue = thisMonthRevenueCents / 100;
      const prevMonthRevenue = prevMonthRevenueCents / 100;
      const burnRate = totalPayroll / 12;

      setMetrics({
        totalRevenue,
        prevMonthRevenue,
        revenueGrowth: prevMonthRevenue > 0 ? ((totalRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0,
        cashFlow: totalRevenue - burnRate,
        burnRate,
        totalEmployees: employees.length,
        activeEmployees: activeEmps.length,
        feeders: feedersRes.count || 0,
        merchants: merchantsRes.count || 0,
        pendingApprovals: (approvalsRes.data || []).length,
        pendingCodeChanges: codeRes.count || 0,
        totalOrders: thisMonthOrders.length,
        prevMonthOrders: prevMonthOrders.length,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('CEO metrics fetch error:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    fetchCEOMetrics();

    const interval = setInterval(fetchCEOMetrics, 60000);
    const channel = supabase
      .channel('ceo_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchCEOMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ceo_financial_approvals' }, fetchCEOMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_change_requests' }, fetchCEOMetrics)
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [isAuthorized, fetchCEOMetrics]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-lg border border-border bg-card px-6 py-5 text-center shadow-card">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Verifying executive access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <IconShield size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Access denied</h2>
              <p className="text-xs text-muted-foreground">This workspace is restricted to the Chief Executive Officer.</p>
            </div>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Logged in as <span className="font-semibold text-foreground">{user?.email}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/')}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Home
            </button>
            <button
              onClick={signOut}
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const orderGrowth = (metrics?.prevMonthOrders ?? 0) > 0
    ? (((metrics?.totalOrders ?? 0) - (metrics?.prevMonthOrders ?? 0)) / (metrics?.prevMonthOrders ?? 1)) * 100
    : 0;

  const kpis = [
    { id: 'revenue', label: 'Revenue MTD', value: fmt(metrics?.totalRevenue ?? 0), delta: pct(metrics?.revenueGrowth ?? 0), up: (metrics?.revenueGrowth ?? 0) >= 0 },
    { id: 'cash', label: 'Net Cash Flow', value: fmt(metrics?.cashFlow ?? 0), delta: `Burn ${fmt(metrics?.burnRate ?? 0)}/mo`, up: (metrics?.cashFlow ?? 0) >= 0 },
    { id: 'orders', label: 'Orders MTD', value: (metrics?.totalOrders ?? 0).toLocaleString(), delta: pct(orderGrowth), up: orderGrowth >= 0 },
    { id: 'headcount', label: 'Headcount', value: `${metrics?.activeEmployees ?? 0}/${metrics?.totalEmployees ?? 0}`, delta: 'Active / Total', up: true },
    { id: 'feeders', label: 'Feeders', value: (metrics?.feeders ?? 0).toLocaleString(), delta: 'Approved', up: true },
    { id: 'merchants', label: 'Merchants', value: (metrics?.merchants ?? 0).toLocaleString(), delta: 'Active', up: true },
    { id: 'approvals', label: 'Approvals', value: (metrics?.pendingApprovals ?? 0).toString(), delta: 'Pending', up: (metrics?.pendingApprovals ?? 0) === 0, onClick: () => handleTabChange('financial') },
    { id: 'code', label: 'Code Reviews', value: (metrics?.pendingCodeChanges ?? 0).toString(), delta: 'Pending', up: (metrics?.pendingCodeChanges ?? 0) === 0, onClick: () => handleTabChange('code-changes') },
  ];

  const activeTabMeta = tabMap[activeTab] ?? tabMap.overview;

  const getBadgeValue = (tabId: TabId) => {
    if (tabId === 'financial') return metrics?.pendingApprovals ?? 0;
    if (tabId === 'code-changes') return metrics?.pendingCodeChanges ?? 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1800px] p-3 md:p-4">
        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden rounded-lg border border-border bg-card shadow-card lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden">
            <div className="border-b border-border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Executive Workspace</p>
              <h1 className="mt-1 text-lg font-semibold text-foreground">CEO Portal</h1>
              <p className="mt-1 text-xs text-muted-foreground">Company-wide command layer</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {SECTION_ORDER.map(section => {
                const sectionTabs = TAB_DEFINITIONS.filter(tab => tab.section === section);
                return (
                  <div key={section} className="space-y-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
                    {sectionTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const badgeValue = getBadgeValue(tab.id);

                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={cn(
                            'group flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                            isActive
                              ? 'border-primary/40 bg-primary/10 text-foreground'
                              : 'border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                          )}
                        >
                          <span className={cn(
                            'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border',
                            isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground group-hover:text-foreground'
                          )}>
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-xs font-semibold">{tab.label}</span>
                              {badgeValue > 0 && (
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {badgeValue}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{tab.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 space-y-3">
            <header className="rounded-lg border border-border bg-card p-3 shadow-card">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Executive Command Center</p>
                    <h2 className="text-lg font-semibold text-foreground">{activeTabMeta.label}</h2>
                    <p className="text-xs text-muted-foreground">{activeTabMeta.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <button
                      onClick={() => handleTabChange('emergency')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
                    >
                      <IconAlertTriangle size={14} />
                      Emergency
                    </button>
                    <button
                      onClick={handleNavigateToCFO}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      CFO
                    </button>
                    <button
                      onClick={() => navigate('/admin')}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => navigate('/board')}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      Board
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                      <IconClock size={13} />
                      Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                      {execUser?.title || 'Chief Executive Officer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/hub')}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <IconArrowLeft size={14} />
                      Hub
                    </button>
                    <button
                      onClick={async () => {
                        await signOut();
                        sessionStorage.removeItem('hub_employee_info');
                        navigate('/auth?hq=true');
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <IconLogout size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <div className="rounded-lg border border-border bg-card p-2 shadow-card lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TAB_DEFINITIONS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeValue = getBadgeValue(tab.id);

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      <Icon size={13} />
                      {tab.label}
                      {badgeValue > 0 && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-1 py-0.5 text-[10px] leading-none text-primary">{badgeValue}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="rounded-lg border border-border bg-card p-2 shadow-card md:p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Company Health — Live</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                {kpis.map(kpi => (
                  <button
                    key={kpi.id}
                    onClick={kpi.onClick}
                    className={cn(
                      'rounded-md border border-border bg-background p-2 text-left transition-colors',
                      kpi.onClick ? 'hover:border-primary/40 hover:bg-primary/5' : 'cursor-default'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</span>
                      {kpi.up ? <IconArrowUp size={12} className="text-status-online" /> : <IconArrowDown size={12} className="text-destructive" />}
                    </div>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{kpi.value}</p>
                    <p className={cn('mt-0.5 text-[11px]', kpi.up ? 'text-status-online' : 'text-destructive')}>
                      {kpi.delta}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card shadow-card">
              <div className="border-b border-border px-3 py-2 md:px-4 md:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Module Workspace</p>
                <h3 className="text-sm font-semibold text-foreground">{activeTabMeta.label}</h3>
              </div>
              <div className="p-2 md:p-3">
                <Suspense
                  fallback={
                    <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        <p className="text-xs text-muted-foreground">Loading module...</p>
                      </div>
                    </div>
                  }
                >
                  {renderContent()}
                </Suspense>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CEOPortal;
