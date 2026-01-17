import React, { useEffect, useState } from 'react';
import { Card, Tabs, Table, Text, Group, Stack, Loader, Center, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type ExpenseRow = {
  id: string;
  request_number: string;
  expense_date: string;
  amount: number;
  currency: string;
  status: string;
  expense_category_id: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
  status: string;
  vendor_name: string;
};

type GLViewMode = 'standard' | 'fixed-assets';

interface GeneralLedgerViewProps {
  mode?: GLViewMode;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ mode = 'standard' }) => {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    void fetchExpenses();
    void fetchInvoices();
  }, [mode]);

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      let query = supabase
        .from('expense_requests')
        .select('id, request_number, expense_date, amount, currency, status, expense_category_id')
        .order('expense_date', { ascending: false })
        .limit(100);

      if (mode === 'fixed-assets') {
        // Simple heuristic: filter by equipment-related categories if present
        query = query.in('expense_category_id', []);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpenses((data || []) as ExpenseRow[]);
    } catch (err) {
      console.error('Error loading expense_requests for GL view:', err);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, currency, status, vendor_name')
        .order('invoice_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices((data || []) as InvoiceRow[]);
    } catch (err) {
      console.error('Error loading invoices for GL view:', err);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'gray',
      submitted: 'blue',
      pending_approval: 'orange',
      approved: 'green',
      rejected: 'red',
      paid: 'teal',
      cancelled: 'gray',
      pending: 'orange',
    };
    const color = map[status] || 'gray';
    return <Badge color={color}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <Stack gap="lg" p="lg">
      <Card p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">
              {mode === 'fixed-assets' ? 'Fixed Assets Register' : 'General Ledger View'}
            </Text>
            <Text c="dimmed" size="sm">
              Derived directly from expense requests and supplier invoices
            </Text>
          </div>
        </Group>

        <Tabs defaultValue="expenses">
          <Tabs.List>
            <Tabs.Tab value="expenses">Expense Requests</Tabs.Tab>
            <Tabs.Tab value="invoices">Supplier Invoices</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="expenses" pt="md">
            {loadingExpenses ? (
              <Center h={120}>
                <Loader />
              </Center>
            ) : expenses.length === 0 ? (
              <Text c="dimmed">No expense requests found.</Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Request #</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {expenses.map((e) => (
                    <Table.Tr key={e.id}>
                      <Table.Td>{e.request_number}</Table.Td>
                      <Table.Td>{dayjs(e.expense_date).format('YYYY-MM-DD')}</Table.Td>
                      <Table.Td>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: e.currency || 'USD',
                        }).format(Number(e.amount || 0))}
                      </Table.Td>
                      <Table.Td>{renderStatusBadge(e.status)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="invoices" pt="md">
            {loadingInvoices ? (
              <Center h={120}>
                <Loader />
              </Center>
            ) : invoices.length === 0 ? (
              <Text c="dimmed">No invoices found.</Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice #</Table.Th>
                    <Table.Th>Vendor</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Total Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {invoices.map((inv) => (
                    <Table.Tr key={inv.id}>
                      <Table.Td>{inv.invoice_number}</Table.Td>
                      <Table.Td>{inv.vendor_name}</Table.Td>
                      <Table.Td>{dayjs(inv.invoice_date).format('YYYY-MM-DD')}</Table.Td>
                      <Table.Td>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: inv.currency || 'USD',
                        }).format(Number(inv.total_amount || 0))}
                      </Table.Td>
                      <Table.Td>{renderStatusBadge(inv.status)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Stack>
  );
};


