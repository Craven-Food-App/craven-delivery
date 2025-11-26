import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { NeonMetricCard } from '@/components/finance/NeonMetricCard';
import { type LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Users,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '../../styles/neon-finance.css';

interface AdvancedKPI {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: LucideIcon;
}

export const EnhancedCFODashboard: React.FC = () => {
  const [advancedKPIs, setAdvancedKPIs] = useState<AdvancedKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnhancedData();
    const interval = setInterval(() => {
      try {
        fetchEnhancedData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      const [orders, invoices, bankAccounts] = await Promise.all([
        supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('invoices').select('amount, due_date, status'),
        supabase.from('bank_accounts').select('current_balance, currency'),
      ]);

      const now = new Date();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthKey: date.toISOString().slice(0, 7),
        };
      });

      const monthlyData = last12Months.map(({ month, monthKey }) => {
        const monthOrders = (orders.data || []).filter((o: any) => {
          const orderDate = new Date(o.created_at);
          return orderDate.toISOString().slice(0, 7) === monthKey;
        });
        const revenue = (monthOrders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / 1000;
        const cogs = revenue * 0.36;
        const opEx = revenue * 0.25;
        const profit = revenue - cogs - opEx;
        return { month, Revenue: revenue, COGS: cogs, Operating_Expenses: opEx, Profit: profit };
      });

      const currentMonth = monthlyData[monthlyData.length - 1];
      const previousMonth = monthlyData[monthlyData.length - 2] || monthlyData[0];

      const totalCash = (bankAccounts.data || []).reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);
      const apPending = (invoices.data || []).filter((i: any) => i.status === 'pending' || i.status === 'approved').length;
      const burnRate = currentMonth.Operating_Expenses * 1000;
      const runway = totalCash > 0 && burnRate > 0 ? Math.floor(totalCash / burnRate) : 0;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      const revenueChange = calculateChange(currentMonth.Revenue, previousMonth.Revenue);
      const marginChange = calculateChange(
        currentMonth.Revenue > 0 ? ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue) * 100 : 0,
        previousMonth.Revenue > 0 ? ((previousMonth.Revenue - previousMonth.COGS) / previousMonth.Revenue) * 100 : 0
      );

      setAdvancedKPIs([
        {
          title: 'Total Cash Position',
          value: `$${(totalCash / 1000000).toFixed(2)}M`,
          subtitle: 'All bank accounts',
          icon: DollarSign,
        },
        {
          title: 'Cash Runway',
          value: `${runway} months`,
          subtitle: 'At current burn rate',
          trend: runway > 12 ? 'up' : runway > 6 ? 'neutral' : 'down',
          icon: Clock,
        },
        {
          title: 'Monthly Recurring Revenue',
          value: `$${currentMonth.Revenue.toFixed(0)}K`,
          trendValue: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
          subtitle: 'vs last month',
          trend: revenueChange > 0 ? 'up' : 'down',
          icon: TrendingUp,
        },
        {
          title: 'Gross Margin',
          value: `${currentMonth.Revenue > 0 ? ((currentMonth.Revenue - currentMonth.COGS) / currentMonth.Revenue * 100).toFixed(1) : 0}%`,
          trendValue: `${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)}pp`,
          subtitle: 'vs last month',
          trend: marginChange > 0 ? 'up' : 'down',
          icon: Target,
        },
        {
          title: 'Operating Cash Flow',
          value: `$${currentMonth.Profit.toFixed(0)}K`,
          trendValue: `${calculateChange(currentMonth.Profit, previousMonth.Profit) > 0 ? '+' : ''}${calculateChange(currentMonth.Profit, previousMonth.Profit).toFixed(1)}%`,
          subtitle: 'vs last month',
          trend: currentMonth.Profit > 0 ? 'up' : 'down',
          icon: DollarSign,
        },
        {
          title: 'AP Pending',
          value: `${apPending}`,
          subtitle: 'Invoices awaiting approval',
          trend: apPending < 10 ? 'up' : 'neutral',
          icon: AlertTriangle,
        },
        {
          title: 'Debt-to-Equity Ratio',
          value: '0.45x',
          subtitle: 'vs Industry: 0.6x',
          trend: 'up',
          icon: Shield,
        },
        {
          title: 'Active Employees',
          value: '24',
          subtitle: 'Full-time team members',
          icon: Users,
        },
      ]);

    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="CFO Command Center"
        subtitle="Real-time financial intelligence and analytics"
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {advancedKPIs.map((kpi, idx) => (
            <NeonMetricCard
              key={idx}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={<kpi.icon size={24} />}
              trend={kpi.trend}
              trendValue={kpi.trendValue}
              glow={idx < 3}
              pulse={idx === 0}
            />
          ))}
        </Box>
      </FinancePortalLayout>
    </ThemeProvider>
  );
};
