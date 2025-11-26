import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, NumberInput, Alert } from '@mantine/core';
import { IconChartDots, IconTrendingUp, IconTrendingDown, IconDownload } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface FinancialScenario {
  id: string;
  scenario_name: string;
  base_revenue: number;
  base_expenses: number;
  optimistic_revenue: number;
  optimistic_expenses: number;
  pessimistic_revenue: number;
  pessimistic_expenses: number;
}

export const EnhancedScenarioPlanning: React.FC = () => {
  const [baseRevenue, setBaseRevenue] = useState(0);
  const [baseExpenses, setBaseExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scenarioId, setScenarioId] = useState<string | null>(null);

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
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Scenario Planning & Analysis</Title>
          <Text c="dimmed" size="sm">Model multiple future scenarios to support strategic planning and risk management</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Scenarios</Button>
        </Group>
      </Group>

      {loading ? (
        <Card withBorder p="md"><Text>Loading scenarios...</Text></Card>
      ) : (
        <>
          <Card withBorder p="md">
            <Title order={4} mb="md">Scenario Assumptions</Title>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput 
                  label="Base Case Revenue" 
                  value={baseRevenue} 
                  onChange={(val) => {
                    const newValue = Number(val);
                    setBaseRevenue(newValue);
                    saveScenario(newValue, baseExpenses);
                  }} 
                  prefix="$" 
                  thousandSeparator="," 
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput 
                  label="Base Case Expenses" 
                  value={baseExpenses} 
                  onChange={(val) => {
                    const newValue = Number(val);
                    setBaseExpenses(newValue);
                    saveScenario(baseRevenue, newValue);
                  }} 
                  prefix="$" 
                  thousandSeparator="," 
                />
              </Grid.Col>
            </Grid>
          </Card>

          {baseRevenue === 0 && baseExpenses === 0 ? (
            <Alert color="blue"><Text>Enter base case revenue and expenses above to generate scenario analysis.</Text></Alert>
          ) : (
            <Tabs defaultValue="comparison">
              <Tabs.List>
                <Tabs.Tab value="comparison" leftSection={<IconChartDots size={16} />}>Scenario Comparison</Tabs.Tab>
                <Tabs.Tab value="base" leftSection={<IconTrendingUp size={16} />}>Base Case</Tabs.Tab>
                <Tabs.Tab value="optimistic" leftSection={<IconTrendingUp size={16} />}>Optimistic</Tabs.Tab>
                <Tabs.Tab value="pessimistic" leftSection={<IconTrendingDown size={16} />}>Pessimistic</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="comparison" pt="md">
                <Grid>
                  <Grid.Col span={4}>
                    <Card withBorder p="md" style={{ borderColor: '#60a5fa' }}>
                      <Group justify="space-between" mb="md">
                        <Title order={4}>Base Case</Title>
                        <Badge color="blue">{scenarios.base.probability}% probability</Badge>
                      </Group>
                      <Stack gap="xs">
                        <div><Text size="sm" c="dimmed">Revenue</Text><Title order={3}>${(scenarios.base.revenue / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Expenses</Text><Title order={3}>${(scenarios.base.expenses / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Profit</Text><Title order={3} c={baseMetrics.profit > 0 ? 'green' : 'red'}>${(baseMetrics.profit / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Margin</Text><Title order={3}>{baseMetrics.margin.toFixed(1)}%</Title></div>
                        <div><Text size="sm" c="dimmed">Cash Runway</Text><Title order={3}>{baseMetrics.runway} months</Title></div>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Card withBorder p="md" style={{ borderColor: '#34d399' }}>
                      <Group justify="space-between" mb="md">
                        <Title order={4}>Optimistic</Title>
                        <Badge color="green">{scenarios.optimistic.probability}% probability</Badge>
                      </Group>
                      <Stack gap="xs">
                        <div><Text size="sm" c="dimmed">Revenue</Text><Title order={3}>${(scenarios.optimistic.revenue / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Expenses</Text><Title order={3}>${(scenarios.optimistic.expenses / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Profit</Text><Title order={3} c="green">${(optimisticMetrics.profit / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Margin</Text><Title order={3}>{optimisticMetrics.margin.toFixed(1)}%</Title></div>
                        <div><Text size="sm" c="dimmed">Cash Runway</Text><Title order={3}>{optimisticMetrics.runway} months</Title></div>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Card withBorder p="md" style={{ borderColor: '#f97316' }}>
                      <Group justify="space-between" mb="md">
                        <Title order={4}>Pessimistic</Title>
                        <Badge color="orange">{scenarios.pessimistic.probability}% probability</Badge>
                      </Group>
                      <Stack gap="xs">
                        <div><Text size="sm" c="dimmed">Revenue</Text><Title order={3}>${(scenarios.pessimistic.revenue / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Expenses</Text><Title order={3}>${(scenarios.pessimistic.expenses / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Profit</Text><Title order={3} c={pessimisticMetrics.profit > 0 ? 'green' : 'red'}>${(pessimisticMetrics.profit / 1000000).toFixed(1)}M</Title></div>
                        <div><Text size="sm" c="dimmed">Margin</Text><Title order={3}>{pessimisticMetrics.margin.toFixed(1)}%</Title></div>
                        <div><Text size="sm" c="dimmed">Cash Runway</Text><Title order={3}>{pessimisticMetrics.runway} months</Title></div>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>
              </Tabs.Panel>

              <Tabs.Panel value="base" pt="md">
                <Card withBorder p="md">
                  <Title order={4} mb="md">Base Case Scenario</Title>
                  <Text size="sm" mb="md">Most likely outcome based on current trends and assumptions</Text>
                  <Grid>
                    <Grid.Col span={6}><Text fw={500}>Annual Revenue:</Text><Text>${(scenarios.base.revenue / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Annual Expenses:</Text><Text>${(scenarios.base.expenses / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Net Profit:</Text><Text c={baseMetrics.profit > 0 ? 'green' : 'red'}>${(baseMetrics.profit / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Profit Margin:</Text><Text>{baseMetrics.margin.toFixed(1)}%</Text></Grid.Col>
                  </Grid>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="optimistic" pt="md">
                <Card withBorder p="md">
                  <Title order={4} mb="md">Optimistic Scenario</Title>
                  <Text size="sm" mb="md">Best case outcome (+30% revenue, +10% expenses)</Text>
                  <Grid>
                    <Grid.Col span={6}><Text fw={500}>Annual Revenue:</Text><Text>${(scenarios.optimistic.revenue / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Annual Expenses:</Text><Text>${(scenarios.optimistic.expenses / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Net Profit:</Text><Text c="green">${(optimisticMetrics.profit / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Profit Margin:</Text><Text>{optimisticMetrics.margin.toFixed(1)}%</Text></Grid.Col>
                  </Grid>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="pessimistic" pt="md">
                <Card withBorder p="md">
                  <Title order={4} mb="md">Pessimistic Scenario</Title>
                  <Text size="sm" mb="md">Worst case outcome (-30% revenue, -5% expenses)</Text>
                  <Grid>
                    <Grid.Col span={6}><Text fw={500}>Annual Revenue:</Text><Text>${(scenarios.pessimistic.revenue / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Annual Expenses:</Text><Text>${(scenarios.pessimistic.expenses / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Net Profit:</Text><Text c={pessimisticMetrics.profit > 0 ? 'green' : 'red'}>${(pessimisticMetrics.profit / 1000000).toFixed(1)}M</Text></Grid.Col>
                    <Grid.Col span={6}><Text fw={500}>Profit Margin:</Text><Text>{pessimisticMetrics.margin.toFixed(1)}%</Text></Grid.Col>
                  </Grid>
                </Card>
              </Tabs.Panel>
            </Tabs>
          )}
        </>
      )}
    </Stack>
  );
};
