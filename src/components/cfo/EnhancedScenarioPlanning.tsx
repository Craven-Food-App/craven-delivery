import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Button, Tabs, Tab, TextField } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '../../styles/neon-finance.css';

export const EnhancedScenarioPlanning: React.FC = () => {
  const [baseRevenue, setBaseRevenue] = useState(0);
  const [baseExpenses, setBaseExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_scenarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setBaseRevenue(data.base_revenue);
        setBaseExpenses(data.base_expenses);
        setScenarioId(data.id);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async (revenue: number, expenses: number) => {
    const scenarios = {
      base: { revenue, expenses },
      optimistic: { revenue: revenue * 1.3, expenses: expenses * 1.1 },
      pessimistic: { revenue: revenue * 0.7, expenses: expenses * 0.95 },
    };

    try {
      if (scenarioId) {
        await supabase.from('financial_scenarios').update({
          base_revenue: scenarios.base.revenue,
          base_expenses: scenarios.base.expenses,
          optimistic_revenue: scenarios.optimistic.revenue,
          optimistic_expenses: scenarios.optimistic.expenses,
          pessimistic_revenue: scenarios.pessimistic.revenue,
          pessimistic_expenses: scenarios.pessimistic.expenses,
        }).eq('id', scenarioId);
      } else {
        const { data } = await supabase.from('financial_scenarios').insert({
          scenario_name: 'Current Scenario',
          base_revenue: scenarios.base.revenue,
          base_expenses: scenarios.base.expenses,
          optimistic_revenue: scenarios.optimistic.revenue,
          optimistic_expenses: scenarios.optimistic.expenses,
          pessimistic_revenue: scenarios.pessimistic.revenue,
          pessimistic_expenses: scenarios.pessimistic.expenses,
        }).select().single();
        if (data) setScenarioId(data.id);
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
    }
  };

  const scenarios = {
    base: { revenue: baseRevenue, expenses: baseExpenses, probability: 50 },
    optimistic: { revenue: baseRevenue * 1.3, expenses: baseExpenses * 1.1, probability: 25 },
    pessimistic: { revenue: baseRevenue * 0.7, expenses: baseExpenses * 0.95, probability: 25 },
  };

  const calculateMetrics = (revenue: number, expenses: number) => ({
    profit: revenue - expenses,
    margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
    runway: expenses > 0 ? Math.floor((5000000 / (expenses / 12))) : 0,
  });

  const baseMetrics = calculateMetrics(scenarios.base.revenue, scenarios.base.expenses);
  const optimisticMetrics = calculateMetrics(scenarios.optimistic.revenue, scenarios.optimistic.expenses);
  const pessimisticMetrics = calculateMetrics(scenarios.pessimistic.revenue, scenarios.pessimistic.expenses);

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="Scenario Planning & Analysis"
        subtitle="Model multiple future scenarios to support strategic planning and risk management"
        actions={
          <Button variant="outlined" startIcon={<Download size={16} />} sx={{ borderColor: '#ff6a00', color: '#ff6a00' }}>
            Export Scenarios
          </Button>
        }
      >
        <Card sx={{ bgcolor: '#12121a', border: '1px solid rgba(255, 106, 0, 0.3)', p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Scenario Assumptions</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="Base Case Revenue"
              type="number"
              value={baseRevenue}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setBaseRevenue(newValue);
                saveScenario(newValue, baseExpenses);
              }}
              fullWidth
            />
            <TextField
              label="Base Case Expenses"
              type="number"
              value={baseExpenses}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setBaseExpenses(newValue);
                saveScenario(baseRevenue, newValue);
              }}
              fullWidth
            />
          </Box>
        </Card>

        {baseRevenue === 0 && baseExpenses === 0 ? (
          <Card sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', p: 2 }}>
            <Typography sx={{ color: '#60a5fa' }}>
              Enter base case revenue and expenses above to generate scenario analysis.
            </Typography>
          </Card>
        ) : (
          <Card sx={{ bgcolor: '#12121a', border: '1px solid rgba(255, 106, 0, 0.3)' }}>
            <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'rgba(255, 106, 0, 0.2)' }}>
              <Tab label="Scenario Comparison" />
              <Tab label="Base Case" />
              <Tab label="Optimistic" />
              <Tab label="Pessimistic" />
            </Tabs>

            {activeTab === 0 && (
              <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Card sx={{ bgcolor: '#1a1a24', border: '2px solid #60a5fa', p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Base Case</Typography>
                    <Typography variant="caption" sx={{ color: '#60a5fa' }}>{scenarios.base.probability}% probability</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Revenue</Typography><Typography variant="h5" className="neon-gradient">${(scenarios.base.revenue / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Expenses</Typography><Typography variant="h5">${(scenarios.base.expenses / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Profit</Typography><Typography variant="h5" sx={{ color: baseMetrics.profit > 0 ? '#22c55e' : '#ef4444' }}>${(baseMetrics.profit / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Margin</Typography><Typography variant="h5">{baseMetrics.margin.toFixed(1)}%</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Cash Runway</Typography><Typography variant="h5">{baseMetrics.runway} months</Typography></Box>
                  </Box>
                </Card>

                <Card sx={{ bgcolor: '#1a1a24', border: '2px solid #34d399', p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Optimistic</Typography>
                    <Typography variant="caption" sx={{ color: '#34d399' }}>{scenarios.optimistic.probability}% probability</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Revenue</Typography><Typography variant="h5" className="neon-gradient">${(scenarios.optimistic.revenue / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Expenses</Typography><Typography variant="h5">${(scenarios.optimistic.expenses / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Profit</Typography><Typography variant="h5" sx={{ color: '#22c55e' }}>${(optimisticMetrics.profit / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Margin</Typography><Typography variant="h5">{optimisticMetrics.margin.toFixed(1)}%</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Cash Runway</Typography><Typography variant="h5">{optimisticMetrics.runway} months</Typography></Box>
                  </Box>
                </Card>

                <Card sx={{ bgcolor: '#1a1a24', border: '2px solid #f97316', p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Pessimistic</Typography>
                    <Typography variant="caption" sx={{ color: '#f97316' }}>{scenarios.pessimistic.probability}% probability</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Revenue</Typography><Typography variant="h5" className="neon-gradient">${(scenarios.pessimistic.revenue / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Expenses</Typography><Typography variant="h5">${(scenarios.pessimistic.expenses / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Profit</Typography><Typography variant="h5" sx={{ color: pessimisticMetrics.profit > 0 ? '#22c55e' : '#ef4444' }}>${(pessimisticMetrics.profit / 1000000).toFixed(1)}M</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Margin</Typography><Typography variant="h5">{pessimisticMetrics.margin.toFixed(1)}%</Typography></Box>
                    <Box><Typography variant="body2" sx={{ color: '#a1a1aa' }}>Cash Runway</Typography><Typography variant="h5">{pessimisticMetrics.runway} months</Typography></Box>
                  </Box>
                </Card>
              </Box>
            )}
          </Card>
        )}
      </FinancePortalLayout>
    </ThemeProvider>
  );
};