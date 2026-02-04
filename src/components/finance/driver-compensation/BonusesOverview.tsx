// @ts-nocheck
import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Table,
  Button,
  Group,
  Badge,
  Select,
  Loader,
  Center,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { NumberFormatter } from '@mantine/core';

interface DriverBonus {
  id: string;
  driver_id: string;
  driver_name?: string;
  bonus_type: string;
  amount_cents: number;
  bonus_date: string;
  period_start?: string;
  period_end?: string;
  status: string;
  description?: string;
}

export const BonusesOverview: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch bonuses
  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['driver-bonuses', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('driver_bonuses')
        .select('*, drivers:driver_id(name)')
        .order('bonus_date', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching bonuses:', error);
      }

      return (data || []).map((bonus: any) => ({
        ...bonus,
        driver_name: bonus.drivers?.name || 'Unknown Driver',
      })) as DriverBonus[];
    },
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      approved: 'blue',
      paid: 'green',
      rejected: 'red',
    };
    return <Badge color={colors[status] || 'gray'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
      <Stack gap="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/finance/driver-compensation')}
          >
            Back to Dashboard
          </Button>
        </Group>

        <Group justify="space-between">
          <div>
            <Title order={2}>Bonuses Overview</Title>
            <Text c="dimmed" size="sm">
              View and manage driver bonuses
            </Text>
          </div>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'all')}
            data={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'paid', label: 'Paid' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            style={{ width: 200 }}
          />
        </Group>

        <Card withBorder padding="lg">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Bonus Type</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bonuses && bonuses.length > 0 ? (
                bonuses.map((bonus) => (
                  <Table.Tr key={bonus.id}>
                    <Table.Td>{bonus.driver_name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{bonus.bonus_type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <NumberFormatter
                        value={(bonus.amount_cents || 0) / 100}
                        prefix="$"
                        decimalScale={2}
                      />
                    </Table.Td>
                    <Table.Td>
                      {bonus.period_start && bonus.period_end
                        ? `${bonus.period_start} - ${bonus.period_end}`
                        : 'N/A'}
                    </Table.Td>
                    <Table.Td>{getStatusBadge(bonus.status)}</Table.Td>
                    <Table.Td>{new Date(bonus.bonus_date).toLocaleDateString()}</Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="xl">
                      No bonuses found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
  );
};

