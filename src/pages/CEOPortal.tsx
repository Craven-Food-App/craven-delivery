// @ts-nocheck
import React, { useEffect, useState, useMemo, Suspense, lazy, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import {
  IconChartBar, IconUsers, IconCurrencyDollar, IconTrophy, IconRocket, IconBulb,
  IconShield, IconFileText, IconMail, IconPencil, IconCode, IconSchool,
  IconAlertTriangle, IconCar, IconBuildingStore, IconTrendingUp, IconTrendingDown,
  IconClock, IconArrowUp, IconArrowDown, IconActivity,
} from '@tabler/icons-react';

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

const CEOPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth('ceo');
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useActivityTracking('ceo');
  useAutoLogout('ceo');

  const navItems = useMemo<ExecutiveNavItem[]>(() => {
    const pa = metrics?.pendingApprovals ?? 0;
    const pc = metrics?.pendingCodeChanges ?? 0;
    return [
      // Operations
      { id: 'overview', label: 'Command Center', icon: IconChartBar as any },
      { id: 'active-users', label: 'Live Users', icon: IconActivity as any },
      // Approvals & Reviews
      { id: 'financial', label: pa > 0 ? `Spend Approvals (${pa})` : 'Spend Approvals', icon: IconCurrencyDollar as any },
      { id: 'code-changes', label: pc > 0 ? `Code Reviews (${pc})` : 'Code Reviews', icon: IconCode as any },
      { id: 'executive-evaluations', label: 'Exec Evaluations', icon: IconShield as any },
      // People
      { id: 'personnel', label: 'Personnel', icon: IconUsers as any },
      { id: 'interns', label: 'Interns & Pathway', icon: IconSchool as any },
      { id: 'equity', label: 'Equity', icon: IconTrophy as any },
      // Strategy
      { id: 'strategic', label: 'Strategic Planning', icon: IconRocket as any },
      { id: 'mindmap', label: 'Decision Map', icon: IconBulb as any },
      { id: 'emergency', label: 'Emergency', icon: IconAlertTriangle as any },
      // Documents & Comms
      { id: 'audit', label: 'Audit Trail', icon: IconFileText as any },
      { id: 'signature', label: 'Signatures', icon: IconPencil as any },
      { id: 'word', label: 'Briefings', icon: IconFileText as any },
      { id: 'communications', label: 'Secure Comms', icon: IconMail as any },
      { id: 'c-comms', label: 'C-Suite Comms', icon: IconMail as any },
    ];
  }, [metrics?.pendingApprovals, metrics?.pendingCodeChanges]);

  const handleNavigateToCFO = useCallback(() => {
    const host = window.location.hostname;
    if (/^ceo\./i.test(host)) {
      window.location.href = `${window.location.protocol}//${host.replace(/^ceo\./i, 'cfo.')}`;
      return;
    }
    navigate('/cfo');
  }, [navigate]);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'accountability') {
      // Defer navigation to avoid setState-during-render
      setTimeout(() => navigate('/executive/discipline'), 0);
      return;
    }
    setActiveTab(tab);
  }, [navigate]);

  const actionButtons = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button onClick={() => handleTabChange('emergency')} style={actionBtnStyle('#dc2626', '#fff')}>
        <IconAlertTriangle size={13} /> Emergency
      </button>
      <button onClick={handleNavigateToCFO} style={actionBtnStyle('#e5e7eb', '#111')}>CFO</button>
      <button onClick={() => navigate('/admin')} style={actionBtnStyle('#e5e7eb', '#111')}>Admin</button>
      <button onClick={() => navigate('/board')} style={actionBtnStyle('#e5e7eb', '#111')}>Board</button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <QuickActions onNavigate={handleTabChange} />;
      case 'executive-evaluations':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Executive Evaluation Gates</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Initiate and review time-boxed, board-defensible evaluations for C-suite officers.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>CFO Evaluation</h4>
              <CfoEvaluationGatePanel mode="ceo" />
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>CTO Evaluation</h4>
              <CtoEvaluationGatePanel mode="ceo" />
            </div>
          </div>
        );
      case 'personnel': return <PersonnelManager />;
      case 'financial': return <FinancialApprovals />;
      case 'code-changes': return <CodeChangeQueue />;
      case 'equity': return <EquityDashboard />;
      case 'strategic': return <StrategicPlanning />;
      case 'mindmap': return <StrategicMindMap />;
      case 'emergency': return <EmergencyControls />;
      case 'audit': return <AuditTrail />;
      case 'signature': return <CEOSignatureManager />;
      case 'communications': return <ExecutiveCommunicationsCenter defaultTab="messages" />;
      case 'c-comms': return <EmbeddedCComms />;
      case 'word': return <ExecutiveWordProcessor storageKey="ceo" />;
      case 'active-users': return <ActiveUsersMonitor />;
      case 'interns': return <InternsManagement />;
      default: return <QuickActions onNavigate={handleTabChange} />;
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
        supabase.from('orders').select('id, total_amount').gte('created_at', thisMonthStart),
        supabase.from('orders').select('id, total_amount').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
        supabase.from('code_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('craver_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const employees = employeesRes.data || [];
      const activeEmps = employees.filter(e => e.employment_status === 'active');
      const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);
      const thisMonthOrders = ordersThisRes.data || [];
      const prevMonthOrders = ordersPrevRes.data || [];
      const rev = thisMonthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const prevRev = prevMonthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const burn = totalPayroll / 12;

      setMetrics({
        totalRevenue: rev,
        prevMonthRevenue: prevRev,
        revenueGrowth: prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : 0,
        cashFlow: rev - burn,
        burnRate: burn,
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
    return () => { clearInterval(interval); channel.unsubscribe(); };
  }, [isAuthorized, fetchCEOMetrics]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid rgba(255,95,31,0.2)', borderTopColor: '#ff5f1f', borderRadius: '50%', margin: '0 auto 12px' }} />
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
          <IconShield size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Access Denied</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>This portal is restricted to the Chief Executive Officer.</p>
          <p style={{ margin: '0 0 20px', fontSize: 12, color: '#9ca3af' }}>Logged in as: <strong>{user?.email}</strong></p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Home</button>
            <button onClick={signOut} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Sign Out</button>
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
    { label: 'Revenue MTD', value: fmt(metrics?.totalRevenue ?? 0), delta: pct(metrics?.revenueGrowth ?? 0), up: (metrics?.revenueGrowth ?? 0) >= 0, accent: '#ff5f1f' },
    { label: 'Net Cash Flow', value: fmt(metrics?.cashFlow ?? 0), delta: `Burn ${fmt(metrics?.burnRate ?? 0)}/mo`, up: (metrics?.cashFlow ?? 0) >= 0, accent: (metrics?.cashFlow ?? 0) >= 0 ? '#059669' : '#dc2626' },
    { label: 'Orders MTD', value: (metrics?.totalOrders ?? 0).toLocaleString(), delta: pct(orderGrowth), up: orderGrowth >= 0, accent: '#3b82f6' },
    { label: 'Headcount', value: `${metrics?.activeEmployees ?? 0}/${metrics?.totalEmployees ?? 0}`, delta: 'Active / Total', up: true, accent: '#8b5cf6' },
    { label: 'Feeders', value: (metrics?.feeders ?? 0).toLocaleString(), delta: 'Approved', up: true, accent: '#f59e0b' },
    { label: 'Merchants', value: (metrics?.merchants ?? 0).toLocaleString(), delta: 'Active', up: true, accent: '#06b6d4' },
    { label: 'Approvals', value: (metrics?.pendingApprovals ?? 0).toString(), delta: 'Pending', up: (metrics?.pendingApprovals ?? 0) === 0, accent: (metrics?.pendingApprovals ?? 0) > 0 ? '#dc2626' : '#059669', onClick: () => handleTabChange('financial') },
    { label: 'Code Reviews', value: (metrics?.pendingCodeChanges ?? 0).toString(), delta: 'Pending', up: (metrics?.pendingCodeChanges ?? 0) === 0, accent: (metrics?.pendingCodeChanges ?? 0) > 0 ? '#f59e0b' : '#059669', onClick: () => handleTabChange('code-changes') },
  ];

  return (
    <ExecutivePortalLayout
      title="CEO Portal"
      subtitle="Executive Command Center"
      navItems={navItems}
      activeItemId={activeTab}
      onSelect={handleTabChange}
      onBack={() => navigate('/hub')}
      onSignOut={async () => {
        await signOut();
        sessionStorage.removeItem('hub_employee_info');
        navigate('/auth?hq=true');
      }}
      actionButtons={actionButtons}
      userInfo={{
        initials: 'CE',
        name: execUser?.title || 'Chief Executive Officer',
        role: 'Executive Leadership',
      }}
    >
      {/* KPI Strip */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
            Company Health — Live
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {kpis.map((k, i) => (
            <button
              key={i}
              onClick={k.onClick}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: k.onClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (k.onClick) { e.currentTarget.style.borderColor = k.accent; e.currentTarget.style.boxShadow = `0 0 0 1px ${k.accent}20`; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: k.accent, borderRadius: '8px 0 0 8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' }}>{k.label}</span>
                {k.up ? <IconArrowUp size={11} color="#059669" /> : <IconArrowDown size={11} color="#dc2626" />}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{k.delta}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Module Content */}
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid #e5e7eb', borderTopColor: '#ff5f1f', borderRadius: '50%', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading module...</p>
          </div>
        </div>
      }>
        {renderContent()}
      </Suspense>
    </ExecutivePortalLayout>
  );
};

function actionBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
    borderRadius: 6, border: 'none', background: bg, color, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

export default CEOPortal;
