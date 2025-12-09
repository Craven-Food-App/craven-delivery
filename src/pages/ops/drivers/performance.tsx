import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Table,
  Badge,
  Progress,
  Group,
  Select,
  Loader,
  Center,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DriverPerformance {
  driver_id: string;
  driver_name: string;
  score: number;
  on_time_rate: number;
  acceptance_rate: number;
  completion_rate: number;
  hotspot_compliance: number;
}

export default function DriverPerformanceDashboard() {
  const [scoreFilter, setScoreFilter] = useState<string>('all');

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['driver-performance', scoreFilter],
    queryFn: async () => {
      let query = supabase
        .from('driver_scores')
        .select('*, drivers:driver_id(name)')
        .order('overall_score', { ascending: false })
        .limit(100);

      if (scoreFilter === 'high') {
        query = query.gte('overall_score', 90);
      } else if (scoreFilter === 'medium') {
        query = query.gte('overall_score', 70).lt('overall_score', 90);
      } else if (scoreFilter === 'low') {
        query = query.lt('overall_score', 70);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching driver performance:', error);
      }

      return (data || []).map((item: any) => ({
        driver_id: item.driver_id,
        driver_name: item.drivers?.name || 'Unknown Driver',
        score: item.overall_score || 0,
        on_time_rate: item.on_time_rate || 0,
        acceptance_rate: item.acceptance_rate || 0,
        completion_rate: item.completion_rate || 0,
        hotspot_compliance: item.hotspot_compliance || 0,
      })) as DriverPerformance[];
    },
  });

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge color="green">Excellent</Badge>;
    if (score >= 80) return <Badge color="blue">Good</Badge>;
    if (score >= 70) return <Badge color="yellow">Fair</Badge>;
    return <Badge color="red">Needs Improvement</Badge>;
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Driver Performance Dashboard</Title>
          <Text c="dimmed" size="sm">
            Monitor driver performance metrics and scores
          </Text>
        </div>
        <Select
          value={scoreFilter}
          onChange={(value) => setScoreFilter(value || 'all')}
          data={[
            { value: 'all', label: 'All Scores' },
            { value: 'high', label: 'High (90+)' },
            { value: 'medium', label: 'Medium (70-89)' },
            { value: 'low', label: 'Low (<70)' },
          ]}
          style={{ width: 200 }}
        />
      </Group>

      <Card withBorder padding="lg">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Driver</Table.Th>
              <Table.Th>Score</Table.Th>
              <Table.Th>On-Time %</Table.Th>
              <Table.Th>Acceptance %</Table.Th>
              <Table.Th>Completion %</Table.Th>
              <Table.Th>Hotspot Compliance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {drivers && drivers.length > 0 ? (
              drivers.map((driver) => (
                <Table.Tr key={driver.driver_id}>
                  <Table.Td>{driver.driver_name}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {getScoreBadge(driver.score)}
                      <Text fw={600}>{driver.score}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      <Progress value={driver.on_time_rate} size="sm" />
                      <Text size="xs">{driver.on_time_rate.toFixed(1)}%</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      <Progress value={driver.acceptance_rate} size="sm" />
                      <Text size="xs">{driver.acceptance_rate.toFixed(1)}%</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      <Progress value={driver.completion_rate} size="sm" />
                      <Text size="xs">{driver.completion_rate.toFixed(1)}%</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      <Progress value={driver.hotspot_compliance} size="sm" />
                      <Text size="xs">{driver.hotspot_compliance.toFixed(1)}%</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="xl">
                    No driver performance data found
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}


