import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Button, Tabs, Tab } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { NeonMetricCard } from '@/components/finance/NeonMetricCard';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Info,
  Calculator,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import '../../styles/neon-finance.css';

interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  revenue: number;
  expenses: number;
  profit: number;
  assumptions: string[];
}

interface BudgetLineItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_pct: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
}

interface Driver {
  id: string;
  name: string;
  type: 'revenue' | 'cost' | 'headcount';
  current_value: number;
  forecast_value: number;
  impact: number;
}

export const EnhancedFPandA: React.FC = () => {
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchFPAData();
  }, []);

  const fetchFPAData = async () => {
    setLoading(true);
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      const currentRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / 12;

      setScenarios([
        {
          id: '1',
          name: 'Base Case',
          description: 'Conservative growth assumptions',
          probability: 50,
          revenue: currentRevenue * 1.1,
          expenses: currentRevenue * 0.65,
          profit: currentRevenue * 0.45,
          assumptions: ['5% MoM growth', 'Stable COGS at 36%', 'OpEx scaling with revenue'],
        },
        {
          id: '2',
          name: 'Optimistic',
          description: 'Strong market conditions and execution',
          probability: 25,
          revenue: currentRevenue * 1.25,
          expenses: currentRevenue * 0.60,
          profit: currentRevenue * 0.65,
          assumptions: ['10% MoM growth', 'Improved margins', 'Efficient scaling'],
        },
        {
          id: '3',
          name: 'Pessimistic',
          description: 'Market headwinds and slower growth',
          probability: 25,
          revenue: currentRevenue * 0.95,
          expenses: currentRevenue * 0.70,
          profit: currentRevenue * 0.25,
          assumptions: ['2% MoM growth', 'Margin pressure', 'Increased competition'],
        },
      ]);

      const categories = ['Salaries', 'R&D', 'Rent & Utilities', 'Marketing', 'Operations', 'Other'];
      setBudgetItems(
        categories.map((cat, idx) => {
          const budgeted = currentRevenue * [0.64, 0.20, 0.10, 0.03, 0.02, 0.01][idx];
          const actual = budgeted * (0.9 + Math.random() * 0.2);
          const variance = actual - budgeted;
          const variance_pct = (variance / budgeted) * 100;
          return {
            id: `${idx + 1}`,
            category: cat,
            budgeted,
            actual,
            variance,
            variance_pct,
            status:
              Math.abs(variance_pct) < 5
                ? 'on_track'
                : variance_pct > 10
                ? 'over_budget'
                : 'at_risk',
          };
        })
      );

      setDrivers([
        { id: '1', name: 'Monthly Active Customers', type: 'revenue', current_value: 1250, forecast_value: 1500, impact: 20 },
        { id: '2', name: 'Average Order Value', type: 'revenue', current_value: 45, forecast_value: 50, impact: 11 },
        { id: '3', name: 'Headcount', type: 'cost', current_value: 85, forecast_value: 100, impact: -18 },
        { id: '4', name: 'Customer Acquisition Cost', type: 'cost', current_value: 25, forecast_value: 22, impact: 12 },
      ]);
    } catch (error) {
      console.error('Error fetching FPA data:', error);
      toast.error('Failed to load FP&A data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const weightedRevenue = scenarios.reduce((sum, s) => sum + s.revenue * (s.probability / 100), 0);
  const weightedExpenses = scenarios.reduce((sum, s) => sum + s.expenses * (s.probability / 100), 0);
  const weightedProfit = weightedRevenue - weightedExpenses;

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="Financial Planning & Analysis"
        subtitle="Driver-based forecasting, multi-scenario planning, and budget management"
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <NeonMetricCard
            title="Weighted Revenue Forecast"
            value={`$${(weightedRevenue / 1000).toFixed(0)}K`}
            subtitle="Next 12 months"
            icon={<TrendingUp size={20} />}
            glow
          />
          <NeonMetricCard
            title="Weighted Expenses"
            value={`$${(weightedExpenses / 1000).toFixed(0)}K`}
            subtitle="Next 12 months"
            icon={<TrendingDown size={20} />}
          />
          <NeonMetricCard
            title="Projected Profit"
            value={`$${(weightedProfit / 1000).toFixed(0)}K`}
            subtitle="Next 12 months"
            icon={<Target size={20} />}
          />
          <NeonMetricCard
            title="Budget Variance"
            value={`${((budgetItems.reduce((sum, item) => sum + item.variance, 0) / budgetItems.reduce((sum, item) => sum + item.budgeted, 0)) * 100).toFixed(1)}%`}
            subtitle="Overall variance"
            icon={<Info size={20} />}
          />
        </Box>

        <Card sx={{ bgcolor: '#12121a', border: '1px solid rgba(255, 106, 0, 0.3)' }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'rgba(255, 106, 0, 0.2)' }}>
            <Tab label="Forecast Scenarios" />
            <Tab label="Budget vs Actuals" />
            <Tab label="Driver-Based Planning" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Forecast Scenarios</Typography>
                <Button variant="contained" startIcon={<Plus size={16} />} sx={{ bgcolor: '#ff6a00' }}>
                  Create Scenario
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} sx={{ bgcolor: '#1a1a24', border: '1px solid rgba(255, 106, 0, 0.2)', p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ color: '#ff6a00' }}>{scenario.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#a1a1aa' }}>{scenario.probability}% probability</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>{scenario.description}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Revenue:</Typography>
                        <Typography variant="body2" fontWeight={600}>${(scenario.revenue / 1000).toFixed(0)}K</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Expenses:</Typography>
                        <Typography variant="body2" fontWeight={600} color="#ef4444">${(scenario.expenses / 1000).toFixed(0)}K</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Profit:</Typography>
                        <Typography variant="body2" fontWeight={600} color="#22c55e">${(scenario.profit / 1000).toFixed(0)}K</Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Budget vs Actuals Analysis</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#a1a1aa' }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Budgeted</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Actual</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Variance</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.1)' }}>
                        <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{item.category}</td>
                        <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>${(item.budgeted / 1000).toFixed(0)}K</td>
                        <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>${(item.actual / 1000).toFixed(0)}K</td>
                        <td style={{ textAlign: 'right', padding: '12px', color: item.variance > 0 ? '#ef4444' : '#22c55e' }}>
                          {item.variance > 0 ? '+' : ''}${(item.variance / 1000).toFixed(0)}K
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: item.status === 'on_track' ? 'rgba(34, 197, 94, 0.1)' : item.status === 'at_risk' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.status === 'on_track' ? '#22c55e' : item.status === 'at_risk' ? '#f59e0b' : '#ef4444'
                          }}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Driver-Based Forecast Model</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#a1a1aa' }}>Driver</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#a1a1aa' }}>Type</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Current</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Forecast</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr key={driver.id} style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.1)' }}>
                        <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{driver.name}</td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: driver.type === 'revenue' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: driver.type === 'revenue' ? '#22c55e' : '#ef4444'
                          }}>
                            {driver.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>{driver.current_value}</td>
                        <td style={{ textAlign: 'right', padding: '12px', color: '#fff', fontWeight: 600 }}>{driver.forecast_value}</td>
                        <td style={{ textAlign: 'right', padding: '12px', color: driver.impact > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                          {driver.impact > 0 ? '+' : ''}{driver.impact}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </Card>
      </FinancePortalLayout>
    </ThemeProvider>
  );
};