import React, { useEffect, useState } from 'react';
import { Container, Grid, Card, Text, Title, Group, Badge, Stack, Loader, Center } from '@mantine/core';
import {
  IconUsers,
  IconFileText,
  IconUserCheck,
  IconClock,
  IconTrendingUp,
  IconAlertCircle,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  activeOfficers: number;
  pendingResolutions: number;
  draftAppointments: number;
  recentLogs: number;
}

const CompanyDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeOfficers: 0,
    pendingResolutions: 0,
    draftAppointments: 0,
    recentLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Calculate date once
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Run all queries in parallel for better performance
        const [officersResult, execUsersResult, resolutionsResult, appointmentsResult, logsResult] = await Promise.all([
          supabase
            .from('corporate_officers')
            .select('*', { count: 'exact', head: true })
            .in('status', ['ACTIVE', 'active', 'APPOINTED', 'appointed']),
          supabase
            .from('exec_users')
            .select('*', { count: 'exact', head: true })
            .in('officer_status', ['active', 'ACTIVE', 'appointed', 'APPOINTED']),
          supabase
            .from('governance_board_resolutions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING_VOTE'),
          supabase
            .from('executive_appointments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DRAFT'),
          supabase
            .from('governance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', sevenDaysAgo.toISOString()),
        ]);

        setStats({
          activeOfficers: Math.max(officersResult.count || 0, execUsersResult.count || 0),
          pendingResolutions: resolutionsResult.count || 0,
          draftAppointments: appointmentsResult.count || 0,
          recentLogs: logsResult.count || 0,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Set defaults on error so UI still renders
        setStats({
          activeOfficers: 0,
          pendingResolutions: 0,
          draftAppointments: 0,
          recentLogs: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  const statCards = [
    {
      title: 'Active Officers',
      value: stats.activeOfficers,
      icon: IconUserCheck,
      color: 'green',
      description: 'Currently serving corporate officers',
    },
    {
      title: 'Pending Resolutions',
      value: stats.pendingResolutions,
      icon: IconFileText,
      color: 'orange',
      description: 'Awaiting board vote',
    },
    {
      title: 'Draft Appointments',
      value: stats.draftAppointments,
      icon: IconUsers,
      color: 'blue',
      description: 'In preparation',
    },
    {
      title: 'Recent Activity',
      value: stats.recentLogs,
      icon: IconClock,
      color: 'violet',
      description: 'Last 7 days',
    },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} c="dark" mb="xs">
            Company Dashboard
          </Title>
          <Text c="dimmed" size="lg">
            Corporate governance and executive management overview
          </Text>
        </div>

        <Grid>
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Grid.Col key={stat.title} span={{ base: 12, sm: 6, md: 3 }}>
                <Card
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Icon size={32} stroke={1.5} style={{ color: `var(--mantine-color-${stat.color}-6)` }} />
                    <Badge color={stat.color} variant="light" size="lg">
                      {stat.value}
                    </Badge>
                  </Group>
                  <Text fw={600} size="lg" c="dark" mb={4}>
                    {stat.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {stat.description}
                  </Text>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>

        <Card
          padding="lg"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        >
          <Group gap="xs" mb="md">
            <IconAlertCircle size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
            <Title order={3} c="dark">
              Quick Actions
            </Title>
          </Group>
          <Text c="dimmed" size="sm">
            Use the navigation menu to access governance administration, board resolutions, executive management, and more.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};

export default CompanyDashboard;

