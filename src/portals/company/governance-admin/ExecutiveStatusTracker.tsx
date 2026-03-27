// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Group,
  Alert,
  Timeline,
  Paper,
  Grid,
  Button,
  Modal,
  Textarea,
  Select,
  ScrollArea,
  Center,
} from '@mantine/core';
import {
  IconUser,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconHistory,
  IconBuilding,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { syncExecutiveStatus, createAuditTrail } from '@/lib/governance/StatusManager';
import dayjs from 'dayjs';

interface ExecutiveStatus {
  id: string;
  name: string;
  title: string;
  email: string;
  status: 'active' | 'removed' | 'resigned' | 'terminated';
  appointment_date?: string;
  removal_date?: string;
  resignation_date?: string;
  removal_reason?: string;
  resignation_reason?: string;
  current_roles?: string[];
}

const ExecutiveStatusTracker: React.FC = () => {
  const [executives, setExecutives] = useState<ExecutiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecutive, setSelectedExecutive] = useState<ExecutiveStatus | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'removed' | 'resigned' | 'terminated'>('removed');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');

  useEffect(() => {
    loadExecutiveStatuses();
  }, []);

  const loadExecutiveStatuses = async () => {
    setLoading(true);
    try {
      // Load all corporate officers
      const { data: officers } = await supabase
        .from('corporate_officers')
        .select('id, officer_name, title, email, status, appointment_date')
        .order('appointment_date', { ascending: false });

      // Load exit workflows
      const { data: exits } = await supabase
        .from('exit_workflows')
        .select('*, employee:employees(first_name, last_name, email, position)')
        .in('status', ['completed', 'board_approved'])
        .order('effective_date', { ascending: false });

      // Load user roles for each executive
      const executiveList: ExecutiveStatus[] = [];

      if (officers) {
        for (const officer of officers) {
          // Get user roles
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('email', officer.email)
            .single();

          let roles: string[] = [];
          if (userProfile) {
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userProfile.user_id);
            roles = userRoles?.map((r) => r.role) || [];
          }

          // Find matching exit workflow
          const exit = exits?.find(
            (e: any) => e.employee?.email === officer.email
          );

          executiveList.push({
            id: officer.id,
            name: officer.officer_name,
            title: officer.title,
            email: officer.email,
            status: officer.status.toLowerCase() as any,
            appointment_date: officer.appointment_date,
            removal_date: exit?.effective_date,
            removal_reason: exit?.termination_reason,
            resignation_reason: exit?.termination_type === 'resignation' ? exit.termination_reason : undefined,
            current_roles: roles,
          });
        }
      }

      setExecutives(executiveList);
    } catch (error: any) {
      console.error('Error loading executive statuses:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load executive statuses',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedExecutive) return;

    try {
      const success = await syncExecutiveStatus(
        selectedExecutive.email,
        newStatus,
        reason,
        effectiveDate || new Date().toISOString().split('T')[0]
      );

      if (success) {
        await createAuditTrail(
          `executive_${newStatus}`,
          'executive',
          selectedExecutive.id,
          `${selectedExecutive.name} (${selectedExecutive.email}) - ${newStatus}`,
          {
            reason,
            effective_date: effectiveDate,
            previous_status: selectedExecutive.status,
          }
        );

        notifications.show({
          title: 'Success',
          message: `Executive status updated to ${newStatus}`,
          color: 'green',
        });

        setStatusModalOpen(false);
        setReason('');
        setEffectiveDate('');
        await loadExecutiveStatuses();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update executive status',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (exec: ExecutiveStatus) => {
    const statusMap = {
      active: { color: 'green', icon: <IconCheck size={14} />, label: 'Active' },
      removed: { color: 'red', icon: <IconX size={14} />, label: 'Removed' },
      resigned: { color: 'orange', icon: <IconClock size={14} />, label: 'Resigned' },
      terminated: { color: 'red', icon: <IconX size={14} />, label: 'Terminated' },
    };
    const statusInfo = statusMap[exec.status] || statusMap.active;
    return (
      <Badge color={statusInfo.color} variant="light" leftSection={statusInfo.icon}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '32px',
            color: 'white',
          }}
        >
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
              <IconBuilding size={40} color="#ff6a00" stroke={2.5} />
            </Box>
            <div>
              <Title order={1} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                Executive Status Tracker
              </Title>
              <Text c="gray.3" size="lg" style={{ letterSpacing: '0.3px' }}>
                Real-time status of all executives across all systems
              </Text>
            </div>
          </Group>
        </Box>

        <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
          This tracker shows the unified status of all executives across appointments, corporate officers, and exit workflows.
          Status changes are automatically synchronized across all systems.
        </Alert>

        <Card padding="lg" radius="md" withBorder>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Executive</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Appointment Date</Table.Th>
                  <Table.Th>Removal/Resignation</Table.Th>
                  <Table.Th>Current Roles</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {executives.map((exec) => (
                  <Table.Tr key={exec.id}>
                    <Table.Td>
                      <Text fw={500}>{exec.name}</Text>
                    </Table.Td>
                    <Table.Td>{exec.title}</Table.Td>
                    <Table.Td>{exec.email}</Table.Td>
                    <Table.Td>{getStatusBadge(exec)}</Table.Td>
                    <Table.Td>
                      {exec.appointment_date ? (
                        <Text size="sm">{dayjs(exec.appointment_date).format('MMM D, YYYY')}</Text>
                      ) : (
                        <Text size="sm" c="dimmed">N/A</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {exec.removal_date && (
                        <div>
                          <Text size="sm" c="red" fw={500}>
                            Removed: {dayjs(exec.removal_date).format('MMM D, YYYY')}
                          </Text>
                          {exec.removal_reason && (
                            <Text size="xs" c="dimmed">
                              {exec.removal_reason}
                            </Text>
                          )}
                        </div>
                      )}
                      {exec.resignation_date && (
                        <div>
                          <Text size="sm" c="orange" fw={500}>
                            Resigned: {dayjs(exec.resignation_date).format('MMM D, YYYY')}
                          </Text>
                          {exec.resignation_reason && (
                            <Text size="xs" c="dimmed">
                              {exec.resignation_reason}
                            </Text>
                          )}
                        </div>
                      )}
                      {!exec.removal_date && !exec.resignation_date && (
                        <Text size="sm" c="dimmed">Active</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {exec.current_roles && exec.current_roles.length > 0 ? (
                        <Group gap={4}>
                          {exec.current_roles.slice(0, 2).map((role) => (
                            <Badge key={role} size="xs" variant="light">
                              {role.replace('CRAVEN_', '')}
                            </Badge>
                          ))}
                          {exec.current_roles.length > 2 && (
                            <Badge size="xs" variant="light">
                              +{exec.current_roles.length - 2}
                            </Badge>
                          )}
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">No roles</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {exec.status === 'active' && (
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          onClick={() => {
                            setSelectedExecutive(exec);
                            setNewStatus('removed');
                            setStatusModalOpen(true);
                          }}
                        >
                          Mark Removed
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {/* Status Change Modal */}
        <Modal
          opened={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false);
            setReason('');
            setEffectiveDate('');
          }}
          title={`Update Status: ${selectedExecutive?.name}`}
        >
          <Stack gap="md">
            <Alert color="red" variant="light">
              This will update the executive status across all systems: corporate_officers, executive_appointments, and user_roles.
            </Alert>
            <Select
              label="New Status"
              value={newStatus}
              onChange={(value) => setNewStatus((value as any) || 'removed')}
              data={[
                { value: 'removed', label: 'Removed' },
                { value: 'resigned', label: 'Resigned' },
                { value: 'terminated', label: 'Terminated' },
              ]}
            />
            <Textarea
              label="Reason"
              placeholder="Enter reason for status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <DateInput
              label="Effective Date"
              value={effectiveDate ? new Date(effectiveDate) : null}
              onChange={(value) => setEffectiveDate(value ? dayjs(value).format('YYYY-MM-DD') : '')}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setStatusModalOpen(false);
                  setReason('');
                  setEffectiveDate('');
                }}
              >
                Cancel
              </Button>
              <Button color="red" onClick={handleStatusChange}>
                Update Status
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default ExecutiveStatusTracker;

