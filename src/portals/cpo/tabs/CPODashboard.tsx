import React, { useEffect, useState } from 'react';
import {
  SimpleGrid,
  Card,
  Title,
  Text,
  Group,
  RingProgress,
  Stack,
  Badge,
  Timeline,
  ThemeIcon,
  Skeleton,
} from '@mantine/core';
import {
  IconHeartHandshake,
  IconTrendingUp,
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconFileText,
  IconUserPlus,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalPartners: number;
  activePartners: number;
  pipeline: number;
  expiringContracts: number;
  totalDealValue: number;
  avgHealthScore: number;
}

const CPODashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Fetch partnerships
      const { data: partnerships } = await supabase
        .from('partnerships')
        .select('*');

      const all = partnerships || [];
      const active = all.filter(p => p.status === 'active');
      const pipeline = all.filter(p => ['lead', 'prospect', 'negotiation', 'contract_review'].includes(p.status));
      
      // Contracts expiring in next 30 days
      const thirtyDaysOut = new Date();
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
      const expiring = all.filter(p => 
        p.contract_end_date && new Date(p.contract_end_date) <= thirtyDaysOut && p.status === 'active'
      );

      const totalDealValue = all.reduce((sum, p) => sum + (Number(p.deal_value) || 0), 0);
      const healthScores = all.filter(p => p.health_score != null).map(p => p.health_score!);
      const avgHealth = healthScores.length > 0 
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) 
        : 0;

      setStats({
        totalPartners: all.length,
        activePartners: active.length,
        pipeline: pipeline.length,
        expiringContracts: expiring.length,
        totalDealValue,
        avgHealthScore: avgHealth,
      });

      // Recent activities
      const { data: activities } = await supabase
        .from('partnership_activities')
        .select('*, partnerships(partner_name)')
        .order('performed_at', { ascending: false })
        .limit(8);

      setRecentActivity(activities || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} radius="md" />)}
        </SimpleGrid>
        <Skeleton height={300} radius="md" />
      </Stack>
    );
  }

  const s = stats!;

  return (
    <Stack gap="lg">
      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Partners</Text>
              <Title order={2}>{s.totalPartners}</Title>
            </div>
            <ThemeIcon size={48} radius="md" color="orange" variant="light">
              <IconHandshake size={28} />
            </ThemeIcon>
          </Group>
          <Text size="sm" c="dimmed" mt="sm">
            {s.activePartners} active
          </Text>
        </Card>

        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Pipeline</Text>
              <Title order={2}>{s.pipeline}</Title>
            </div>
            <ThemeIcon size={48} radius="md" color="blue" variant="light">
              <IconTrendingUp size={28} />
            </ThemeIcon>
          </Group>
          <Text size="sm" c="dimmed" mt="sm">
            Leads through contract review
          </Text>
        </Card>

        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Deal Value</Text>
              <Title order={2}>${(s.totalDealValue / 1000).toFixed(0)}K</Title>
            </div>
            <ThemeIcon size={48} radius="md" color="green" variant="light">
              <IconTrendingUp size={28} />
            </ThemeIcon>
          </Group>
          <Text size="sm" c="dimmed" mt="sm">
            Total partnership value
          </Text>
        </Card>

        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Expiring Soon</Text>
              <Title order={2} c={s.expiringContracts > 0 ? 'red' : undefined}>
                {s.expiringContracts}
              </Title>
            </div>
            <ThemeIcon size={48} radius="md" color={s.expiringContracts > 0 ? 'red' : 'gray'} variant="light">
              <IconAlertTriangle size={28} />
            </ThemeIcon>
          </Group>
          <Text size="sm" c="dimmed" mt="sm">
            Contracts expiring in 30 days
          </Text>
        </Card>
      </SimpleGrid>

      {/* Health Score + Recent Activity */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Title order={4} mb="md">Partner Health Score</Title>
          <Group justify="center">
            <RingProgress
              size={180}
              thickness={16}
              roundCaps
              sections={[{ value: s.avgHealthScore, color: s.avgHealthScore >= 70 ? 'green' : s.avgHealthScore >= 40 ? 'yellow' : 'red' }]}
              label={
                <Text ta="center" fw={700} size="xl">
                  {s.avgHealthScore}%
                </Text>
              }
            />
          </Group>
          <Text ta="center" c="dimmed" size="sm" mt="md">
            Average across all active partnerships
          </Text>
        </Card>

        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Title order={4} mb="md">Recent Activity</Title>
          {recentActivity.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No recent activity</Text>
          ) : (
            <Timeline active={-1} bulletSize={28} lineWidth={2}>
              {recentActivity.slice(0, 5).map((act) => (
                <Timeline.Item
                  key={act.id}
                  bullet={
                    act.activity_type === 'contract_signed' ? <IconCheck size={14} /> :
                    act.activity_type === 'meeting' ? <IconClock size={14} /> :
                    act.activity_type === 'onboarding' ? <IconUserPlus size={14} /> :
                    <IconFileText size={14} />
                  }
                  title={act.title}
                >
                  <Text size="xs" c="dimmed">
                    {act.partnerships?.partner_name} · {new Date(act.performed_at).toLocaleDateString()}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
};

export default CPODashboard;
