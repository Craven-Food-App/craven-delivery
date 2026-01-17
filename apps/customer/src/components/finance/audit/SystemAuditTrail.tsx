import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Table,
  Badge,
  TextInput,
  Select,
  Button,
  ScrollArea,
  Timeline,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconRefresh,
  IconShield,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AuditTrailEntry } from './types';

export const SystemAuditTrail: React.FC = () => {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(dayjs().subtract(7, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchTrail();
  }, [actionFilter, startDate, endDate]);

  const fetchTrail = async () => {
    setLoading(true);
    try {
      const startDateStr = startDate ? dayjs(startDate).toISOString() : null;
      const endDateStr = endDate ? dayjs(endDate).toISOString() : null;

      let query = supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (startDateStr) query = query.gte('created_at', startDateStr);
      if (endDateStr) query = query.lte('created_at', endDateStr);
      if (actionFilter) query = query.eq('action_type', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as AuditTrailEntry[]);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry =>
    !searchTerm ||
    entry.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="xl" mb="xs">System-Level Audit Trail</Text>
          <Text c="dimmed" size="sm">Immutable log of all system activities and changes</Text>
        </div>
        <Badge size="lg" color="blue" leftSection={<IconShield size={16} />}>
          Read-Only
        </Badge>
      </Group>

      <Group gap="md">
        <TextInput
          placeholder="Search audit trail..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Action Type"
          data={['login', 'logout', 'transaction_create', 'transaction_update', 'transaction_delete', 'cfo_override', 'document_upload']}
          value={actionFilter}
          onChange={setActionFilter}
          clearable
          style={{ width: 200 }}
        />
        <DatePickerInput
          placeholder="Start Date"
          value={startDate}
          onChange={setStartDate}
          style={{ width: 150 }}
        />
        <DatePickerInput
          placeholder="End Date"
          value={endDate}
          onChange={setEndDate}
          style={{ width: 150 }}
        />
        <Button leftSection={<IconRefresh size={16} />} onClick={fetchTrail}>
          Refresh
        </Button>
      </Group>

      <ScrollArea h={600}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Timestamp</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>IP Address</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredEntries.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {dayjs(entry.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{entry.user_email || 'System'}</Text>
                  {entry.user_role && (
                    <Badge size="xs" variant="light">{entry.user_role}</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">{entry.action_type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{entry.action_description}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {entry.target_type} {entry.target_id ? `(${entry.target_id.substring(0, 8)}...)` : ''}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" ff="monospace" c="dimmed">{entry.ip_address || '-'}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
};

