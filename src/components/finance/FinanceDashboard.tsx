import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Progress,
  Paper,
  Button,
  Alert,
  Title,
  Divider,
  Table,
  ActionIcon,
  Tooltip,
  RingProgress,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChecklist,
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconBuildingBank,
  IconFileText,
  IconUsers,
  IconClock,
  IconArrowRight,
} from '@tabler/icons-react';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface FinanceMetrics {
  pendingApprovals: number;
  openInvoices: number;
  overdueReceivables: number;
  activeBudgets: number;
  expenseRequestsToday: number;
  publicReports: number;
}

export const FinanceDashboard: React.FC = () => {
  const { getPrimaryRole } = useFinanceRBAC();
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Pending approvals for this user (as approver or requester)
      const { data: approvalsData } = await supabase
        .from('approval_queue')
        .select('*')
        .eq('status', 'pending')
        .or(
          user
            ? `current_approver_user_id.eq.${user.id},requested_by.eq.${user.id}`
            : 'current_approver_user_id.is.null'
        )
        .order('requested_at', { ascending: false })
        .limit(10);

      setPendingApprovals(approvalsData || []);

      // Aggregate finance metrics from real tables
      const today = dayjs().format('YYYY-MM-DD');

      const [
        { count: openInvoices },
        { count: overdueReceivables },
        { count: activeBudgets },
        { count: expenseRequestsToday },
        { count: publicReports },
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'approved']),
        supabase
          .from('accounts_receivable')
          .select('*', { count: 'exact', head: true })
          .lte('due_date', today)
          .neq('status', 'paid'),
        supabase
          .from('budgets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('expense_requests')
          .select('*', { count: 'exact', head: true })
          .eq('expense_date', today),
        supabase
          .from('financial_reports')
          .select('*', { count: 'exact', head: true })
          .eq('is_public', true),
      ]);

      setMetrics({
        pendingApprovals: approvalsData?.length || 0,
        openInvoices: openInvoices || 0,
        overdueReceivables: overdueReceivables || 0,
        activeBudgets: activeBudgets || 0,
        expenseRequestsToday: expenseRequestsToday || 0,
        publicReports: publicReports || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const primaryRole = getPrimaryRole();

  const getDashboardContent = () => {
    if (!primaryRole || !metrics) return null;

    switch (primaryRole.role_code) {
      case 'CFO':
        return <CFODashboardView metrics={metrics} pendingApprovals={pendingApprovals} />;
      case 'CONTROLLER':
        return <ControllerDashboardView metrics={metrics} pendingApprovals={pendingApprovals} />;
      case 'AP_SPECIALIST':
        return <APSpecialistDashboardView metrics={metrics} pendingApprovals={pendingApprovals} />;
      case 'AR_SPECIALIST':
        return <ARSpecialistDashboardView metrics={metrics} pendingApprovals={pendingApprovals} />;
      case 'VP_FINANCE':
      case 'FP&A_ANALYST':
        return <FPADashboardView metrics={metrics} pendingApprovals={pendingApprovals} />;
      default:
        return <GenericDashboardView metrics={metrics} pendingApprovals={pendingApprovals} role={primaryRole} />;
    }
  };

  if (loading || !metrics) {
    return (
      <Stack align="center" mt="xl">
        <Text>Loading dashboard...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      {/* Welcome Header */}
      <Paper p="lg" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Group justify="space-between">
          <div>
            <Title order={2} c="white" mb="xs">
              Welcome to Finance Portal
            </Title>
            <Text c="rgba(255,255,255,0.9)" size="sm">
              {primaryRole?.role_name || 'Finance Professional'}
            </Text>
          </div>
          <Badge size="xl" variant="filled" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            {dayjs().format('MMMM D, YYYY')}
          </Badge>
        </Group>
      </Paper>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={`${pendingApprovals.length} Pending Approval${pendingApprovals.length > 1 ? 's' : ''}`}
          color="orange"
        >
          <Group justify="space-between" mt="xs">
            <Text size="sm">You have items requiring your approval</Text>
            <Button size="xs" variant="light" onClick={() => (window.location.href = '/cfo')}>
              Review Now
            </Button>
          </Group>
        </Alert>
      )}

      {/* Role-Specific Dashboard Content */}
      {getDashboardContent()}
    </Stack>
  );
};

// CFO Dashboard View
const CFODashboardView: React.FC<{ metrics: FinanceMetrics; pendingApprovals: any[] }> = ({
  metrics,
  pendingApprovals,
}) => (
  <>
    <Grid>
      <Grid.Col span={3}>
        <Card p="lg" withBorder style={{ borderLeft: '4px solid #10b981' }}>
          <Text size="xs" c="dimmed" mb={4}>
            Open Invoices
          </Text>
          <Text fw={700} size="xl" c="green">
            {metrics.openInvoices.toLocaleString()}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={3}>
        <Card p="lg" withBorder style={{ borderLeft: '4px solid #3b82f6' }}>
          <Text size="xs" c="dimmed" mb={4}>
            Overdue Receivables
          </Text>
          <Text fw={700} size="xl" c="blue">
            {metrics.overdueReceivables.toLocaleString()}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={3}>
        <Card p="lg" withBorder style={{ borderLeft: '4px solid #8b5cf6' }}>
          <Text size="xs" c="dimmed" mb={4}>
            Active Budgets
          </Text>
          <Text fw={700} size="xl" c="violet">
            {metrics.activeBudgets.toLocaleString()}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={3}>
        <Card p="lg" withBorder style={{ borderLeft: '4px solid #f59e0b' }}>
          <Text size="xs" c="dimmed" mb={4}>
            Pending Approvals
          </Text>
          <Text fw={700} size="xl" c="orange">
            {pendingApprovals.length}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">Require attention</Text>
        </Card>
      </Grid.Col>
    </Grid>

    <Grid mt="md">
      <Grid.Col span={8}>
        <Card p="lg" withBorder>
          <Title order={4} mb="md">
            Expense Requests Today
          </Title>
          <Progress value={Math.min(metrics.expenseRequestsToday, 100)} size="xl" radius="xl" />
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              {metrics.expenseRequestsToday} request{metrics.expenseRequestsToday === 1 ? '' : 's'} today
            </Text>
            <Text size="sm" c="dimmed">Based on expense_requests</Text>
          </Group>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card p="lg" withBorder>
          <Title order={4} mb="md">
            Critical Items
          </Title>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm">High-Value Approvals</Text>
              <Badge color="red">{pendingApprovals.filter(a => (a.amount || 0) > 50000).length}</Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Public Reports</Text>
              <Badge color="orange">{metrics.publicReports}</Badge>
            </Group>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  </>
);

// Controller Dashboard View
const ControllerDashboardView: React.FC<{ metrics: FinanceMetrics; pendingApprovals: any[] }> = ({
  metrics,
  pendingApprovals,
}) => (
  <>
    <Grid>
      <Grid.Col span={4}>
        <Card p="lg" withBorder>
          <Text size="xs" c="dimmed" mb={4}>
            Pending Approvals
          </Text>
          <Text fw={700} size="2xl">{pendingApprovals.length}</Text>
          <Button size="xs" variant="light" mt="md" fullWidth>
            Review Queue
          </Button>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card p="lg" withBorder>
          <Text size="xs" c="dimmed" mb={4}>
            Open Invoices
          </Text>
          <RingProgress
            size={120}
            thickness={12}
            sections={[{ value: Math.min(metrics.openInvoices, 100), color: 'blue' }]}
            label={
              <Text c="blue" fw={700} ta="center" size="xl">
                {metrics.openInvoices}
              </Text>
            }
          />
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card p="lg" withBorder>
          <Text size="xs" c="dimmed" mb={4}>
            Overdue Receivables
          </Text>
          <Text fw={700} size="2xl">{metrics.overdueReceivables}</Text>
          <Text size="xs" c="dimmed" mt="xs">Require attention</Text>
        </Card>
      </Grid.Col>
    </Grid>
  </>
);

// AP Specialist Dashboard View
const APSpecialistDashboardView: React.FC<{ metrics: FinanceMetrics; pendingApprovals: any[] }> = ({
  metrics,
}) => (
  <Card p="lg" withBorder>
    <Title order={4} mb="md">
      Accounts Payable Dashboard
    </Title>
    <Text c="dimmed">Open invoices: {metrics.openInvoices}</Text>
  </Card>
);

// AR Specialist Dashboard View
const ARSpecialistDashboardView: React.FC<{ metrics: FinanceMetrics; pendingApprovals: any[] }> = ({
  metrics,
}) => (
  <Card p="lg" withBorder>
    <Title order={4} mb="md">
      Accounts Receivable Dashboard
    </Title>
    <Text c="dimmed">Overdue receivables: {metrics.overdueReceivables}</Text>
  </Card>
);

// FP&A Dashboard View
const FPADashboardView: React.FC<{ metrics: FinanceMetrics; pendingApprovals: any[] }> = ({ metrics }) => (
  <Card p="lg" withBorder>
    <Title order={4} mb="md">
      Financial Planning &amp; Analysis Dashboard
    </Title>
    <Text c="dimmed">Active budgets: {metrics.activeBudgets}</Text>
  </Card>
);

// Generic Dashboard View
const GenericDashboardView: React.FC<{
  metrics: FinanceMetrics;
  pendingApprovals: any[];
  role: any;
}> = ({ role, metrics }) => (
  <Card p="lg" withBorder>
    <Title order={4} mb="md">
      {role.role_name} Dashboard
    </Title>
    <Text c="dimmed">
      Pending approvals: {metrics.pendingApprovals} • Expense requests today: {metrics.expenseRequestsToday}
    </Text>
  </Card>
);

