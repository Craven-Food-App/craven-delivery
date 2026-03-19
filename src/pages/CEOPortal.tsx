// @ts-nocheck
import React, { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import {
  Badge,
  Button,
  Group,
  Stack,
  Alert,
  Title,
  Text,
  Divider,
  Paper,
  Loader,
  Box,
  SimpleGrid,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChartBar,
  IconUsers,
  IconCurrencyDollar,
  IconTrophy,
  IconRocket,
  IconBulb,
  IconShield,
  IconFileText,
  IconMail,
  IconPencil,
  IconCode,
  IconSchool,
  IconTrendingUp,
  IconTrendingDown,
  IconBuildingStore,
  IconCar,
  IconClock,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

// Lazy load heavy components for performance
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

const ModuleLoader = () => (
  <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
    <Stack align="center" gap="xs">
      <Loader size="md" />
      <Text c="dimmed" size="sm">Loading module...</Text>
    </Stack>
  </Box>
);

interface CEOMetrics {
  totalRevenue: number;
  prevMonthRevenue: number;
  revenueGrowth: number;
  cashFlow: number;
  burnRate: number;
  runway: number;
  totalEmployees: number;
  activeEmployees: number;
  feeders: number;
  merchants: number;
  pendingApprovals: number;
  pendingCodeChanges: number;
  criticalAlerts: number;
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
    const pendingApprovals = metrics?.pendingApprovals ?? 0;
    const pendingCodeChanges = metrics?.pendingCodeChanges ?? 0;

    return [
      { id: 'overview', label: 'Command Center', icon: IconChartBar as any },
      { id: 'executive-evaluations', label: 'Executive Evaluations', icon: IconShield as any },
      { id: 'personnel', label: 'Manage People', icon: IconUsers as any },
      {
        id: 'financial',
        label: pendingApprovals > 0 ? `Approve Spend (${pendingApprovals})` : 'Approve Spend',
        icon: IconCurrencyDollar as any,
      },
      {
        id: 'code-changes',
        label: pendingCodeChanges > 0 ? `Code Changes (${pendingCodeChanges})` : 'Code Changes',
        icon: IconCode as any,
      },
      { id: 'equity', label: 'Review Equity', icon: IconTrophy as any },
      { id: 'strategic', label: 'Drive Strategy', icon: IconRocket as any },
      { id: 'mindmap', label: 'Map Decisions', icon: IconBulb as any },
      { id: 'emergency', label: 'Emergency Playbooks', icon: IconShield as any },
      { id: 'audit', label: 'Audit Activity', icon: IconFileText as any },
      { id: 'signature', label: 'Sign Documents', icon: IconPencil as any },
      { id: 'communications', label: 'Direct Communications', icon: IconMail as any },
      { id: 'c-comms', label: 'C Comms', icon: IconMail as any },
      { id: 'word', label: 'Draft Briefings', icon: IconFileText as any },
      { id: 'active-users', label: 'Active Users', icon: IconUsers as any },
      { id: 'accountability', label: 'Executive Accountability', icon: IconShield as any },
      { id: 'interns', label: 'Interns & Pathway', icon: IconSchool as any },
    ];
  }, [metrics?.pendingApprovals, metrics?.pendingCodeChanges]);

  const handleNavigateToCFO = () => {
    const host = window.location.hostname;
    if (/^ceo\./i.test(host)) {
      const target = host.replace(/^ceo\./i, 'cfo.');
      window.location.href = `${window.location.protocol}//${target}`;
      return;
    }
    navigate('/cfo');
  };

  const actionButtons = (
    <Group gap="xs" wrap="wrap">
      <Button size="xs" color="red" variant="filled" leftSection={<IconAlertTriangle size={14} />} onClick={() => setActiveTab('emergency')}>
        Emergency
      </Button>
      <Button size="xs" variant="default" onClick={handleNavigateToCFO}>CFO</Button>
      <Button size="xs" variant="default" onClick={() => navigate('/admin')}>Admin</Button>
      <Button size="xs" variant="default" onClick={() => navigate('/board')}>Board</Button>
    </Group>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <QuickActions onNavigate={setActiveTab} />;
      case 'executive-evaluations':
        return (
          <Stack gap="md">
            <Title order={3}>Executive Evaluation Gates</Title>
            <Text size="sm" c="dimmed">Initiate and review time-boxed, board-defensible evaluations for C-suite officers.</Text>
            <Divider />
            <Title order={4}>CFO Evaluation Gate</Title>
            <CfoEvaluationGatePanel mode="ceo" />
            <Divider />
            <Title order={4}>CTO Evaluation Gate</Title>
            <CtoEvaluationGatePanel mode="ceo" />
          </Stack>
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
      case 'accountability':
        navigate('/executive/discipline');
        return <QuickActions onNavigate={setActiveTab} />;
      case 'interns': return <InternsManagement />;
      default: return <QuickActions onNavigate={setActiveTab} />;
    }
  };

  const handleBackToHub = () => navigate('/hub');

  const handleSignOut = async () => {
    try {
      await signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      Number.isFinite(value) ? value : 0,
    );

  useEffect(() => {
    if (isAuthorized) {
      fetchCEOMetrics();
      const interval = setInterval(() => {
        try { fetchCEOMetrics(); } catch (e) { console.error('Auto-refresh error:', e); }
      }, 60000);

      const ordersChannel = supabase
        .channel('ceo_orders_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          try { fetchCEOMetrics(); } catch (e) { console.error(e); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ceo_financial_approvals' }, () => {
          try { fetchCEOMetrics(); } catch (e) { console.error(e); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'code_change_requests' }, () => {
          try { fetchCEOMetrics(); } catch (e) { console.error(e); }
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        ordersChannel.unsubscribe();
      };
    }
  }, [isAuthorized]);

  const fetchCEOMetrics = async () => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [employeesRes, approvalsRes, ordersThisMonthRes, ordersPrevMonthRes, codeChangesRes, feedersRes, merchantsRes] = await Promise.all([
        supabase.from('employees').select('id, employment_status, salary'),
        supabase.from('ceo_financial_approvals').select('id, status, amount'),
        supabase.from('orders').select('id, total_amount').gte('created_at', thisMonthStart),
        supabase.from('orders').select('id, total_amount').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
        supabase.from('code_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('craver_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const employees = employeesRes.data || [];
      const activeEmployees = employees.filter(e => e.employment_status === 'active');
      const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
      
      const approvals = approvalsRes.data || [];
      const pendingApprovals = approvals.filter(a => a.status === 'pending');
      
      const thisMonthOrders = ordersThisMonthRes.data || [];
      const prevMonthOrders = ordersPrevMonthRes.data || [];
      const monthlyRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const prevMonthRevenue = prevMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      const revenueGrowth = prevMonthRevenue > 0
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
        : 0;

      const feedersCount = feedersRes.count || 0;
      const merchantsCount = merchantsRes.count || 0;
      const pendingCodeChanges = codeChangesRes.count || 0;
      const monthlyBurn = totalPayroll / 12;
      const netCashFlow = monthlyRevenue - monthlyBurn;

      setMetrics({
        totalRevenue: monthlyRevenue,
        prevMonthRevenue,
        revenueGrowth,
        cashFlow: netCashFlow,
        burnRate: monthlyBurn,
        runway: monthlyBurn > 0 ? Math.floor(netCashFlow > 0 ? (netCashFlow * 6) / monthlyBurn : 0) : 0,
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        feeders: feedersCount,
        merchants: merchantsCount,
        pendingApprovals: pendingApprovals.length,
        pendingCodeChanges,
        criticalAlerts: 0,
        totalOrders: thisMonthOrders.length,
        prevMonthOrders: prevMonthOrders.length,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching CEO metrics:', error);
      setMetrics({
        totalRevenue: 0, prevMonthRevenue: 0, revenueGrowth: 0, cashFlow: 0, burnRate: 0,
        runway: 0, totalEmployees: 0, activeEmployees: 0, feeders: 0, merchants: 0,
        pendingApprovals: 0, pendingCodeChanges: 0, criticalAlerts: 0, totalOrders: 0, prevMonthOrders: 0,
      });
    }
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <Stack align="center" gap="sm">
          <Loader size="lg" color="orange" />
          <Text c="white" size="sm">Verifying access...</Text>
        </Stack>
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '1rem' }}>
        <Paper p="xl" radius="md" w="100%" maw={420} shadow="xl">
          <Stack gap="md" align="center">
            <IconShield size={40} color="#dc2626" />
            <Title order={3} ta="center">Access Denied</Title>
            <Text size="sm" ta="center" c="dimmed">This portal is restricted to the Chief Executive Officer.</Text>
            <Text size="xs" c="dimmed">Logged in as: <Text component="span" fw={600}>{user?.email}</Text></Text>
            <Group gap="sm" w="100%">
              <Button variant="default" onClick={() => navigate('/')} style={{ flex: 1 }} size="sm">Home</Button>
              <Button color="red" onClick={signOut} style={{ flex: 1 }} size="sm">Sign Out</Button>
            </Group>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const growthDirection = (metrics?.revenueGrowth ?? 0) >= 0;
  const orderGrowth = (metrics?.prevMonthOrders ?? 0) > 0
    ? (((metrics?.totalOrders ?? 0) - (metrics?.prevMonthOrders ?? 0)) / (metrics?.prevMonthOrders ?? 1)) * 100
    : 0;

  const metricCards = [
    {
      label: 'Revenue (MTD)',
      value: formatCurrency(metrics?.totalRevenue ?? 0),
      sub: `${growthDirection ? '+' : ''}${(metrics?.revenueGrowth ?? 0).toFixed(1)}% vs last month`,
      icon: IconCurrencyDollar,
      color: '#ff6e00',
      trend: growthDirection,
    },
    {
      label: 'Net Cash Flow',
      value: formatCurrency(metrics?.cashFlow ?? 0),
      sub: `Burn: ${formatCurrency(metrics?.burnRate ?? 0)}/mo`,
      icon: IconTrendingUp,
      color: (metrics?.cashFlow ?? 0) >= 0 ? '#059669' : '#dc2626',
      trend: (metrics?.cashFlow ?? 0) >= 0,
    },
    {
      label: 'Orders (MTD)',
      value: (metrics?.totalOrders ?? 0).toLocaleString(),
      sub: `${orderGrowth >= 0 ? '+' : ''}${orderGrowth.toFixed(1)}% vs last month`,
      icon: IconChartBar,
      color: '#3b82f6',
      trend: orderGrowth >= 0,
    },
    {
      label: 'Headcount',
      value: (metrics?.totalEmployees ?? 0).toString(),
      sub: `${metrics?.activeEmployees ?? 0} active`,
      icon: IconUsers,
      color: '#8b5cf6',
      trend: true,
    },
    {
      label: 'Active Feeders',
      value: (metrics?.feeders ?? 0).toLocaleString(),
      sub: 'Approved drivers',
      icon: IconCar,
      color: '#f59e0b',
      trend: true,
    },
    {
      label: 'Merchants',
      value: (metrics?.merchants ?? 0).toLocaleString(),
      sub: 'Active partners',
      icon: IconBuildingStore,
      color: '#06b6d4',
      trend: true,
    },
    {
      label: 'Pending Approvals',
      value: (metrics?.pendingApprovals ?? 0).toString(),
      sub: 'Awaiting CEO action',
      icon: IconClock,
      color: (metrics?.pendingApprovals ?? 0) > 0 ? '#dc2626' : '#059669',
      trend: (metrics?.pendingApprovals ?? 0) === 0,
    },
    {
      label: 'Code Changes',
      value: (metrics?.pendingCodeChanges ?? 0).toString(),
      sub: 'Pending review',
      icon: IconCode,
      color: (metrics?.pendingCodeChanges ?? 0) > 0 ? '#f59e0b' : '#059669',
      trend: (metrics?.pendingCodeChanges ?? 0) === 0,
    },
  ];

  return (
    <ExecutivePortalLayout
      title="CEO Portal"
      subtitle="Executive Command Center"
      navItems={navItems}
      activeItemId={activeTab}
      onSelect={setActiveTab}
      onBack={handleBackToHub}
      onSignOut={handleSignOut}
      actionButtons={actionButtons}
      userInfo={{
        initials: 'CE',
        name: execUser?.title || 'Chief Executive Officer',
        role: 'Executive Leadership',
      }}
    >
      <Stack gap="md">
        {/* Critical Alerts Banner */}
        {metrics?.criticalAlerts && metrics.criticalAlerts > 0 && (
          <Alert title={`${metrics.criticalAlerts} Critical Alert${metrics.criticalAlerts > 1 ? 's' : ''}`} color="red" icon={<IconAlertTriangle size={16} />}>
            <Group justify="space-between" align="center" w="100%">
              <Text size="sm">Immediate action required.</Text>
              <Button size="xs" color="red" onClick={() => setActiveTab('emergency')}>View Now</Button>
            </Group>
          </Alert>
        )}

        {/* Compact Metrics Grid */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>
              Company Health
            </Text>
            <Tooltip label={`Last updated: ${lastUpdated.toLocaleTimeString()}`}>
              <Badge size="xs" variant="light" color="gray" style={{ cursor: 'default' }}>
                <Group gap={4}>
                  <IconClock size={10} />
                  {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Group>
              </Badge>
            </Tooltip>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 4, lg: 8 }} spacing="xs">
            {metricCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Paper
                  key={i}
                  p="xs"
                  radius="md"
                  style={{
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: 'default',
                    transition: 'box-shadow 150ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Group gap={6} mb={4}>
                    <Box
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: `${card.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={14} color={card.color} />
                    </Box>
                    {card.trend ? (
                      <IconArrowUp size={12} color="#059669" />
                    ) : (
                      <IconArrowDown size={12} color="#dc2626" />
                    )}
                  </Group>
                  <Text fw={700} size="lg" lh={1} mb={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.2} fw={500}>{card.label}</Text>
                  <Text size="xs" c="dimmed" lh={1.2} mt={2} style={{ opacity: 0.7 }}>{card.sub}</Text>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Box>

        {/* Module Content */}
        <Suspense fallback={<ModuleLoader />}>
          {renderContent()}
        </Suspense>
      </Stack>
    </ExecutivePortalLayout>
  );
};
 
export default CEOPortal;
