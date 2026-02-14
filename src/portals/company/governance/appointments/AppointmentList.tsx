// @ts-nocheck
import React from 'react';
import { Table, Badge, Button, Group, Text, Stack, Card } from '@mantine/core';
import { IconCheck, IconX, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  executive_id: string;
  position: string;
  appointment_type: 'initial' | 'reappointment' | 'promotion' | 'lateral';
  appointment_date: string;
  effective_date: string;
  appointed_by: string;
  resolution_id?: string;
  status: 'pending' | 'approved' | 'active' | 'terminated';
  notes?: string;
}

interface AppointmentListProps {
  appointments: Appointment[];
  onApprove?: () => void;
  onReject?: () => void;
  showHistory?: boolean;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onApprove,
  onReject,
  showHistory = false,
}) => {
  const [executiveNames, setExecutiveNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (appointments.length === 0) return;

    const loadExecutiveNames = async () => {
      const executiveIds = [...new Set(appointments.map(a => a.executive_id))];
      const { data } = await supabase
        .from('exec_users')
        .select('id, name')
        .in('id', executiveIds);

      if (data) {
        const names: Record<string, string> = {};
        data.forEach(exec => {
          names[exec.id] = exec.name;
        });
        setExecutiveNames(names);
      }
    };

    loadExecutiveNames();
  }, [appointments]);

  const handleApprove = async (appointmentId: string) => {
    try {
      await supabase
        .from('executive_appointments')
        .update({ status: 'approved' })
        .eq('id', appointmentId);

      onApprove?.();
    } catch (err) {
      console.error('Error approving appointment:', err);
    }
  };

  const handleReject = async (appointmentId: string) => {
    try {
      await supabase
        .from('executive_appointments')
        .update({ status: 'terminated' })
        .eq('id', appointmentId);

      onReject?.();
    } catch (err) {
      console.error('Error rejecting appointment:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      approved: 'blue',
      active: 'green',
      terminated: 'red',
    };

    return (
      <Badge color={colors[status] || 'gray'} variant="light">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: 'Initial',
      reappointment: 'Reappointment',
      promotion: 'Promotion',
      lateral: 'Lateral Move',
    };
    return labels[type] || type;
  };

  if (appointments.length === 0) {
    return (
      <Card padding="xl" withBorder>
        <Stack align="center" gap="md" py="xl">
          <Text c="dimmed">No appointments found</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Table highlightOnHover verticalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Executive</Table.Th>
          <Table.Th>Position</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Effective Date</Table.Th>
          <Table.Th>Status</Table.Th>
          {!showHistory && <Table.Th>Actions</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {appointments.map((appointment) => (
          <Table.Tr key={appointment.id}>
            <Table.Td>
              <Text fw={500}>
                {executiveNames[appointment.executive_id] || 'Unknown'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{appointment.position}</Text>
            </Table.Td>
            <Table.Td>
              <Badge variant="outline" size="sm">
                {getTypeLabel(appointment.appointment_type)}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {format(new Date(appointment.effective_date), 'MMM dd, yyyy')}
              </Text>
            </Table.Td>
            <Table.Td>
              {getStatusBadge(appointment.status)}
            </Table.Td>
            {!showHistory && (
              <Table.Td>
                <Group gap="xs">
                  <Button
                    size="xs"
                    leftSection={<IconCheck size={14} />}
                    color="green"
                    variant="light"
                    onClick={() => handleApprove(appointment.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<IconX size={14} />}
                    color="red"
                    variant="light"
                    onClick={() => handleReject(appointment.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<IconFileText size={14} />}
                    variant="subtle"
                  >
                    Letter
                  </Button>
                </Group>
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default AppointmentList;

