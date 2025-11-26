import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Progress, Tabs, Table, Alert, List } from '@mantine/core';
import { IconShield, IconCheck, IconX, IconAlertTriangle, IconFileCheck, IconLock, IconDownload } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Control {
  id: string;
  control_name: string;
  category: string;
  status: string;
  last_tested: string | null;
  owner: string;
}

export const EnhancedFinancialControls: React.FC = () => {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchControls();
  }, []);

  const fetchControls = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_controls')
        .select('*')
        .order('control_name');

      if (error) throw error;
      if (data) setControls(data);
    } catch (error) {
      console.error('Error fetching financial controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const effectiveControls = controls.filter(c => c.status === 'effective').length;
  const deficientControls = controls.filter(c => c.status === 'deficient').length;
  const testingControls = controls.filter(c => c.status === 'testing').length;
  const totalControls = controls.length || 1;
  const controlEffectiveness = (effectiveControls / totalControls) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'effective': return 'green';
      case 'deficient': return 'red';
      case 'testing': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'effective': return <IconCheck size={16} />;
      case 'deficient': return <IconX size={16} />;
      case 'testing': return <IconAlertTriangle size={16} />;
      default: return <IconLock size={16} />;
    }
  };

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Financial Controls & Internal Audit</Title>
          <Text c="dimmed" size="sm">Monitor internal controls, SOX compliance, manage control testing</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Control Test Results</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Effective Controls</Text><Title order={3}>{effectiveControls}</Title></div>
              <IconCheck size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Deficient Controls</Text><Title order={3}>{deficientControls}</Title></div>
              <IconX size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">In Testing</Text><Title order={3}>{testingControls}</Title></div>
              <IconAlertTriangle size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <div><Text size="sm" c="dimmed" mb="xs">Control Effectiveness</Text><Title order={3}>{controlEffectiveness.toFixed(0)}%</Title><Progress value={controlEffectiveness} color="green" mt="xs" /></div>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="dashboard">
        <Tabs.List>
          <Tabs.Tab value="dashboard" leftSection={<IconShield size={16} />}>Controls Dashboard</Tabs.Tab>
          <Tabs.Tab value="sox" leftSection={<IconFileCheck size={16} />}>SOX Compliance</Tabs.Tab>
          <Tabs.Tab value="access" leftSection={<IconLock size={16} />}>Access Control</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard" pt="md">
          <Card withBorder p="md">
            {loading ? (
              <Text>Loading controls...</Text>
            ) : controls.length === 0 ? (
              <Alert color="blue"><Text>No financial controls configured. Add controls to begin monitoring.</Text></Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Control</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Last Tested</Table.Th>
                    <Table.Th>Owner</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {controls.map(control => (
                    <Table.Tr key={control.id}>
                      <Table.Td><Text fw={500}>{control.control_name}</Text></Table.Td>
                      <Table.Td><Badge variant="light">{control.category}</Badge></Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(control.status)} leftSection={getStatusIcon(control.status)}>
                          {control.status.replace('_', ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{control.last_tested ? new Date(control.last_tested).toLocaleDateString() : 'Not tested'}</Table.Td>
                      <Table.Td>{control.owner}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="sox" pt="md">
          <Stack gap="sm">
            {deficientControls > 0 && (
              <Alert color="red" icon={<IconAlertTriangle />}>
                <Text fw={500}>{deficientControls} Deficient Control{deficientControls > 1 ? 's' : ''} Identified</Text>
                <Text size="sm">Immediate remediation required for SOX compliance.</Text>
              </Alert>
            )}
            <Card withBorder p="md">
              <Text fw={500} mb="md">SOX Compliance Status</Text>
              <List spacing="sm">
                <List.Item icon={effectiveControls > 0 ? <IconCheck size={16} color="green" /> : <IconX size={16} color="red" />}>
                  Entity-Level Controls: {effectiveControls > 0 ? 'Effective' : 'Needs Review'}
                </List.Item>
                <List.Item icon={controls.filter(c => c.category === 'Financial Reporting').every(c => c.status === 'effective') ? <IconCheck size={16} color="green" /> : <IconAlertTriangle size={16} color="orange" />}>
                  Financial Reporting Controls: {controls.filter(c => c.category === 'Financial Reporting').every(c => c.status === 'effective') ? 'Effective' : 'In Progress'}
                </List.Item>
                <List.Item icon={controls.filter(c => c.category === 'IT General').every(c => c.status === 'effective') ? <IconCheck size={16} color="green" /> : <IconAlertTriangle size={16} color="orange" />}>
                  IT General Controls: {controls.filter(c => c.category === 'IT General').every(c => c.status === 'effective') ? 'Effective' : 'In Progress'}
                </List.Item>
                <List.Item icon={controls.filter(c => c.category === 'Management Review').every(c => c.status === 'effective') ? <IconCheck size={16} color="green" /> : <IconAlertTriangle size={16} color="orange" />}>
                  Management Review Controls: {controls.filter(c => c.category === 'Management Review').every(c => c.status === 'effective') ? 'Effective' : 'In Progress'}
                </List.Item>
              </List>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="access" pt="md">
          <Stack gap="sm">
            <Alert color="blue" icon={<IconLock />}>
              <Text fw={500}>Segregation of Duties</Text>
              <Text size="sm">All critical financial processes require proper segregation of duties.</Text>
            </Alert>
            <Card withBorder p="md">
              <Text fw={500} mb="md">Access Control Reviews</Text>
              <List spacing="sm">
                <List.Item><Group justify="space-between"><Text>Financial System Access</Text><Badge color="green">Compliant</Badge></Group></List.Item>
                <List.Item><Group justify="space-between"><Text>Bank Account Access</Text><Badge color="green">Compliant</Badge></Group></List.Item>
                <List.Item><Group justify="space-between"><Text>Payroll System Access</Text><Badge color="green">Compliant</Badge></Group></List.Item>
                <List.Item><Group justify="space-between"><Text>Procurement Access</Text><Badge color="yellow">Review Pending</Badge></Group></List.Item>
              </List>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
