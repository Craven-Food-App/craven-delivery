import React, { useEffect, useState } from 'react';
import { Card, Table, Text, Group, Stack, Loader, Center, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type ARRow = {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
};

export const AccountsReceivableView: React.FC = () => {
  const [rows, setRows] = useState<ARRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select(
          'id, invoice_number, customer_name, invoice_date, due_date, total_amount, paid_amount, outstanding_amount, status'
        )
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;
      setRows((data || []) as ARRow[]);
    } catch (err) {
      console.error('Error loading accounts_receivable:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string, dueDate: string, outstanding: number) => {
    const today = dayjs();
    let color: string = 'gray';

    if (status === 'paid') color = 'green';
    else if (status === 'overdue' || (outstanding > 0 && dayjs(dueDate).isBefore(today, 'day'))) color = 'red';
    else if (status === 'partial') color = 'orange';
    else color = 'blue';

    return <Badge color={color}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Card p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">
              Accounts Receivable
            </Text>
            <Text c="dimmed" size="sm">
              Live view of open and paid customer invoices
            </Text>
          </div>
          <Badge color="blue" size="lg">
            Total items: {rows.length}
          </Badge>
        </Group>

        {rows.length === 0 ? (
          <Text c="dimmed">No receivables found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice #</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Invoice Date</Table.Th>
                <Table.Th>Due Date</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Paid</Table.Th>
                <Table.Th>Outstanding</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.invoice_number}</Table.Td>
                  <Table.Td>{r.customer_name}</Table.Td>
                  <Table.Td>{dayjs(r.invoice_date).format('YYYY-MM-DD')}</Table.Td>
                  <Table.Td>{dayjs(r.due_date).format('YYYY-MM-DD')}</Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.total_amount || 0)
                    )}
                  </Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.paid_amount || 0)
                    )}
                  </Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.outstanding_amount || 0)
                    )}
                  </Table.Td>
                  <Table.Td>{renderStatus(r.status, r.due_date, r.outstanding_amount)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};


