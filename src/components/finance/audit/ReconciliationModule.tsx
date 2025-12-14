import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Table,
  Badge,
  Button,
  Tabs,
  Grid,
  Progress,
  Alert,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconFileText,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { ReconciliationBank, ReconciliationLedger } from './types';

export const ReconciliationModule: React.FC = () => {
  const [bankReconciliations, setBankReconciliations] = useState<ReconciliationBank[]>([]);
  const [ledgerReconciliations, setLedgerReconciliations] = useState<ReconciliationLedger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const [bankRes, ledgerRes] = await Promise.all([
        supabase
          .from('reconciliation_bank')
          .select('*')
          .order('reconciliation_date', { ascending: false })
          .limit(20),
        supabase
          .from('reconciliation_ledger')
          .select('*')
          .order('reconciliation_date', { ascending: false })
          .limit(50),
      ]);

      if (bankRes.data) setBankReconciliations(bankRes.data as ReconciliationBank[]);
      if (ledgerRes.data) setLedgerReconciliations(ledgerRes.data as ReconciliationLedger[]);
    } catch (error) {
      console.error('Error fetching reconciliations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Stack gap="lg">
      <Tabs defaultValue="bank">
        <Tabs.List>
          <Tabs.Tab value="bank" leftSection={<IconBuildingBank size={16} />}>
            Bank Reconciliation
          </Tabs.Tab>
          <Tabs.Tab value="ledger" leftSection={<IconFileText size={16} />}>
            Ledger Reconciliation
          </Tabs.Tab>
          <Tabs.Tab value="craven" leftSection={<IconCheck size={16} />}>
            Crave'n-Specific Tracing
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="bank" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={700} size="xl">Bank Reconciliation</Text>
              <Button onClick={fetchReconciliations}>Refresh</Button>
            </Group>

            {bankReconciliations.length === 0 ? (
              <Alert color="blue">No bank reconciliations found</Alert>
            ) : (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Account</Table.Th>
                    <Table.Th>Period</Table.Th>
                    <Table.Th>Opening Balance</Table.Th>
                    <Table.Th>Closing Balance</Table.Th>
                    <Table.Th>Variance</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Checklist</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bankReconciliations.map((rec) => (
                    <Table.Tr key={rec.id}>
                      <Table.Td>
                        <Text fw={600}>{rec.account_name}</Text>
                        <Text size="xs" c="dimmed">{rec.account_type}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {dayjs(rec.reconciliation_period_start).format('MMM D')} - {dayjs(rec.reconciliation_period_end).format('MMM D, YYYY')}
                        </Text>
                      </Table.Td>
                      <Table.Td>{formatCurrency(rec.opening_balance)}</Table.Td>
                      <Table.Td>{formatCurrency(rec.closing_balance)}</Table.Td>
                      <Table.Td>
                        <Text c={rec.variance === 0 ? 'green' : 'red'} fw={600}>
                          {formatCurrency(rec.variance || 0)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rec.status === 'reconciled' ? 'green' : rec.status === 'discrepancy' ? 'red' : 'yellow'}>
                          {rec.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rec.checklist_completed ? 'green' : 'yellow'}>
                          {rec.checklist_completed ? 'Complete' : 'Pending'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ledger" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={700} size="xl">Ledger Reconciliation</Text>
              <Button onClick={fetchReconciliations}>Refresh</Button>
            </Group>

            {ledgerReconciliations.length === 0 ? (
              <Alert color="blue">No ledger mismatches found</Alert>
            ) : (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mismatch Type</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Expected</Table.Th>
                    <Table.Th>Actual</Table.Th>
                    <Table.Th>Variance</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {ledgerReconciliations.map((rec) => (
                    <Table.Tr key={rec.id}>
                      <Table.Td>
                        <Badge variant="light">{rec.mismatch_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{rec.description}</Text>
                      </Table.Td>
                      <Table.Td>{rec.expected_amount ? formatCurrency(rec.expected_amount) : '-'}</Table.Td>
                      <Table.Td>{rec.actual_amount ? formatCurrency(rec.actual_amount) : '-'}</Table.Td>
                      <Table.Td>
                        <Text c={rec.variance === 0 ? 'green' : 'red'} fw={600}>
                          {rec.variance ? formatCurrency(rec.variance) : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rec.status === 'resolved' ? 'green' : 'yellow'}>
                          {rec.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="craven" pt="md">
          <Stack gap="md">
            <Text fw={700} size="xl">Crave'n-Specific Transaction Tracing</Text>
            <Grid>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Text fw={600} mb="xs">Driver Payout Matching</Text>
                  <Text size="sm" c="dimmed">Track driver payouts against deliveries</Text>
                  <Progress value={75} mt="md" />
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Text fw={600} mb="xs">Merchant Settlement</Text>
                  <Text size="sm" c="dimmed">Match merchant settlements to orders</Text>
                  <Progress value={90} mt="md" />
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Text fw={600} mb="xs">Customer → Stripe → Payout</Text>
                  <Text size="sm" c="dimmed">End-to-end payment flow tracking</Text>
                  <Progress value={85} mt="md" />
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};



