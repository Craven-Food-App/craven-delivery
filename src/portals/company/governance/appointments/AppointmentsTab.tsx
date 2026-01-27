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
      // Try to load from executive_appointments table, fallback to existing table if needed
      const { data, error } = await supabase
        .from('executive_appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) {
        console.warn('executive_appointments table may not exist yet:', error);
        // Fallback: try appointments table or return empty
        setAppointments([]);
      } else {
        setAppointments(data || []);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
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

