import React, { useState } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table } from '@mantine/core';
import { IconAlertTriangle, IconShield, IconTrendingUp, IconDownload, IconChartBar } from '@tabler/icons-react';

interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  status: string;
  mitigation: string;
}

export const EnhancedRiskManagement: React.FC = () => {
  const [risks] = useState<Risk[]>([
    { id: '1', title: 'Customer Concentration Risk', category: 'Strategic', likelihood: 'High', impact: 'High', status: 'Active', mitigation: 'Diversification strategy in progress' },
    { id: '2', title: 'Foreign Exchange Exposure', category: 'Financial', likelihood: 'Medium', impact: 'Medium', status: 'Mitigated', mitigation: 'Hedging contracts in place' },
    { id: '3', title: 'Key Person Dependency', category: 'Operational', likelihood: 'Medium', impact: 'High', status: 'Active', mitigation: 'Succession planning initiated' },
    { id: '4', title: 'Cybersecurity Threat', category: 'Compliance', likelihood: 'Medium', impact: 'High', status: 'Monitoring', mitigation: 'Enhanced security protocols' },
  ]);

  const highRisks = risks.filter(r => r.likelihood === 'High' && r.impact === 'High').length;
  const mediumRisks = risks.filter(r => (r.likelihood === 'Medium' && r.impact === 'High') || (r.likelihood === 'High' && r.impact === 'Medium')).length;
  const lowRisks = risks.length - highRisks - mediumRisks;

  const getRiskColor = (likelihood: string, impact: string) => {
    if (likelihood === 'High' && impact === 'High') return 'red';
    if ((likelihood === 'High' && impact === 'Medium') || (likelihood === 'Medium' && impact === 'High')) return 'orange';
    return 'yellow';
  };

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Risk Management</Title>
          <Text c="dimmed" size="sm">Identify, assess, and mitigate financial and operational risks</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Risk Register</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">High Priority Risks</Text><Title order={3}>{highRisks}</Title></div>
              <IconAlertTriangle size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Medium Priority Risks</Text><Title order={3}>{mediumRisks}</Title></div>
              <IconAlertTriangle size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Low Priority Risks</Text><Title order={3}>{lowRisks}</Title></div>
              <IconShield size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="register">
        <Tabs.List>
          <Tabs.Tab value="register" leftSection={<IconAlertTriangle size={16} />}>Risk Register</Tabs.Tab>
          <Tabs.Tab value="heatmap" leftSection={<IconChartBar size={16} />}>Risk Heat Map</Tabs.Tab>
          <Tabs.Tab value="mitigation" leftSection={<IconShield size={16} />}>Mitigation Plans</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="register" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr><Table.Th>Risk</Table.Th><Table.Th>Category</Table.Th><Table.Th>Likelihood</Table.Th><Table.Th>Impact</Table.Th><Table.Th>Status</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {risks.map(risk => (
                  <Table.Tr key={risk.id}>
                    <Table.Td>{risk.title}</Table.Td>
                    <Table.Td><Badge variant="light">{risk.category}</Badge></Table.Td>
                    <Table.Td><Badge color={risk.likelihood === 'High' ? 'red' : risk.likelihood === 'Medium' ? 'yellow' : 'green'}>{risk.likelihood}</Badge></Table.Td>
                    <Table.Td><Badge color={risk.impact === 'High' ? 'red' : risk.impact === 'Medium' ? 'yellow' : 'green'}>{risk.impact}</Badge></Table.Td>
                    <Table.Td><Badge color={getRiskColor(risk.likelihood, risk.impact)}>{risk.status}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="heatmap" pt="md">
          <Card withBorder p="md">
            <Title order={4} mb="md">Risk Heat Map</Title>
            <Grid>
              <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#fee', border: '1px solid #fcc' }}><Text fw={500} ta="center">High Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'High').length} risks</Text></Card></Grid.Col>
              <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#ffe', border: '1px solid #ffc' }}><Text fw={500} ta="center">Medium Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'Medium').length} risks</Text></Card></Grid.Col>
              <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#efe', border: '1px solid #cfc' }}><Text fw={500} ta="center">Low Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'Low').length} risks</Text></Card></Grid.Col>
            </Grid>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="mitigation" pt="md">
          <Stack gap="sm">
            {risks.map(risk => (
              <Card key={risk.id} withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text fw={500}>{risk.title}</Text>
                  <Badge color={getRiskColor(risk.likelihood, risk.impact)}>{risk.status}</Badge>
                </Group>
                <Text size="sm" c="dimmed"><strong>Mitigation:</strong> {risk.mitigation}</Text>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
