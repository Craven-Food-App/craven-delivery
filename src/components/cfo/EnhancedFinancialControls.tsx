import React, { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Grid,
  Progress,
  Tabs,
  Table,
  Alert,
  List,
} from '@mantine/core';
import {
  IconShield,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconFileCheck,
  IconLock,
  IconEye,
} from '@tabler/icons-react';

interface Control {
  id: string;
  name: string;
  category: string;
  status: 'effective' | 'deficient' | 'testing';
  lastTested: string;
  owner: string;
}

export const EnhancedFinancialControls: React.FC = () => {
  const [controls] = useState<Control[]>([
    {
      id: '1',
      name: 'Bank Reconciliation',
      category: 'Cash Management',
      status: 'effective',
      lastTested: '2024-01-15',
      owner: 'Treasury Team',
    },
    {
      id: '2',
      name: 'Three-Way Match (PO/Receipt/Invoice)',
      category: 'Accounts Payable',
      status: 'effective',
      lastTested: '2024-01-10',
      owner: 'AP Team',
    },
    {
      id: '3',
      name: 'Credit Limit Approval',
      category: 'Accounts Receivable',
      status: 'testing',
      lastTested: '2024-01-05',
      owner: 'Credit Manager',
    },
    {
      id: '4',
      name: 'Journal Entry Approval',
      category: 'General Ledger',
      status: 'effective',
      lastTested: '2024-01-12',
      owner: 'Controller',
    },
    {
      id: '5',
      name: 'Segregation of Duties Review',
      category: 'Access Control',
      status: 'deficient',
      lastTested: '2023-12-20',
      owner: 'IT Team',
    },
  ]);

  const effectiveControls = controls.filter((c) => c.status === 'effective').length;
  const deficientControls = controls.filter((c) => c.status === 'deficient').length;
  const testingControls = controls.filter((c) => c.status === 'testing').length;
  const controlEffectiveness = (effectiveControls / controls.length) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'effective':
        return 'green';
      case 'deficient':
        return 'red';
      case 'testing':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'effective':
        return <IconCheck size={16} />;
      case 'deficient':
        return <IconX size={16} />;
      case 'testing':
        return <IconAlertTriangle size={16} />;
      default:
        return null;
    }
  };

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Financial Controls & SOX Compliance</Title>
          <Text c="dimmed" size="sm">
            Monitor internal controls, ensure compliance, and manage risks
          </Text>
        </div>
        <Button variant="light" leftSection={<IconFileCheck size={16} />}>
          Control Test Results
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Effective Controls
                </Text>
                <Title order={3}>{effectiveControls}</Title>
              </div>
              <IconCheck size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Deficient Controls
                </Text>
                <Title order={3}>{deficientControls}</Title>
              </div>
              <IconX size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  In Testing
                </Text>
                <Title order={3}>{testingControls}</Title>
              </div>
              <IconAlertTriangle size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Control Effectiveness
              </Text>
              <Title order={3}>{controlEffectiveness.toFixed(0)}%</Title>
              <Progress value={controlEffectiveness} color="green" mt="xs" />
            </div>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="controls">
        <Tabs.List>
          <Tabs.Tab value="controls" leftSection={<IconShield size={16} />}>
            Controls Dashboard
          </Tabs.Tab>
          <Tabs.Tab value="sox" leftSection={<IconFileCheck size={16} />}>
            SOX Compliance
          </Tabs.Tab>
          <Tabs.Tab value="access" leftSection={<IconLock size={16} />}>
            Access Control
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="controls" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Control Name</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last Tested</Table.Th>
                  <Table.Th>Owner</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {controls.map((control) => (
                  <Table.Tr key={control.id}>
                    <Table.Td>{control.name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{control.category}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(control.status)}
                        leftSection={getStatusIcon(control.status)}
                      >
                        {control.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{control.lastTested}</Table.Td>
                    <Table.Td>{control.owner}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="sox" pt="md">
          <Stack gap="md">
            {deficientControls > 0 && (
              <Alert color="red" icon={<IconAlertTriangle />}>
                <Text fw={500}>Critical: {deficientControls} Deficient Control(s)</Text>
                <Text size="sm">
                  Immediate remediation required for SOX compliance
                </Text>
              </Alert>
            )}

            <Card withBorder p="md">
              <Title order={4} mb="md">
                SOX 404 Compliance Status
              </Title>
              <List spacing="sm">
                <List.Item icon={<IconCheck size={16} color="green" />}>
                  Management assessment of ICFR completed
                </List.Item>
                <List.Item icon={<IconCheck size={16} color="green" />}>
                  Control documentation updated
                </List.Item>
                <List.Item icon={<IconCheck size={16} color="green" />}>
                  Annual control testing in progress
                </List.Item>
                <List.Item
                  icon={
                    deficientControls > 0 ? (
                      <IconX size={16} color="red" />
                    ) : (
                      <IconCheck size={16} color="green" />
                    )
                  }
                >
                  No material weaknesses or significant deficiencies
                </List.Item>
              </List>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="access" pt="md">
          <Card withBorder p="md">
            <Alert color="blue" icon={<IconLock />}>
              <Text fw={500}>Segregation of Duties Review</Text>
              <Text size="sm">
                Regular review of user access rights to ensure proper segregation
              </Text>
            </Alert>

            <Stack gap="md" mt="md">
              <Card withBorder p="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>Payment Authorization</Text>
                    <Text size="sm" c="dimmed">
                      Separate from payment processing
                    </Text>
                  </div>
                  <Badge color="green">Compliant</Badge>
                </Group>
              </Card>

              <Card withBorder p="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>Financial Reporting Access</Text>
                    <Text size="sm" c="dimmed">
                      Read-only for non-finance users
                    </Text>
                  </div>
                  <Badge color="green">Compliant</Badge>
                </Group>
              </Card>

              <Card withBorder p="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>System Administrator Rights</Text>
                    <Text size="sm" c="dimmed">
                      Restricted to IT personnel only
                    </Text>
                  </div>
                  <Badge color="yellow">Review Required</Badge>
                </Group>
              </Card>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
