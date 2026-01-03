import React, { useState, useEffect } from 'react';
import {
  Table,
  Badge,
  Stack,
  Group,
  Text,
  Select,
  Paper,
  Loader,
  Center,
  TextInput,
  Pagination,
  Box,
  Title,
  ScrollArea,
  Card,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconHistory } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface GovernanceLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description?: string;
  timestamp: string;
  actor_id?: string;
}

const GovernanceLogList: React.FC = () => {
  const [logs, setLogs] = useState<GovernanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('governance_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        if (error.code === '42P01') {
          notifications.show({
            title: 'Setup Required',
            message: 'Governance tables not found. Please run the database migration.',
            color: 'orange',
          });
          setLogs([]);
          return;
        }
        throw error;
      }

      setLogs(data || []);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load logs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPOINTED') || action.includes('ADOPTED')) return 'green';
    if (action.includes('REJECTED') || action.includes('REMOVED')) return 'red';
    if (action.includes('CREATED') || action.includes('SENT')) return 'blue';
    return 'gray';
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      {/* Enterprise Header */}
      <Paper
        p="xl"
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          color: 'white',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap={16} mb={8}>
              <Box
                style={{
                  backgroundColor: 'rgba(255, 106, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconHistory size={32} color="#ff6a00" stroke={2.5} />
              </Box>
              <div>
                <Title order={2} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                  Governance Logs
                </Title>
                <Text c="gray.3" size="sm" style={{ letterSpacing: '0.3px' }}>
                  Complete audit trail of all governance actions and decisions
                </Text>
              </div>
            </Group>
            <Group gap="md" mt="md">
              <Badge size="lg" variant="light" color="blue">
                {logs.length} Logs
              </Badge>
            </Group>
          </div>
          <Group gap="xs">
            <TextInput
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchLogs();
                }
              }}
              style={{ width: 250 }}
              size="md"
            />
            <Select
              placeholder="Filter by action"
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value || 'all');
                setPage(1);
              }}
              data={[
                { value: 'all', label: 'All Actions' },
                { value: 'APPOINTMENT_DRAFT_CREATED', label: 'Appointment Created' },
                { value: 'APPOINTMENT_SENT_TO_BOARD', label: 'Sent to Board' },
                { value: 'RESOLUTION_CREATED', label: 'Resolution Created' },
                { value: 'RESOLUTION_VOTED', label: 'Resolution Voted' },
                { value: 'RESOLUTION_ADOPTED', label: 'Resolution Adopted' },
                { value: 'OFFICER_APPOINTED', label: 'Officer Appointed' },
              ]}
              style={{ width: 200 }}
              size="md"
            />
          </Group>
        </Group>
      </Paper>

      {logs.length === 0 ? (
        <Card padding="xl" radius="md" withBorder>
          <Center>
            <Text c="dimmed">No logs found</Text>
          </Center>
        </Card>
      ) : (
        <>
          <Card padding={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
            <ScrollArea>
              <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
                  <Table.Tr>
                    <Table.Th style={{ fontWeight: 600 }}>Timestamp</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Action</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Entity</Table.Th>
                    <Table.Th style={{ fontWeight: 600 }}>Description</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {logs.map((log) => (
                    <Table.Tr key={log.id}>
                      <Table.Td>
                        <Text c="dark" size="sm">
                          {dayjs(log.timestamp).format('MMM D, YYYY HH:mm')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getActionColor(log.action)} variant="light" size="sm">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dark" size="sm">
                          {log.entity_type}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dark" size="sm" lineClamp={2}>
                          {log.description || 'No description'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
          {totalPages > 1 && (
            <Group justify="center">
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
};

export default GovernanceLogList;
