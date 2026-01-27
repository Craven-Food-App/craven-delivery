import React, { useState, useEffect } from 'react';
import { Stack, Group, Button, Title, Text, Tabs, Badge, Card, Grid, Loader } from '@mantine/core';
import { IconPlus, IconClock, IconCheck, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import AppointmentList from './AppointmentList';
import AppointmentWizard from './AppointmentWizard';

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

const AppointmentsTab: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeView, setActiveView] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // Load from executive_appointments table - check both old and new schema
      const { data, error } = await supabase
        .from('executive_appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading appointments:', error);
        setAppointments([]);
        return;
      }

      // Transform data to match our interface (handle both old and new schema)
      const transformed = (data || []).map((apt: any) => {
        // Check if it's old schema (has proposed_officer_name) or new schema (has executive_id)
        if (apt.proposed_officer_name) {
          // OLD SCHEMA - transform to new format
          return {
            id: apt.id,
            executive_id: apt.appointee_user_id || apt.proposed_officer_email || '', // Try to find exec_user by email
            position: apt.proposed_title || '',
            appointment_type: apt.appointment_type || 'initial',
            appointment_date: apt.created_at || new Date().toISOString(),
            effective_date: apt.effective_date || apt.created_at || new Date().toISOString(),
            appointed_by: apt.created_by || apt.secretary_approved_by || '',
            resolution_id: apt.board_resolution_id,
            status: mapOldStatusToNew(apt.status),
            notes: apt.notes || '',
          };
        } else {
          // NEW SCHEMA - use as is
          return {
            id: apt.id,
            executive_id: apt.executive_id,
            position: apt.position,
            appointment_type: apt.appointment_type,
            appointment_date: apt.appointment_date || apt.created_at,
            effective_date: apt.effective_date,
            appointed_by: apt.appointed_by,
            resolution_id: apt.resolution_id,
            status: apt.status,
            notes: apt.notes || '',
          };
        }
      });

      setAppointments(transformed);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Map old status values to new status values
  const mapOldStatusToNew = (oldStatus: string): 'pending' | 'approved' | 'active' | 'terminated' => {
    const statusMap: Record<string, 'pending' | 'approved' | 'active' | 'terminated'> = {
      'DRAFT': 'pending',
      'SENT_TO_BOARD': 'pending',
      'BOARD_ADOPTED': 'approved',
      'AWAITING_SIGNATURES': 'pending',
      'READY_FOR_SECRETARY_REVIEW': 'pending',
      'SECRETARY_APPROVED': 'approved',
      'ACTIVATING': 'pending',
      'ACTIVE': 'active',
      'APPROVED': 'approved',
      'REJECTED': 'terminated',
    };
    return statusMap[oldStatus.toUpperCase()] || 'pending';
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const activeAppointments = appointments.filter(a => a.status === 'active');
  const historyAppointments = appointments.filter(a => 
    a.status === 'approved' || a.status === 'terminated'
  );

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading appointments...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header with Stats */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Executive Appointments</Title>
          <Text c="dimmed">Manage executive positions and appointments</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setWizardOpen(true)}
        >
          New Appointment
        </Button>
      </Group>

      {/* Stats Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Pending Approval</Text>
              <Text size="2xl" fw={700} c="orange">
                {pendingAppointments.length}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Active Appointments</Text>
              <Text size="2xl" fw={700} c="green">
                {activeAppointments.length}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Total Appointments</Text>
              <Text size="2xl" fw={700}>
                {appointments.length}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs: Pending vs History */}
      <Tabs value={activeView} onChange={(v) => setActiveView(v as 'pending' | 'history')}>
        <Tabs.List>
          <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
            Pending Approvals ({pendingAppointments.length})
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconCheck size={16} />}>
            Appointment History ({historyAppointments.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" pt="xl">
          <AppointmentList
            appointments={pendingAppointments}
            onApprove={loadAppointments}
            onReject={loadAppointments}
          />
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="xl">
          <AppointmentList
            appointments={historyAppointments}
            showHistory={true}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Appointment Wizard Modal */}
      {wizardOpen && (
        <AppointmentWizard
          opened={wizardOpen}
          onClose={() => {
            setWizardOpen(false);
            loadAppointments();
          }}
        />
      )}
    </Stack>
  );
};

export default AppointmentsTab;

