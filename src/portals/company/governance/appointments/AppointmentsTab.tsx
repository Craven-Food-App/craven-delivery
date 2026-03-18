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
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading appointments:', error);
        setAppointments([]);
        return;
      }

      // Fetch user profiles separately for each executive
      const transformed = await Promise.all(
        (data || []).map(async (apt: any) => {
          let fullName = apt.exec_users?.title || 'Unknown';
          let email = '';

          if (apt.exec_users?.user_id) {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', apt.exec_users.user_id)
              .single();

            if (profileData) {
              fullName = profileData.full_name || fullName;
              email = profileData.email || '';
            }
          }

          return {
            id: apt.id,
            proposed_officer_name: fullName,
            proposed_officer_email: email,
            proposed_title: apt.position || apt.exec_users?.title || '',
            status: apt.status,
            effective_date: apt.effective_date,
            created_at: apt.created_at,
          };
        })
      );

      setAppointments(transformed);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingStatuses = new Set([
    'draft',
    'sent_to_board',
    'awaiting_signatures',
    'ready_for_secretary_review',
    'documents_generated',
    'documents_sent',
    'signing_in_progress',
    'partially_signed',
    'authorized_to_offer',
    'offer_accepted',
  ]);

  const pendingAppointments = appointments.filter((a) => pendingStatuses.has((a.status || '').toLowerCase()));
  const activeAppointments = appointments.filter((a) => ['active', 'fully_appointed_active'].includes((a.status || '').toLowerCase()));

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

