// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Grid,
  Badge,
  Loader,
  Center,
  RingProgress,
  Progress,
  Alert,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconAlertTriangle,
  IconShield,
  IconFileCheck,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AuditMetrics } from './types';

interface AuditDashboardProps {
  onNavigate?: (section: string) => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const now = dayjs();
      const startOfMonth = now.startOf('month');
      const startOfQuarter = now.startOf('quarter');
      const startOfYear = now.startOf('year');

      // Fetch revenue and expenses
      const [revenueMTD, revenueQTD, revenueYTD, expensesMTD, expensesQTD, expensesYTD] = await Promise.all([
        // Revenue MTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'revenue')
          .gte('transaction_date', startOfMonth.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
        
        // Revenue QTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'revenue')
          .gte('transaction_date', startOfQuarter.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
        
        // Revenue YTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'revenue')
          .gte('transaction_date', startOfYear.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
        
        // Expenses MTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'expense')
          .gte('transaction_date', startOfMonth.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
        
        // Expenses QTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'expense')
          .gte('transaction_date', startOfQuarter.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
        
        // Expenses YTD
        supabase
          .from('audit_logs')
          .select('amount')
          .eq('transaction_type', 'expense')
          .gte('transaction_date', startOfYear.format('YYYY-MM-DD'))
          .lte('transaction_date', now.format('YYYY-MM-DD'))
          .eq('status', 'cleared'),
      ]);

      const totalRevenueMTD = (revenueMTD.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalRevenueQTD = (revenueQTD.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalRevenueYTD = (revenueYTD.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalExpensesMTD = (expensesMTD.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpensesQTD = (expensesQTD.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpensesYTD = (expensesYTD.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);

      // Fetch flags and compliance metrics
      const [flagsRes, highRiskRes, unreconciledRes, missingDocsRes] = await Promise.all([
        supabase.from('audit_flags').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('severity', 'high').or('severity.eq.critical'),
        supabase.from('reconciliation_bank').select('id', { count: 'exact', head: true }).neq('status', 'reconciled'),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('has_documentation', false),
      ]);

      // Fetch cash and AR/AP (simplified - would need actual tables)
      const cashOnHand = 0; // Would fetch from bank_accounts
      const accountsPayable = totalExpensesMTD; // Simplified
      const accountsReceivable = totalRevenueMTD * 0.2; // Simplified

      const netIncomeMTD = totalRevenueMTD - totalExpensesMTD;
      const netOperatingMargin = totalRevenueMTD > 0 ? (netIncomeMTD / totalRevenueMTD) * 100 : 0;
      const burnRate = totalExpensesMTD / 30; // Daily burn rate
      const runwayMonths = cashOnHand > 0 && burnRate > 0 ? (cashOnHand / (burnRate * 30)) : 0;

      setMetrics({
        totalRevenueMTD,
        totalRevenueQTD,
        totalRevenueYTD,
        totalExpensesMTD,
        totalExpensesQTD,
        totalExpensesYTD,
        netOperatingMargin,
        cashOnHand,
        accountsPayable,
        accountsReceivable,
        burnRate,
        runwayMonths,
        internalControlStatus: (flagsRes.count || 0) > 10 ? 'critical' : (flagsRes.count || 0) > 5 ? 'needs_attention' : 'compliant',
        outstandingFlags: flagsRes.count || 0,
        highRiskTransactions: highRiskRes.count || 0,
        unreconciledAccountsCount: unreconciledRes.count || 0,
        missingDocumentationCount: missingDocsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching audit metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!metrics) {
    return <Alert color="red">Failed to load audit metrics</Alert>;
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Stack gap="lg">
      <Card p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
        <Group justify="space-between" mb="lg">
          <div>
            <Text size="xl" fw={700} mb="xs">Audit Dashboard Overview</Text>
            <Text c="dimmed" size="sm">Comprehensive financial metrics and compliance status</Text>
          </div>
          <Badge size="lg" color="blue" leftSection={<IconShield size={16} />}>
            {dayjs().format('MMMM YYYY')}
          </Badge>
        </Group>

        {/* Key Indicators */}
        <Text fw={700} size="lg" mb="md">Key Financial Indicators</Text>
        <Grid gutter="md" mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" style={{ backgroundColor: '#ecfdf5' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Revenue (MTD)</Text>
                <IconTrendingUp size={20} color="#10b981" />
              </Group>
              <Text fw={700} size="xl" c="green">{formatCurrency(metrics.totalRevenueMTD)}</Text>
              <Text size="xs" c="dimmed" mt={4}>
                QTD: {formatCurrency(metrics.totalRevenueQTD)} | YTD: {formatCurrency(metrics.totalRevenueYTD)}
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" style={{ backgroundColor: '#fef2f2' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Expenses (MTD)</Text>
                <IconTrendingDown size={20} color="#ef4444" />
              </Group>
              <Text fw={700} size="xl" c="red">{formatCurrency(metrics.totalExpensesMTD)}</Text>
              <Text size="xs" c="dimmed" mt={4}>
                QTD: {formatCurrency(metrics.totalExpensesQTD)} | YTD: {formatCurrency(metrics.totalExpensesYTD)}
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" style={{ backgroundColor: '#eff6ff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Net Operating Margin</Text>
                <IconCurrencyDollar size={20} color="#3b82f6" />
              </Group>
              <Text fw={700} size="xl" c={metrics.netOperatingMargin >= 0 ? 'green' : 'red'}>
                {metrics.netOperatingMargin.toFixed(2)}%
              </Text>
              <RingProgress
                size={60}
                thickness={8}
                sections={[{ value: Math.abs(metrics.netOperatingMargin), color: metrics.netOperatingMargin >= 0 ? 'green' : 'red' }]}
                mt="xs"
              />
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" style={{ backgroundColor: '#f0fdf4' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">Cash on Hand</Text>
                <IconCurrencyDollar size={20} color="#22c55e" />
              </Group>
              <Text fw={700} size="xl" c="green">{formatCurrency(metrics.cashOnHand)}</Text>
              <Text size="xs" c="dimmed" mt={4}>
                Runway: {metrics.runwayMonths.toFixed(1)} months
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed" mb="xs">Accounts Payable</Text>
              <Text fw={700} size="lg">{formatCurrency(metrics.accountsPayable)}</Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed" mb="xs">Accounts Receivable</Text>
              <Text fw={700} size="lg">{formatCurrency(metrics.accountsReceivable)}</Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed" mb="xs">Burn Rate (Daily)</Text>
              <Text fw={700} size="lg">{formatCurrency(metrics.burnRate)}</Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed" mb="xs">Runway</Text>
              <Text fw={700} size="lg">{metrics.runwayMonths.toFixed(1)} months</Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Compliance Snapshot */}
        <Text fw={700} size="lg" mb="md">Compliance Snapshot</Text>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="md" style={{ 
              backgroundColor: metrics.internalControlStatus === 'critical' ? '#fef2f2' : 
                              metrics.internalControlStatus === 'needs_attention' ? '#fef3c7' : '#ecfdf5'
            }}>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Internal Control Status</Text>
                <Badge 
                  color={metrics.internalControlStatus === 'critical' ? 'red' : 
                         metrics.internalControlStatus === 'needs_attention' ? 'yellow' : 'green'}
                  size="lg"
                >
                  {metrics.internalControlStatus === 'critical' ? 'Critical' : 
                   metrics.internalControlStatus === 'needs_attention' ? 'Needs Attention' : 'Compliant'}
                </Badge>
              </Group>
              <Progress 
                value={metrics.internalControlStatus === 'critical' ? 30 : 
                       metrics.internalControlStatus === 'needs_attention' ? 60 : 100}
                color={metrics.internalControlStatus === 'critical' ? 'red' : 
                       metrics.internalControlStatus === 'needs_attention' ? 'yellow' : 'green'}
                size="lg"
              />
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconAlertTriangle size={20} color="#ef4444" />
                    <Text fw={600}>Outstanding Flags</Text>
                  </Group>
                  <Badge color="red" size="lg">{metrics.outstandingFlags}</Badge>
                </Group>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconShield size={20} color="#f59e0b" />
                    <Text fw={600}>High-Risk Transactions</Text>
                  </Group>
                  <Badge color="orange" size="lg">{metrics.highRiskTransactions}</Badge>
                </Group>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconClock size={20} color="#6366f1" />
                    <Text fw={600}>Unreconciled Accounts</Text>
                  </Group>
                  <Badge color="blue" size="lg">{metrics.unreconciledAccountsCount}</Badge>
                </Group>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconFileCheck size={20} color="#8b5cf6" />
                    <Text fw={600}>Missing Documentation</Text>
                  </Group>
                  <Badge color="purple" size="lg">{metrics.missingDocumentationCount}</Badge>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Card>
    </Stack>
  );
};



