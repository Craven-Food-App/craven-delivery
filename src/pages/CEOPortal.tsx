import React, { useEffect, useState, useMemo } from 'react';
import {
  Grid,
  Badge,
  Button,
  Group,
  Stack,
  Alert,
  Title,
  Text,
  Divider,
  Card,
  Paper,
  Loader,
  Box,
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
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PersonnelManager } from '@/components/ceo/PersonnelManager';
import { FinancialApprovals } from '@/components/ceo/FinancialApprovals';
import { CodeChangeQueue } from '@/components/ceo/CodeChangeQueue';
import { EmergencyControls } from '@/components/ceo/EmergencyControls';
import { StrategicPlanning } from '@/components/ceo/StrategicPlanning';
import { StrategicMindMap } from '@/components/ceo/StrategicMindMap';
import { AuditTrail } from '@/components/ceo/AuditTrail';
import { QuickActions } from '@/components/ceo/QuickActions';
import { EquityDashboard } from '@/components/ceo/EquityDashboard';
import ExecutiveCommunicationsCenter from '@/components/executive/ExecutiveCommunicationsCenter';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import CEOSignatureManager from '@/components/ceo/CEOSignatureManager';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';
import ActiveUsersMonitor from '@/components/ceo/ActiveUsersMonitor';
// No Card components: full-page Ant layout

interface CEOMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  cashFlow: number;
  burnRate: number;
  runway: number;
  totalEmployees: number;
  admins: number;
  feeders: number;
  merchants: number;
  pendingApprovals: number;
  pendingCodeChanges: number;
  criticalAlerts: number;
}

const CEOPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth('ceo');
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Track user activity
  useActivityTracking('ceo');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('ceo');

  const navItems = useMemo<ExecutiveNavItem[]>(() => {
    const totalEmployees = metrics?.totalEmployees ?? 0;
    const pendingApprovals = metrics?.pendingApprovals ?? 0;
    const pendingCodeChanges = metrics?.pendingCodeChanges ?? 0;

    return [
      { id: 'overview', label: 'Command Center', icon: IconChartBar as any },
      {
        id: 'personnel',
        label: `Manage People (${totalEmployees})`,
        icon: IconUsers as any,
      },
      {
        id: 'financial',
        label:
          pendingApprovals > 0
            ? `Approve Spend (${pendingApprovals})`
            : 'Approve Spend',
        icon: IconCurrencyDollar as any,
      },
      {
        id: 'code-changes',
        label:
          pendingCodeChanges > 0
            ? `Code Changes (${pendingCodeChanges})`
            : 'Code Changes',
        icon: IconCode as any,
      },
      { id: 'equity', label: 'Review Equity', icon: IconTrophy as any },
      { id: 'strategic', label: 'Drive Strategy', icon: IconRocket as any },
      { id: 'mindmap', label: 'Map Decisions', icon: IconBulb as any },
      { id: 'emergency', label: 'Run Emergency Playbooks', icon: IconShield as any },
      { id: 'audit', label: 'Audit Activity', icon: IconFileText as any },
      { id: 'signature', label: 'Sign Documents', icon: IconPencil as any },
      { id: 'communications', label: 'Direct Communications', icon: IconMail as any },
      { id: 'word', label: 'Draft Briefings', icon: IconFileText as any },
      { id: 'active-users', label: 'Active Users', icon: IconUsers as any },
      { id: 'accountability', label: 'Executive Accountability', icon: IconShield as any },
    ];
  }, [metrics?.totalEmployees, metrics?.pendingApprovals, metrics?.pendingCodeChanges]);

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
    <Group wrap="wrap">
      <Button
        color="red"
        leftSection={<IconAlertTriangle size={16} />}
        onClick={() => setActiveTab('emergency')}
      >
        Emergency
      </Button>
      <Button variant="default" onClick={handleNavigateToCFO}>CFO Portal</Button>
      <Button onClick={() => navigate('/admin')}>
        Admin Portal
      </Button>
      <Button variant="default" onClick={() => navigate('/board')}>Board Portal</Button>
    </Group>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <QuickActions onNavigate={setActiveTab} />;
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
      case 'communications':
        return <ExecutiveCommunicationsCenter defaultTab="messages" />;
      case 'word':
        return <ExecutiveWordProcessor storageKey="ceo" />;
      case 'active-users':
        return <ActiveUsersMonitor />;
      case 'accountability':
        navigate('/executive/discipline');
        return <QuickActions onNavigate={setActiveTab} />;
      default:
        return <QuickActions onNavigate={setActiveTab} />;
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
      
      // Set up auto-refresh every 60 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
      // This only updates component state, NEVER causes page reloads
      const interval = setInterval(() => {
        // Wrap in try-catch to prevent any errors from causing issues
        try {
          fetchCEOMetrics();
        } catch (error) {
          console.error('Error in auto-refresh interval:', error);
          // Silently handle - don't cause page reload or navigation
        }
      }, 60000);
      
      // Set up real-time subscription for orders - COMPONENT-LEVEL DATA REFRESH ONLY
      const ordersChannel = supabase
        .channel('ceo_orders_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            // Only update state, never navigate or reload
            try {
              fetchCEOMetrics();
            } catch (error) {
              console.error('Error in real-time subscription callback:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ceo_financial_approvals',
          },
          () => {
            // Only update state, never navigate or reload
            try {
              fetchCEOMetrics();
            } catch (error) {
              console.error('Error in real-time subscription callback:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'code_change_requests',
          },
          () => {
            // Only update state, never navigate or reload
            try {
              fetchCEOMetrics();
            } catch (error) {
              console.error('Error in real-time subscription callback:', error);
            }
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        ordersChannel.unsubscribe();
      };
    }
  }, [isAuthorized]);

  const fetchCEOMetrics = async () => {
    try {
      // Fetch real metrics from database
      const [employeesRes, approvalsRes, ordersRes, codeChangesRes] = await Promise.all([
        supabase.from('employees').select('id, employment_status, salary'),
        supabase.from('ceo_financial_approvals').select('id, status, amount'),
        supabase.from('orders').select('id, total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('code_change_requests').select('id, status', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      const employees = employeesRes.data || [];
      const activeEmployees = employees.filter(e => e.employment_status === 'active');
      const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
      
      const approvals = approvalsRes.data || [];
      const pendingApprovals = approvals.filter(a => a.status === 'pending');
      
      const orders = ordersRes.data || [];
      const monthlyRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const pendingCodeChanges = codeChangesRes.count || 0;

      setMetrics({
        totalRevenue: monthlyRevenue,
        revenueGrowth: 15.2, // Calculate from historical data
        cashFlow: monthlyRevenue * 0.35, // Estimated
        burnRate: totalPayroll / 12,
        runway: monthlyRevenue > 0 ? Math.floor((monthlyRevenue * 0.35) / (totalPayroll / 12)) : 0,
        totalEmployees: employees.length,
        admins: activeEmployees.length,
        feeders: 0, // From feeders table when available
        merchants: 0, // From merchants table when available
        pendingApprovals: pendingApprovals.length,
        pendingCodeChanges: pendingCodeChanges,
        criticalAlerts: 0,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching CEO metrics:', error);
      // Fallback to defaults if error
      setMetrics({
        totalRevenue: 0,
        revenueGrowth: 0,
        cashFlow: 0,
        burnRate: 0,
        runway: 0,
        totalEmployees: 0,
        admins: 0,
        feeders: 0,
        merchants: 0,
        pendingApprovals: 0,
        pendingCodeChanges: 0,
        criticalAlerts: 0,
      });
    }
  };

  if (loading) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="white" size="lg">Verifying access...</Text>
        </Stack>
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
          padding: '1rem',
        }}
      >
        <Card w="100%" maw={500} p="xl">
          <Stack gap="md" align="center">
            <Title order={2} c="red" ta="center" fw={700}>
              Access Denied
            </Title>
            <Text size="lg" ta="center">You don't have CEO access to this portal.</Text>
            <Text size="sm" c="dimmed" ta="center">
              This portal is restricted to the Chief Executive Officer only.
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Logged in as: <Text component="span" fw={600}>{user?.email}</Text>
            </Text>
            <Group gap="md" mt="md" w="100%">
              <Button variant="default" onClick={() => navigate('/')} style={{ flex: 1 }}>
                Go Home
              </Button>
              <Button color="red" onClick={signOut} style={{ flex: 1 }}>
                Sign Out
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <ExecutivePortalLayout
      title="CEO Portal"
      subtitle="Executive leadership command center"
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
        {metrics?.criticalAlerts && metrics.criticalAlerts > 0 && (
          <Alert
            title={`${metrics.criticalAlerts} Critical Alert${metrics.criticalAlerts > 1 ? 's' : ''}`}
            color="red"
            icon={<IconAlertTriangle size={16} />}
            styles={{
              root: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            }}
          >
            <Group justify="space-between" align="center" w="100%">
              <Text>Immediate action required. Click to view details.</Text>
              <Button size="sm" color="red" onClick={() => setActiveTab('emergency')}>
                View Now
              </Button>
            </Group>
          </Alert>
        )}

        <Stack gap="md">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Title order={3}>Company Health</Title>
            <Badge color="blue" variant="light">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          </Group>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Monthly Revenue</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {formatCurrency(metrics?.totalRevenue ?? 0)}
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">
                    Revenue Growth: {metrics?.revenueGrowth ?? 0}%
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Cash Flow</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {formatCurrency(metrics?.cashFlow ?? 0)}
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">
                    Burn Rate {(metrics?.burnRate ?? 0).toLocaleString()}
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Runway</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {metrics?.runway ?? 0} mo
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">
                    Admin Staff: {metrics?.admins ?? 0}
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Headcount</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {metrics?.totalEmployees ?? 0}
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">
                    Admins: {metrics?.admins ?? 0} • Feeders: {metrics?.feeders ?? 0}
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Pending Approvals</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {metrics?.pendingApprovals ?? 0}
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">
                    Requires your attention
                  </Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper bg="#ff6e00" p="md" h="100%" style={{ borderRadius: '8px' }}>
                <Stack gap="xs">
                  <Text c="white" fw={600} size="sm">Merchants</Text>
                  <Text c="white" size="xl" fw={700} style={{ fontSize: '24px' }}>
                    {metrics?.merchants ?? 0}
                  </Text>
                  <Text c="rgba(255, 255, 255, 0.9)" size="xs" mt="xs">Active partners</Text>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>

        <Stack gap="xl">{renderContent()}</Stack>

        <Divider />

      </Stack>
    </ExecutivePortalLayout>
  );
};
 
export default CEOPortal;

