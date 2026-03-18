// @ts-nocheck
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
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface CorporateOfficer {
  id: string;
  full_name: string;
  email?: string;
  title: string;
  effective_date: string;
  term_end?: string;
  status: string;
}

const OfficerDirectoryInternal: React.FC = () => {
  const [officers, setOfficers] = useState<CorporateOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    fetchOfficers();
  }, [statusFilter]);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('corporate_officers')
        .select(`
          id,
          position,
          status,
          term_start,
          term_end,
          appointed_date,
          exec_users:executive_id (
            user_id,
            title,
            metadata
          )
        `)
        .order('term_start', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.ilike('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setOfficers([]);
          return;
        }
        throw error;
      }

      const userIds = (data || [])
        .map((officer: any) => officer.exec_users?.user_id)
        .filter(Boolean);

      const { data: profiles } = userIds.length
        ? await supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', userIds)
        : { data: [] as any[] };

      const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));

      const transformed = (data || []).map((officer: any) => {
        const exec = officer.exec_users;
        const profile = exec?.user_id ? profileMap.get(exec.user_id) : null;
        const metadata = exec?.metadata || {};

        return {
          id: officer.id,
          full_name:
            profile?.full_name ||
            metadata?.proposed_officer_name ||
            exec?.title ||
            officer.position ||
            'Unknown',
          email: profile?.email || metadata?.proposed_officer_email || undefined,
          title: exec?.title || officer.position || 'Officer',
          effective_date: officer.term_start || officer.appointed_date,
          term_end: officer.term_end || undefined,
          status: String(officer.status || '').toUpperCase(),
        } as CorporateOfficer;
      });

      setOfficers(transformed);
    } catch (error: any) {
      console.error('Error fetching officers:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load officers',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPOINTED':
        return 'green';
      case 'RESIGNED':
        return 'orange';
      case 'REMOVED':
      case 'TERMINATED':
        return 'red';
      case 'EXPIRED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600} size="lg" c="dark">
          Corporate Officers Directory
        </Text>
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value || 'active')}
          data={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'appointed', label: 'Appointed' },
            { value: 'resigned', label: 'Resigned' },
            { value: 'removed', label: 'Removed' },
            { value: 'terminated', label: 'Terminated' },
            { value: 'expired', label: 'Expired' },
          ]}
          style={{ width: 220 }}
        />
      </Group>

      {officers.length === 0 ? (
        <Paper p="xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
          <Center>
            <Text c="dimmed">No officers found</Text>
          </Center>
        </Paper>
      ) : (
        <Paper style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={800}>
            <Table verticalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th c="dimmed">Name</Table.Th>
                  <Table.Th c="dimmed">Title</Table.Th>
                  <Table.Th c="dimmed">Email</Table.Th>
                  <Table.Th c="dimmed">Status</Table.Th>
                  <Table.Th c="dimmed">Effective Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {officers.map((officer) => (
                  <Table.Tr key={officer.id}>
                    <Table.Td>
                      <Text fw={500} c="dark">
                        {officer.full_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dark">{officer.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">
                        {officer.email || 'N/A'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(officer.status)} variant="light">
                        {officer.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dark" size="sm">
                        {dayjs(officer.effective_date).format('MMM D, YYYY')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}
    </Stack>
  );
};

export default OfficerDirectoryInternal;
