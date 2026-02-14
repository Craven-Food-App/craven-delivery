import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Table,
  Tabs,
  Badge,
  Group,
  Select,
  Loader,
  Center,
  NumberFormatter,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function BonusesPenaltiesView() {
  const [activeTab, setActiveTab] = useState<string>('bonuses');

  const { data: bonuses, isLoading: bonusesLoading } = useQuery({
    queryKey: ['driver-bonuses-ops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_bonuses')
        .select('*, drivers:driver_id(name)')
        .order('bonus_date', { ascending: false })
        .limit(50);

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching bonuses:', error);
      }

      return (data || []).map((b: any) => ({
        ...b,
        driver_name: b.drivers?.name || 'Unknown',
      }));
    },
  });

  const { data: penalties, isLoading: penaltiesLoading } = useQuery({
    queryKey: ['driver-penalties-ops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_penalties')
        .select('*, drivers:driver_id(name)')
        .order('penalty_date', { ascending: false })
        .limit(50);

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching penalties:', error);
      }

      return (data || []).map((p: any) => ({
        ...p,
        driver_name: p.drivers?.name || 'Unknown',
      }));
    },
  });

  const getPenaltySeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'yellow',
      medium: 'orange',
      high: 'red',
      critical: 'dark',
    };
    return <Badge color={colors[severity] || 'gray'}>{severity}</Badge>;
  };

  if (bonusesLoading || penaltiesLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>Bonuses & Penalties</Title>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'bonuses')}>
        <Tabs.List>
          <Tabs.Tab value="bonuses">Bonuses</Tabs.Tab>
          <Tabs.Tab value="penalties">Penalties</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="bonuses" pt="md">
          <Card withBorder padding="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Driver</Table.Th>
                  <Table.Th>Bonus Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bonuses && bonuses.length > 0 ? (
                  bonuses.map((bonus: any) => (
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
                      <Table.Td>{new Date(bonus.bonus_date).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Badge color={bonus.status === 'paid' ? 'green' : 'blue'}>
                          {bonus.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="xl">
                        No bonuses found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="penalties" pt="md">
          <Card withBorder padding="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Driver</Table.Th>
                  <Table.Th>Penalty Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Severity</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {penalties && penalties.length > 0 ? (
                  penalties.map((penalty: any) => (
                    <Table.Tr key={penalty.id}>
                      <Table.Td>{penalty.driver_name}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="red">
                          {penalty.penalty_type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <NumberFormatter
                          value={(penalty.amount_cents || 0) / 100}
                          prefix="$"
                          decimalScale={2}
                        />
                      </Table.Td>
                      <Table.Td>{getPenaltySeverityBadge(penalty.severity || 'medium')}</Table.Td>
                      <Table.Td>{new Date(penalty.penalty_date).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Badge color={penalty.status === 'resolved' ? 'green' : 'red'}>
                          {penalty.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="xl">
                        No penalties found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}



