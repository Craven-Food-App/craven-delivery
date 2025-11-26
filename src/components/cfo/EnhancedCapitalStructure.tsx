import React, { useState } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, NumberInput } from '@mantine/core';
import { IconChartPie, IconTrendingUp, IconDownload, IconCalculator, IconUsers } from '@tabler/icons-react';

export const EnhancedCapitalStructure: React.FC = () => {
  const [equityRaise, setEquityRaise] = useState(2000000);
  const [valuation, setValuation] = useState(20000000);

  const capitalStack = [
    { type: 'Common Stock', amount: 5000000, percentage: 50, holders: 'Founders' },
    { type: 'Preferred Stock - Series A', amount: 3000000, percentage: 30, holders: 'VC Investors' },
    { type: 'Options Pool', amount: 1500000, percentage: 15, holders: 'Employee Pool' },
    { type: 'Convertible Notes', amount: 500000, percentage: 5, holders: 'Angel Investors' },
  ];

  const debtInstruments = [
    { type: 'Term Loan', principal: 1000000, rate: '8.5%', maturity: '2026-12-31', status: 'Active' },
    { type: 'Line of Credit', principal: 500000, rate: '6.0%', maturity: '2025-06-30', status: 'Active' },
  ];

  const totalCapital = capitalStack.reduce((sum, item) => sum + item.amount, 0);
  const totalDebt = debtInstruments.reduce((sum, item) => sum + item.principal, 0);
  const debtToEquityRatio = (totalDebt / totalCapital).toFixed(2);
  const dilution = ((equityRaise / (valuation + equityRaise)) * 100).toFixed(1);

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
              <div><Text size="sm" c="dimmed">Shareholders</Text><Title order={3}>25</Title></div>
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
            <Table>
              <Table.Thead>
                <Table.Tr><Table.Th>Security Type</Table.Th><Table.Th>Amount</Table.Th><Table.Th>Percentage</Table.Th><Table.Th>Holders</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {capitalStack.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{item.type}</Table.Td>
                    <Table.Td>${(item.amount / 1000000).toFixed(1)}M</Table.Td>
                    <Table.Td><Badge size="lg">{item.percentage}%</Badge></Table.Td>
                    <Table.Td>{item.holders}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr style={{ fontWeight: 'bold' }}>
                  <Table.Td>Total</Table.Td>
                  <Table.Td>${(totalCapital / 1000000).toFixed(1)}M</Table.Td>
                  <Table.Td>100%</Table.Td>
                  <Table.Td>-</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="debt" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr><Table.Th>Instrument</Table.Th><Table.Th>Principal</Table.Th><Table.Th>Interest Rate</Table.Th><Table.Th>Maturity</Table.Th><Table.Th>Status</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {debtInstruments.map((debt, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{debt.type}</Table.Td>
                    <Table.Td>${(debt.principal / 1000000).toFixed(1)}M</Table.Td>
                    <Table.Td>{debt.rate}</Table.Td>
                    <Table.Td>{debt.maturity}</Table.Td>
                    <Table.Td><Badge color="green">{debt.status}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
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
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
