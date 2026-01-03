import React, { useState, useEffect } from 'react';
import {
  Table,
  Badge,
  Button,
  Stack,
  Group,
  Text,
  Select,
  Paper,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Modal,
  Box,
  Title,
  ScrollArea,
  Card,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconEye, IconFileText, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface CorporateOfficer {
  id: string;
  full_name: string;
  email?: string;
  title: string;
  effective_date: string;
  term_end?: string;
  status: string;
  certificate_url?: string;
}

const OfficerLedger: React.FC = () => {
  const [officers, setOfficers] = useState<CorporateOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showRemoved, setShowRemoved] = useState<boolean>(true);
  const [selectedOfficer, setSelectedOfficer] = useState<CorporateOfficer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchOfficers();
  }, [statusFilter]);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('corporate_officers')
        .select('*')
        .order('effective_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          notifications.show({
            title: 'Setup Required',
            message: 'Governance tables not found. Please run the database migration.',
            color: 'orange',
          });
          setOfficers([]);
          return;
        }
        throw error;
      }

      setOfficers(data || []);
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
        return 'green';
      case 'RESIGNED':
        return 'orange';
      case 'REMOVED':
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
                <IconUserCheck size={32} color="#ff6a00" stroke={2.5} />
              </Box>
              <div>
                <Title order={2} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                  Corporate Officers Ledger
                </Title>
                <Text c="gray.3" size="sm" style={{ letterSpacing: '0.3px' }}>
                  Complete registry of corporate officers and their appointments
                </Text>
              </div>
            </Group>
            <Group gap="md" mt="md">
              <Badge size="lg" variant="light" color="blue">
                {officers.length} Total Officers
              </Badge>
              <Badge size="lg" variant="light" color="green">
                {officers.filter(o => o.status === 'ACTIVE').length} Active
              </Badge>
            </Group>
          </div>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'ACTIVE')}
            data={[
              { value: 'all', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'RESIGNED', label: 'Resigned' },
              { value: 'REMOVED', label: 'Removed' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
            style={{ width: 200 }}
            size="md"
          />
        </Group>
      </Paper>

      {officers.length === 0 ? (
        <Card padding="xl" radius="md" withBorder>
          <Center>
            <Text c="dimmed">No officers found</Text>
          </Center>
        </Card>
      ) : (
        <Card padding={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
          <ScrollArea>
            <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
                <Table.Tr>
                  <Table.Th style={{ fontWeight: 600 }}>Name</Table.Th>
                  <Table.Th style={{ fontWeight: 600 }}>Title</Table.Th>
                  <Table.Th style={{ fontWeight: 600 }}>Status</Table.Th>
                  <Table.Th style={{ fontWeight: 600 }}>Effective Date</Table.Th>
                  <Table.Th style={{ fontWeight: 600 }}>Term End</Table.Th>
                  <Table.Th style={{ fontWeight: 600 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {officers.map((officer) => (
                  <Table.Tr key={officer.id}>
                    <Table.Td>
                      <Text fw={500} c="dark">
                        {officer.full_name}
                      </Text>
                      {officer.email && (
                        <Text size="xs" c="dimmed">
                          {officer.email}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text c="dark">{officer.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(officer.status)} variant="light">
                        {officer.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dark">
                        {dayjs(officer.effective_date).format('MMM D, YYYY')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dark">
                        {officer.term_end ? dayjs(officer.term_end).format('MMM D, YYYY') : 'N/A'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View Details">
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              setSelectedOfficer(officer);
                              setDetailModalOpen(true);
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {officer.certificate_url && (
                          <Tooltip label="View Certificate">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              component="a"
                              href={officer.certificate_url}
                              target="_blank"
                            >
                              <IconFileText size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOfficer(null);
        }}
        title="Officer Details"
        size="lg"
      >
        {selectedOfficer && (
          <Stack gap="md">
            <Group>
              <Text fw={500}>Name:</Text>
              <Text>{selectedOfficer.full_name}</Text>
            </Group>
            {selectedOfficer.email && (
              <Group>
                <Text fw={500}>Email:</Text>
                <Text>{selectedOfficer.email}</Text>
              </Group>
            )}
            <Group>
              <Text fw={500}>Title:</Text>
              <Text>{selectedOfficer.title}</Text>
            </Group>
            <Group>
              <Text fw={500}>Status:</Text>
              <Badge color={getStatusColor(selectedOfficer.status)}>
                {selectedOfficer.status}
              </Badge>
            </Group>
            <Group>
              <Text fw={500}>Effective Date:</Text>
              <Text>{dayjs(selectedOfficer.effective_date).format('MMMM D, YYYY')}</Text>
            </Group>
            {selectedOfficer.term_end && (
              <Group>
                <Text fw={500}>Term End:</Text>
                <Text>{dayjs(selectedOfficer.term_end).format('MMMM D, YYYY')}</Text>
              </Group>
            )}
            {selectedOfficer.certificate_url && (
              <Group>
                <Button
                  component="a"
                  href={selectedOfficer.certificate_url}
                  target="_blank"
                  leftSection={<IconFileText size={16} />}
                >
                  View Certificate
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default OfficerLedger;
