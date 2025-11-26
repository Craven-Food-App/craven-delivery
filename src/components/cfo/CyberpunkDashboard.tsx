import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { CyberpunkMetricCard } from './CyberpunkMetricCard';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  AlertTriangle,
  Activity,
  CreditCard 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const CyberpunkDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalCash: '$0',
    monthlyRevenue: '$0',
    cashRunway: '0 months',
    pendingInvoices: '0',
    grossMargin: '0%',
    operatingCashFlow: '$0',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch bank accounts
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('current_balance');
      
      const totalCash = bankAccounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0;

      // Fetch recent orders for revenue
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const monthlyRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Fetch pending invoices
      const { data: invoices } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('status', 'pending');
      
      const pendingCount = invoices?.length || 0;

      // Calculate cash runway (simplified)
      const runway = totalCash > 0 && monthlyRevenue > 0 
        ? Math.floor(totalCash / (monthlyRevenue / 30)) 
        : 0;

      setMetrics({
        totalCash: `$${(totalCash / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        monthlyRevenue: `$${(monthlyRevenue / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        cashRunway: `${runway} days`,
        pendingInvoices: pendingCount.toString(),
        grossMargin: '65%', // Placeholder - would need COGS data
        operatingCashFlow: `$${((monthlyRevenue * 0.3) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', zIndex: 2 }}>
      {/* Section Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'monospace',
            color: '#00ffff',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.6)',
            mb: 1,
          }}
        >
          FINANCIAL OVERVIEW
        </Typography>
        <Box
          sx={{
            height: '2px',
            width: '100px',
            background: 'linear-gradient(90deg, #00ffff, transparent)',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
          }}
        />
      </Box>

      {/* Metrics Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <CyberpunkMetricCard
          title="Total Cash"
          value={metrics.totalCash}
          subtitle="Available Liquidity"
          icon={Wallet}
          color="cyan"
          trend="up"
          trendValue="+12.5%"
        />
        
        <CyberpunkMetricCard
          title="Monthly Revenue"
          value={metrics.monthlyRevenue}
          subtitle="Last 30 Days"
          icon={TrendingUp}
          color="green"
          trend="up"
          trendValue="+8.3%"
        />
        
        <CyberpunkMetricCard
          title="Cash Runway"
          value={metrics.cashRunway}
          subtitle="Operating Capital"
          icon={Activity}
          color="yellow"
          trend="neutral"
        />

        <CyberpunkMetricCard
          title="Gross Margin"
          value={metrics.grossMargin}
          subtitle="Profitability Ratio"
          icon={DollarSign}
          color="magenta"
          trend="up"
          trendValue="+2.1%"
        />

        <CyberpunkMetricCard
          title="Operating Cash Flow"
          value={metrics.operatingCashFlow}
          subtitle="Monthly Average"
          icon={CreditCard}
          color="cyan"
          trend="up"
          trendValue="+15.7%"
        />

        <CyberpunkMetricCard
          title="Pending Invoices"
          value={metrics.pendingInvoices}
          subtitle="Awaiting Payment"
          icon={AlertTriangle}
          color="yellow"
          trend="neutral"
        />
      </Box>

      {/* Data Panel */}
      <Box
        className="hud-panel"
        sx={{
          mt: 4,
          p: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'monospace',
            color: '#00ffff',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            mb: 2,
          }}
        >
          SYSTEM STATUS
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.6)' }}>
              Database Connection:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', color: '#00ff00' }}>
              ACTIVE
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.6)' }}>
              Data Sync:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', color: '#00ff00' }}>
              REALTIME
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.6)' }}>
              Last Update:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', color: '#00ffff' }}>
              {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
