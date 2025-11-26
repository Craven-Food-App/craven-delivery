import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, Alert } from '@mantine/core';
import { IconAlertTriangle, IconShield, IconDownload, IconChartBar } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: string;
  impact: string;
  status: string;
  mitigation: string | null;
  owner: string | null;
}

export const EnhancedRiskManagement: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_register')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRisks(data);
    } catch (error) {
      console.error('Error fetching risks:', error);
    } finally {
      setLoading(false);
    }
  };

  const highRisks = risks.filter(r => r.likelihood === 'High' && r.impact === 'High').length;
  const mediumRisks = risks.filter(r => (r.likelihood === 'Medium' && r.impact === 'High') || (r.likelihood === 'High' && r.impact === 'Medium')).length;
  const lowRisks = risks.length - highRisks - mediumRisks;

  const getRiskColor = (value: string) => {
    if (value === 'High') return 'red';
    if (value === 'Medium') return 'yellow';
    return 'green';
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
            {loading ? (
              <Text p="md">Loading risks...</Text>
            ) : risks.length === 0 ? (
              <Alert color="blue" m="md"><Text>No risks registered yet. Add risks to track and manage them.</Text></Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr><Table.Th>Risk</Table.Th><Table.Th>Category</Table.Th><Table.Th>Likelihood</Table.Th><Table.Th>Impact</Table.Th><Table.Th>Status</Table.Th></Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {risks.map(risk => (
                    <Table.Tr key={risk.id}>
                      <Table.Td>{risk.title}</Table.Td>
                      <Table.Td><Badge variant="light">{risk.category}</Badge></Table.Td>
                      <Table.Td><Badge color={getRiskColor(risk.likelihood)}>{risk.likelihood}</Badge></Table.Td>
                      <Table.Td><Badge color={getRiskColor(risk.impact)}>{risk.impact}</Badge></Table.Td>
                      <Table.Td><Badge color={risk.status === 'mitigated' ? 'green' : risk.status === 'monitoring' ? 'yellow' : 'red'}>{risk.status}</Badge></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="heatmap" pt="md">
          <Card withBorder p="md">
            {risks.length === 0 ? (
              <Alert color="blue"><Text>No risks to visualize. Add risks to see them on the heat map.</Text></Alert>
            ) : (
              <>
                <Title order={4} mb="md">Risk Heat Map</Title>
                <Grid>
                  <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#fee', border: '1px solid #fcc' }}><Text fw={500} ta="center">High Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'High').length} risks</Text></Card></Grid.Col>
                  <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#ffe', border: '1px solid #ffc' }}><Text fw={500} ta="center">Medium Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'Medium').length} risks</Text></Card></Grid.Col>
                  <Grid.Col span={4}><Card p="sm" style={{ backgroundColor: '#efe', border: '1px solid #cfc' }}><Text fw={500} ta="center">Low Likelihood</Text><Text ta="center">{risks.filter(r => r.likelihood === 'Low').length} risks</Text></Card></Grid.Col>
                </Grid>
              </>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="mitigation" pt="md">
          <Stack gap="sm">
            {risks.length === 0 ? (
              <Alert color="blue"><Text>No mitigation plans yet. Risks will appear here once added.</Text></Alert>
            ) : (
              risks.map(risk => (
                <Card key={risk.id} withBorder p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{risk.title}</Text>
                    <Badge color={getRiskColor(risk.impact)}>{risk.status}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed"><strong>Mitigation:</strong> {risk.mitigation || 'No mitigation plan yet'}</Text>
                  {risk.owner && <Text size="sm" c="dimmed" mt="xs"><strong>Owner:</strong> {risk.owner}</Text>}
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
