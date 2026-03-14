import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  SimpleGrid,
  Stack,
  Badge,
  Progress,
  Skeleton,
  Table,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';

const PartnershipAnalytics: React.FC = () => {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase.from('partnerships').select('*');
    setPartnerships(data || []);
    setLoading(false);
  };

  if (loading) return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={150} radius="md" />)}</Stack>;

  // Analytics calculations
  const byType = partnerships.reduce((acc: Record<string, number>, p) => {
    acc[p.partner_type] = (acc[p.partner_type] || 0) + 1;
    return acc;
  }, {});

  const byStatus = partnerships.reduce((acc: Record<string, number>, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const byPriority = partnerships.reduce((acc: Record<string, number>, p) => {
    acc[p.priority || 'medium'] = (acc[p.priority || 'medium'] || 0) + 1;
    return acc;
  }, {});

  const totalValue = partnerships.reduce((sum, p) => sum + (Number(p.deal_value) || 0), 0);
  const activeValue = partnerships
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (Number(p.deal_value) || 0), 0);

  const typeLabels: Record<string, string> = {
    restaurant_merchant: 'Restaurant/Merchant',
    strategic_corporate: 'Strategic/Corporate',
    technology_integration: 'Technology/Integration',
    revenue_share: 'Revenue Share',
    co_marketing: 'Co-Marketing',
    vendor: 'Vendor',
    other: 'Other',
  };

  const statusColors: Record<string, string> = {
    lead: 'gray',
    prospect: 'blue',
    negotiation: 'yellow',
    contract_review: 'orange',
    active: 'green',
    on_hold: 'red',
    churned: 'dark',
    terminated: 'dark',
  };

  const topPartners = [...partnerships]
    .filter(p => p.deal_value)
    .sort((a, b) => Number(b.deal_value) - Number(a.deal_value))
    .slice(0, 5);

  return (
    <Stack gap="lg">
      <Title order={3}>Partnership Analytics</Title>

      {/* Value Summary */}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Pipeline Value</Text>
          <Title order={2} mt="xs">${totalValue.toLocaleString()}</Title>
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Active Partnership Value</Text>
          <Title order={2} mt="xs" c="green">${activeValue.toLocaleString()}</Title>
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Conversion Rate</Text>
          <Title order={2} mt="xs">
            {partnerships.length > 0
              ? `${Math.round((byStatus['active'] || 0) / partnerships.length * 100)}%`
              : '0%'}
          </Title>
          <Text size="xs" c="dimmed">Lead to Active</Text>
        </Card>
      </SimpleGrid>

      {/* Breakdown Cards */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {/* By Type */}
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Title order={4} mb="md">By Partnership Type</Title>
          <Stack gap="sm">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{typeLabels[type] || type}</Text>
                  <Text size="sm" fw={600}>{count as number}</Text>
                </Group>
                <Progress
                  value={partnerships.length > 0 ? ((count as number) / partnerships.length) * 100 : 0}
                  color="orange"
                  size="sm"
                />
              </div>
            ))}
            {Object.keys(byType).length === 0 && (
              <Text c="dimmed" ta="center" py="md">No data</Text>
            )}
          </Stack>
        </Card>

        {/* By Status */}
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Title order={4} mb="md">By Status</Title>
          <Stack gap="sm">
            {Object.entries(byStatus).map(([status, count]) => (
              <Group key={status} justify="space-between">
                <Badge color={statusColors[status] || 'gray'} variant="light">
                  {status.replace('_', ' ')}
                </Badge>
                <Text fw={600}>{count}</Text>
              </Group>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <Text c="dimmed" ta="center" py="md">No data</Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Top Partners by Value */}
      <Card shadow="sm" radius="md" padding="lg" withBorder>
        <Title order={4} mb="md">Top Partners by Deal Value</Title>
        {topPartners.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No partners with deal values yet</Text>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Partner</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Deal Value</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topPartners.map((p, i) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{i + 1}</Table.Td>
                  <Table.Td><Text fw={500}>{p.partner_name}</Text></Table.Td>
                  <Table.Td><Badge variant="light" size="sm">{typeLabels[p.partner_type] || p.partner_type}</Badge></Table.Td>
                  <Table.Td><Badge color={statusColors[p.status]} size="sm">{p.status}</Badge></Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}><Text fw={600} c="green">${Number(p.deal_value).toLocaleString()}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};

export default PartnershipAnalytics;
