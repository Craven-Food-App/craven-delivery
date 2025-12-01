import React, { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Loader, Center, Table, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type BankAccount = {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  account_type: string | null;
  currency: string | null;
  current_balance: number | null;
  last_reconciled_at: string | null;
};

export const BankingTreasuryView: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number, account_type, currency, current_balance, last_reconciled_at')
        .order('bank_name', { ascending: true });

      if (error) {
        console.warn('Bank accounts table not available for treasury view:', error.message);
        setAccounts([]);
      } else {
        setAccounts((data || []) as BankAccount[]);
      }
    } catch (err) {
      console.error('Error loading bank_accounts:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

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
              Banking &amp; Treasury
            </Text>
            <Text c="dimmed" size="sm">
              Live cash position by bank account
            </Text>
          </div>
          <Badge color="teal" size="lg">
            Total cash:{' '}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance)}
          </Badge>
        </Group>

        {accounts.length === 0 ? (
          <Text c="dimmed">No bank accounts found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Bank</Table.Th>
                <Table.Th>Account</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Currency</Table.Th>
                <Table.Th>Balance</Table.Th>
                <Table.Th>Last Reconciled</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accounts.map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td>{a.bank_name || 'N/A'}</Table.Td>
                  <Table.Td>{a.account_number || 'N/A'}</Table.Td>
                  <Table.Td>{a.account_type || 'N/A'}</Table.Td>
                  <Table.Td>{a.currency || 'USD'}</Table.Td>
                  <Table.Td>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: a.currency || 'USD',
                    }).format(Number(a.current_balance || 0))}
                  </Table.Td>
                  <Table.Td>
                    {a.last_reconciled_at
                      ? dayjs(a.last_reconciled_at).format('YYYY-MM-DD')
                      : 'Not reconciled'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};


