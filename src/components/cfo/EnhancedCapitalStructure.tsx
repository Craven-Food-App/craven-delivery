import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, NumberInput, Alert } from '@mantine/core';
import { IconChartPie, IconTrendingUp, IconDownload, IconCalculator, IconUsers } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface CapitalStackItem {
  id: string;
  investment_type: string;
  amount: number;
  percentage: number;
  holders: string;
}

interface DebtInstrument {
  id: string;
  instrument_type: string;
  principal: number;
  interest_rate: number;
  maturity_date: string;
  status: string;
}

export const EnhancedCapitalStructure: React.FC = () => {
  const [equityRaise, setEquityRaise] = useState(0);
  const [valuation, setValuation] = useState(0);
  const [capitalStack, setCapitalStack] = useState<CapitalStackItem[]>([]);
  const [debtInstruments, setDebtInstruments] = useState<DebtInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapitalData();
  }, []);

  const fetchCapitalData = async () => {
    try {
      const [capitalRes, debtRes] = await Promise.all([
        supabase.from('capital_stack').select('*'),
        supabase.from('debt_instruments').select('*')
      ]);

      if (capitalRes.data) setCapitalStack(capitalRes.data);
      if (debtRes.data) setDebtInstruments(debtRes.data);
    } catch (error) {
      console.error('Error fetching capital data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCapital = capitalStack.reduce((sum, item) => sum + item.amount, 0);
  const totalDebt = debtInstruments.reduce((sum, item) => sum + item.principal, 0);
  const debtToEquityRatio = totalCapital > 0 ? (totalDebt / totalCapital).toFixed(2) : '0.00';
  const dilution = valuation + equityRaise > 0 ? ((equityRaise / (valuation + equityRaise)) * 100).toFixed(1) : '0.0';
  const totalShareholders = capitalStack.length;

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Capital Structure Management</Title>
          <Text c="dimmed" size="sm">Manage company capital structure, optimize debt-to-equity mix, plan financing</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Cap Table</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Total Equity</Text><Title order={3}>${(totalCapital / 1000000).toFixed(1)}M</Title></div>
              <IconChartPie size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Total Debt</Text><Title order={3}>${(totalDebt / 1000000).toFixed(1)}M</Title></div>
              <IconTrendingUp size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Debt/Equity Ratio</Text><Title order={3}>{debtToEquityRatio}</Title></div>
              <IconCalculator size={32} color="purple" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Shareholders</Text><Title order={3}>{totalShareholders}</Title></div>
              <IconUsers size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="captable">
        <Tabs.List>
          <Tabs.Tab value="captable" leftSection={<IconChartPie size={16} />}>Cap Table</Tabs.Tab>
          <Tabs.Tab value="debt" leftSection={<IconTrendingUp size={16} />}>Debt Management</Tabs.Tab>
          <Tabs.Tab value="scenarios" leftSection={<IconCalculator size={16} />}>Scenario Modeling</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="captable" pt="md">
          <Card withBorder>
            {loading ? (
              <Text p="md">Loading cap table...</Text>
            ) : capitalStack.length === 0 ? (
              <Alert color="blue" m="md"><Text>No capital structure data yet. Add equity holdings to build your cap table.</Text></Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr><Table.Th>Security Type</Table.Th><Table.Th>Amount</Table.Th><Table.Th>Percentage</Table.Th><Table.Th>Holders</Table.Th></Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {capitalStack.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.investment_type}</Table.Td>
                      <Table.Td>${(item.amount / 1000000).toFixed(1)}M</Table.Td>
                      <Table.Td><Badge size="lg">{item.percentage}%</Badge></Table.Td>
                      <Table.Td>{item.holders}</Table.Td>
                    </Table.Tr>
                  ))}
                  {totalCapital > 0 && (
                    <Table.Tr style={{ fontWeight: 'bold' }}>
                      <Table.Td>Total</Table.Td>
                      <Table.Td>${(totalCapital / 1000000).toFixed(1)}M</Table.Td>
                      <Table.Td>100%</Table.Td>
                      <Table.Td>-</Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="debt" pt="md">
          <Card withBorder>
            {loading ? (
              <Text p="md">Loading debt instruments...</Text>
            ) : debtInstruments.length === 0 ? (
              <Alert color="blue" m="md"><Text>No debt instruments recorded. Add loans and credit facilities to track debt obligations.</Text></Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr><Table.Th>Instrument</Table.Th><Table.Th>Principal</Table.Th><Table.Th>Interest Rate</Table.Th><Table.Th>Maturity</Table.Th><Table.Th>Status</Table.Th></Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {debtInstruments.map((debt) => (
                    <Table.Tr key={debt.id}>
                      <Table.Td>{debt.instrument_type}</Table.Td>
                      <Table.Td>${(debt.principal / 1000000).toFixed(1)}M</Table.Td>
                      <Table.Td>{(debt.interest_rate * 100).toFixed(1)}%</Table.Td>
                      <Table.Td>{new Date(debt.maturity_date).toLocaleDateString()}</Table.Td>
                      <Table.Td><Badge color={debt.status === 'active' ? 'green' : debt.status === 'paid' ? 'blue' : 'orange'}>{debt.status}</Badge></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="scenarios" pt="md">
          <Card withBorder p="md">
            <Title order={4} mb="md">Financing Scenario Calculator</Title>
            <Grid>
              <Grid.Col span={6}>
                <NumberInput label="Equity Raise Amount" value={equityRaise} onChange={(val) => setEquityRaise(Number(val))} prefix="$" thousandSeparator="," />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput label="Pre-Money Valuation" value={valuation} onChange={(val) => setValuation(Number(val))} prefix="$" thousandSeparator="," />
              </Grid.Col>
            </Grid>

            {(equityRaise > 0 && valuation > 0) && (
              <Card withBorder p="sm" mt="md" style={{ backgroundColor: '#f0f9ff' }}>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>Post-Money Valuation</Text>
                    <Title order={3}>${((valuation + equityRaise) / 1000000).toFixed(1)}M</Title>
                  </div>
                  <div>
                    <Text size="sm" fw={500}>Dilution</Text>
                    <Title order={3} c="orange">{dilution}%</Title>
                  </div>
                  <div>
                    <Text size="sm" fw={500}>New Ownership</Text>
                    <Title order={3}>{dilution}%</Title>
                  </div>
                </Group>
              </Card>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
