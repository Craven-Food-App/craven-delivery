import React, { useEffect, useState } from 'react';
import { Card, Table, Text, Group, Stack, Loader, Center, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type PayrollRow = {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_status: string;
  payment_date: string | null;
};

export const PayrollView: React.FC = () => {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(
          'id, employee_id, pay_period_start, pay_period_end, gross_pay, total_deductions, net_pay, payment_status, payment_date'
        )
        .order('pay_period_start', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data || []) as PayrollRow[]);
    } catch (err) {
      console.error('Error loading payroll:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: 'orange',
      processed: 'blue',
      paid: 'green',
      failed: 'red',
    };
    return <Badge color={map[status] || 'gray'}>{status}</Badge>;
  };

  const totalNet = rows.reduce((sum, r) => sum + Number(r.net_pay || 0), 0);

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
              Payroll Runs
            </Text>
            <Text c="dimmed" size="sm">
              Recent payroll periods and net pay by employee
            </Text>
          </div>
          <Badge color="teal" size="lg">
            Total net pay (listed):{' '}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalNet)}
          </Badge>
        </Group>

        {rows.length === 0 ? (
          <Text c="dimmed">No payroll runs found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Gross Pay</Table.Th>
                <Table.Th>Deductions</Table.Th>
                <Table.Th>Net Pay</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Paid Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.employee_id}</Table.Td>
                  <Table.Td>
                    {dayjs(r.pay_period_start).format('YYYY-MM-DD')} –{' '}
                    {dayjs(r.pay_period_end).format('YYYY-MM-DD')}
                  </Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.gross_pay || 0)
                    )}
                  </Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.total_deductions || 0)
                    )}
                  </Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(r.net_pay || 0)
                    )}
                  </Table.Td>
                  <Table.Td>{renderStatus(r.payment_status)}</Table.Td>
                  <Table.Td>{r.payment_date ? dayjs(r.payment_date).format('YYYY-MM-DD') : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};


