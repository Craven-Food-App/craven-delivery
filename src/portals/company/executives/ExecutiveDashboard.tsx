import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Card, Grid, Badge, Group, Button, Paper, Loader, Center } from '@mantine/core';
import { IconUserCheck, IconFileText, IconUsers, IconChecklist, IconFolder, IconCoins, IconClock, IconRefresh } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import MyAppointment from './MyAppointment';
import OfficerDirectoryInternal from './OfficerDirectoryInternal';

import OnboardingPacket from './OnboardingPacket';
import DocumentVault from './DocumentVault';
import EquityDashboard from './EquityDashboard';
import VestingProgress from './VestingProgress';
import ExecutiveGuidedTour from './ExecutiveGuidedTour';
import { Tabs } from '@mantine/core';
import { uuidLastFour } from '@/utils/executiveUuidDisplay';
import {
  fetchExecutiveDirectoryOfficers,
  officerMatchesActiveDirectoryFilter,
} from '@/utils/executiveDirectoryData';

const ExecutiveDashboard: React.FC = () => {
  const [activeOfficers, setActiveOfficers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [execUserId, setExecUserId] = useState<string | null>(null);
  const [execMetadata, setExecMetadata] = useState<Record<string, any> | null>(null);
  const [canRegenerate, setCanRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Same definition as Officer Directory default ("Active" filter): status includes "active"
      try {
        const directoryRows = await fetchExecutiveDirectoryOfficers();
        setActiveOfficers(directoryRows.filter(officerMatchesActiveDirectoryFilter).length);
      } catch {
        setActiveOfficers(0);
      }

      // Check guided tour status for current user
      if (user) {
        const { data: execUser } = await supabase
          .from('exec_users')
          .select('id, metadata, role, title')
          .eq('user_id', user.id)
          .maybeSingle();

        if (execUser) {
          setExecUserId(execUser.id);
          const meta = (execUser.metadata as Record<string, any>) || {};
          setExecMetadata(meta);
          if (!meta.guided_tour_completed) {
            setShowTour(true);
          }

          // Check regenerate permission: board member, CEO, or secretary
          const { data: boardMember } = await supabase
            .from('board_members')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          const execRole = (execUser.role || execUser.title || '').toLowerCase();
          const isCeoOrSecretary = execRole.includes('ceo') ||
            execRole.includes('chief executive') ||
            execRole.includes('secretary');

          setCanRegenerate((boardMember && boardMember.length > 0) || isCeoOrSecretary);

          // Get appointment ID for regeneration
          const { data: appts } = await supabase
            .from('executive_appointments')
            .select('id')
            .eq('executive_id', execUser.id)
            .not('status', 'in', '("terminated","rejected")')
            .order('created_at', { ascending: false })
            .limit(1);

          if (appts?.[0]) {
            setAppointmentId(appts[0].id);
          }
        }
      }
    } catch (error: any) {
      if (error.code !== '42P01') {
        console.error('Error fetching stats:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePacket = async () => {
    if (!appointmentId) {
      notifications.show({ title: 'Error', message: 'No active appointment found', color: 'red' });
      return;
    }
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('governance-backfill-appointment-documents', {
        body: { appointment_id: appointmentId, force_regenerate: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Reset document statuses for re-signing
      await supabase
        .from('executive_documents')
        .update({
          signature_status: 'pending',
          status: 'generated',
          signed_file_url: null,
          signed_at: null,
          signed_by_user: null,
          signer_roles: null,
        })
        .eq('appointment_id', appointmentId);

      // Generate fresh signature tokens
      await supabase.functions.invoke('generate-executive-signature-token', {
        body: { appointment_id: appointmentId },
      });

      notifications.show({
        title: 'Documents Regenerated',
        message: 'All onboarding documents have been regenerated with the latest templates.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Regeneration Failed',
        message: error.message || 'Failed to regenerate documents',
        color: 'red',
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <ExecutiveGuidedTour
        opened={showTour}
        onClose={() => setShowTour(false)}
        execUserId={execUserId}
        existingMetadata={execMetadata}
      />
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} c="dark" mb="xs">
              Executive Dashboard
            </Title>
            <Text c="dimmed" size="lg">
              View your appointment details and corporate officer directory.
            </Text>
            {execUserId && uuidLastFour(execUserId) ? (
              <Text size="xs" c="dimmed" mt="xs" style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace' }}>
                Executive record ID ·•••{uuidLastFour(execUserId)}
              </Text>
            ) : null}
          </div>
          {canRegenerate && (
            <Button
              variant="outline"
              color="orange"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRegeneratePacket}
              loading={regenerating}
            >
              Regenerate Onboarding Packet
            </Button>
          )}
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card
              padding="lg"
              radius="md"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            >
              <Group justify="space-between" mb="xs">
                <IconUserCheck size={32} stroke={1.5} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Badge color="green" variant="light" size="lg">
                  {activeOfficers}
                </Badge>
              </Group>
              <Text fw={600} size="lg" c="dark" mb={4}>
                Active Officers
              </Text>
              <Text size="sm" c="dimmed">
                Currently serving corporate officers
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        <Card
          padding="lg"
          radius="md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        >
          <Tabs defaultValue="my-appointment">
            <Tabs.List>
              <Tabs.Tab value="my-appointment" leftSection={<IconFileText size={16} />}>
                My Appointment
              </Tabs.Tab>
              <Tabs.Tab value="onboarding" leftSection={<IconChecklist size={16} />}>
                Onboarding Packet
              </Tabs.Tab>
              <Tabs.Tab value="vault" leftSection={<IconFolder size={16} />}>
                Document Vault
              </Tabs.Tab>
              <Tabs.Tab value="equity" leftSection={<IconCoins size={16} />}>
                Equity Dashboard
              </Tabs.Tab>
              <Tabs.Tab value="vesting" leftSection={<IconClock size={16} />}>
                Vesting Progress
              </Tabs.Tab>
              <Tabs.Tab value="directory" leftSection={<IconUsers size={16} />}>
                Officer Directory
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="my-appointment" pt="md">
              <MyAppointment />
            </Tabs.Panel>

            <Tabs.Panel value="onboarding" pt="md">
              <OnboardingPacket />
            </Tabs.Panel>


            <Tabs.Panel value="vault" pt="md">
              <DocumentVault />
            </Tabs.Panel>

            <Tabs.Panel value="equity" pt="md">
              <EquityDashboard />
            </Tabs.Panel>

            <Tabs.Panel value="vesting" pt="md">
              <VestingProgress />
            </Tabs.Panel>

            <Tabs.Panel value="directory" pt="md">
              <OfficerDirectoryInternal />
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
};

export default ExecutiveDashboard;
