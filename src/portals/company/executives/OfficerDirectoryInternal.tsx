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
      // Fetch from exec_users as the authoritative source
      const { data: execUsers, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, title, officer_status, metadata');

      if (execError) throw execError;

      // Get user profiles for names/emails
      const userIds = (execUsers || []).map(e => e.user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', userIds)
        : { data: [] as any[] };

      // Get corporate_officers for term dates
      const execIds = (execUsers || []).map(e => e.id).filter(Boolean);
      const { data: corpOfficers } = execIds.length
        ? await supabase.from('corporate_officers').select('executive_id, status, term_start, term_end, appointed_date').in('executive_id', execIds)
        : { data: [] as any[] };

      // Also get appointments for effective dates
      const { data: appointments } = execIds.length
        ? await supabase.from('executive_appointments').select('executive_id, effective_date, status, created_at').in('executive_id', execIds).order('created_at', { ascending: false })
        : { data: [] as any[] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const corpMap = new Map((corpOfficers || []).map(c => [c.executive_id, c]));
      const appointmentMap = new Map((appointments || []).map(a => [a.executive_id, a]));

      const transformed: CorporateOfficer[] = (execUsers || []).map(exec => {
        const profile = profileMap.get(exec.user_id);
        const corp = corpMap.get(exec.id);
        const appointment = appointmentMap.get(exec.id);
        const metadata = exec.metadata || {};

        const status = (corp?.status || exec.officer_status || 'appointed').toUpperCase();
        const fullName = profile?.full_name || metadata?.proposed_officer_name || exec.title || 'Unknown';
        const email = profile?.email || metadata?.proposed_officer_email || undefined;
        const effectiveDate = corp?.term_start || corp?.appointed_date || appointment?.effective_date || appointment?.created_at || new Date().toISOString();

        return {
          id: exec.id,
          full_name: fullName,
          email,
          title: exec.title || exec.role?.toUpperCase() || 'Officer',
          effective_date: effectiveDate,
          term_end: corp?.term_end || undefined,
          status,
        };
      });

      // Apply status filter
      const filtered = statusFilter === 'all'
        ? transformed
        : transformed.filter(o => o.status.toLowerCase().includes(statusFilter.toLowerCase()));

      setOfficers(filtered);
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
