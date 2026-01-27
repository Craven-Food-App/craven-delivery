import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Table, Badge, Group, Button, Loader, Alert } from '@mantine/core';
import { IconUser, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Officer {
  id: string;
  position: string;
  executive_id: string;
  appointed_date: string;
  term_start: string;
  term_end: string | null;
  resolution_id: string | null;
  status: string;
  created_at: string;
  // Joined data
  executive_name?: string;
  executive_email?: string;
  executive_title?: string;
}

const OfficersTab: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('corporate_officers')
        .select(`
          *,
          exec_users:executive_id (
            id,
            name,
            email,
            title,
            role
          )
        `)
        .order('appointed_date', { ascending: false });

      if (error) {
        console.error('Error loading officers:', error);
        return;
      }

      // Transform data to include executive info
      const transformed = (data || []).map((officer: any) => {
        const exec = officer.exec_users;
        return {
          ...officer,
          executive_name: exec?.name || 'Unknown',
          executive_email: exec?.email || '',
          executive_title: exec?.title || exec?.role || '',
        };
      });

      setOfficers(transformed);
    } catch (err) {
      console.error('Error loading officers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      'president': 'President',
      'secretary': 'Secretary',
      'treasurer': 'Treasurer',
      'vice-president': 'Vice President',
      'assistant-secretary': 'Assistant Secretary',
      'assistant-treasurer': 'Assistant Treasurer',
    };
    return labels[position] || position;
  };

  const activeOfficers = officers.filter(o => o.status === 'active');
  const terminatedOfficers = officers.filter(o => o.status === 'terminated');

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading officers...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Corporate Officers</Title>
          <Text c="dimmed">Delaware statutory officer positions</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />}>
          Appoint Officer
        </Button>
      </Group>

      {/* Stats Cards */}
      <Group gap="md">
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Active Officers</Text>
            <Text size="2xl" fw={700} c="green">
              {activeOfficers.length}
            </Text>
          </Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Total Officers</Text>
            <Text size="2xl" fw={700}>
              {officers.length}
            </Text>
          </Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Terminated</Text>
            <Text size="2xl" fw={700} c="red">
              {terminatedOfficers.length}
            </Text>
          </Stack>
        </Card>
      </Group>

      {/* Active Officers Table */}
      <div>
        <Title order={3} mb="md">Active Officers</Title>
        {activeOfficers.length === 0 ? (
          <Alert title="No Active Officers" color="gray">
            No active corporate officers found.
          </Alert>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Position</Table.Th>
                <Table.Th>Officer</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Appointed Date</Table.Th>
                <Table.Th>Term Start</Table.Th>
                <Table.Th>Term End</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeOfficers.map((officer) => (
                <Table.Tr key={officer.id}>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {getPositionLabel(officer.position)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{officer.executive_name}</Text>
                    {officer.executive_email && (
                      <Text size="xs" c="dimmed">{officer.executive_email}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{officer.executive_title}</Text>
                  </Table.Td>
                  <Table.Td>
                    {new Date(officer.appointed_date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {new Date(officer.term_start).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {officer.term_end
                      ? new Date(officer.term_end).toLocaleDateString()
                      : 'Indefinite'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" leftSection={<IconCheck size={14} />}>
                      {officer.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {/* Terminated Officers (if any) */}
      {terminatedOfficers.length > 0 && (
        <div>
          <Title order={3} mb="md">Terminated Officers</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Position</Table.Th>
                <Table.Th>Officer</Table.Th>
                <Table.Th>Appointed Date</Table.Th>
                <Table.Th>Term End</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {terminatedOfficers.map((officer) => (
                <Table.Tr key={officer.id}>
                  <Table.Td>
                    <Badge variant="light">{getPositionLabel(officer.position)}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{officer.executive_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    {new Date(officer.appointed_date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {officer.term_end
                      ? new Date(officer.term_end).toLocaleDateString()
                      : 'N/A'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color="red" leftSection={<IconX size={14} />}>
                      {officer.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Stack>
  );
};

export default OfficersTab;
