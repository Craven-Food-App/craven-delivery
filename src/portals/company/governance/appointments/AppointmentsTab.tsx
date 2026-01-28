import React, { useState, useEffect } from 'react';
import { Stack, Group, Button, Title, Text, Tabs, Badge, Card, Grid, Box } from '@mantine/core';
import { IconPlus, IconClock, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
// Use the original AppointmentList component with full functionality
import AppointmentListOriginal from '../../governance-admin/AppointmentList';

interface ExecutiveAppointment {
  id: string;
  proposed_officer_name: string;
  proposed_officer_email?: string;
  proposed_title: string;
  status: string;
  effective_date: string;
  created_at: string;
}

/**
 * Appointments Tab - New UI with original functionality
 * Keeps the clean stats cards and tabs UI, but uses original AppointmentList component
 * which has all the document generation, workflow, and status management functionality
 */
const AppointmentsTab: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<ExecutiveAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // Use new schema: executive_id, position instead of proposed_officer_name, proposed_title
      const { data, error } = await supabase
        .from('executive_appointments')
        .select(`
          id,
          executive_id,
          position,
          status,
          effective_date,
          created_at,
          exec_users:executive_id (
            id,
            user_id,
            title
          ),
          user_profiles:exec_users.user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading appointments:', error);
        setAppointments([]);
        return;
      }

      // Transform to match interface (for stats only - AppointmentListOriginal handles its own data)
      const transformed = (data || []).map((apt: any) => ({
        id: apt.id,
        proposed_officer_name: apt.user_profiles?.full_name || apt.exec_users?.title || 'Unknown',
        proposed_officer_email: apt.user_profiles?.email || '',
        proposed_title: apt.position || apt.exec_users?.title || '',
        status: apt.status,
        effective_date: apt.effective_date,
        created_at: apt.created_at,
      }));

      setAppointments(transformed);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingAppointments = appointments.filter(a => 
    a.status === 'DRAFT' || 
    a.status === 'SENT_TO_BOARD' || 
    a.status === 'AWAITING_SIGNATURES' || 
    a.status === 'READY_FOR_SECRETARY_REVIEW'
  );
  const activeAppointments = appointments.filter(a => a.status === 'ACTIVE');

  return (
    <Stack gap="xl">
      {/* Header with Stats - New Clean UI */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Executive Appointments</Title>
          <Text c="dimmed">Manage executive positions and appointments</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate('/company/governance-admin/appointments/new')}
        >
          New Appointment
        </Button>
      </Group>

      {/* Stats Cards - New Clean UI */}
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

      {/* Original AppointmentList Component - Has all the functionality */}
      <AppointmentListOriginal />
    </Stack>
  );
};

export default AppointmentsTab;

