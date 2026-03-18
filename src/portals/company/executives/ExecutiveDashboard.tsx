import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Card, Grid, Badge, Group, Button, Paper, Loader, Center } from '@mantine/core';
import { IconUserCheck, IconFileText, IconUsers, IconPencil, IconChecklist, IconFolder, IconCoins, IconClock } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import MyAppointment from './MyAppointment';
import OfficerDirectoryInternal from './OfficerDirectoryInternal';
import MyDocuments from './MyDocuments';
import OnboardingPacket from './OnboardingPacket';
import DocumentVault from './DocumentVault';
import EquityDashboard from './EquityDashboard';
import VestingProgress from './VestingProgress';
import { Tabs } from '@mantine/core';

const ExecutiveDashboard: React.FC = () => {
  const [activeOfficers, setActiveOfficers] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [officersResult, execUsersResult] = await Promise.all([
        supabase
          .from('corporate_officers')
          .select('*', { count: 'exact', head: true })
          .in('status', ['ACTIVE', 'active', 'APPOINTED', 'appointed']),
        supabase
          .from('exec_users')
          .select('*', { count: 'exact', head: true })
          .in('officer_status', ['active', 'ACTIVE', 'appointed', 'APPOINTED']),
      ]);

      // exec_users is the authoritative source for active officers
      setActiveOfficers(execUsersResult.count || 0);
    } catch (error: any) {
      if (error.code !== '42P01') {
        console.error('Error fetching stats:', error);
      }
    } finally {
      setLoading(false);
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
      <Stack gap="xl">
        <div>
          <Title order={1} c="dark" mb="xs">
            Executive Dashboard
          </Title>
          <Text c="dimmed" size="lg">
            View your appointment details and corporate officer directory.
          </Text>
        </div>

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
              <Tabs.Tab value="documents" leftSection={<IconPencil size={16} />}>
                My Documents
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

            <Tabs.Panel value="documents" pt="md">
              <MyDocuments />
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
