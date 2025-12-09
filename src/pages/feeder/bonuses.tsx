import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Tabs,
  Badge,
  Progress,
  Group,
  Loader,
  Center,
  NumberFormatter,
  List,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IconTrophy, IconCheck, IconClock } from '@tabler/icons-react';

export default function FeederBonusesScreen() {
  const [activeTab, setActiveTab] = useState<string>('pending');

  const { data: { user } } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['feeder-bonuses', activeTab, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('driver_bonuses')
        .select('*')
        .eq('driver_id', user.id)
        .order('bonus_date', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'completed') {
        query = query.in('status', ['approved', 'paid']);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching bonuses:', error);
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate streak progress (example)
  const streakProgress = 75; // This would come from driver stats

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>My Bonuses</Title>

      {/* Streak Progress Card */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Current Streak</Text>
              <Text size="xl" fw={700}>
                7 days
              </Text>
            </div>
            <IconTrophy size={32} color="orange" />
          </Group>
          <Progress value={streakProgress} size="lg" color="orange" />
          <Text size="xs" c="dimmed">
            {streakProgress}% to next milestone bonus
          </Text>
        </Stack>
      </Card>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'pending')}>
        <Tabs.List>
          <Tabs.Tab value="pending">Pending</Tabs.Tab>
          <Tabs.Tab value="completed">Completed</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" pt="md">
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Pending Bonuses
            </Title>
            {bonuses && bonuses.length > 0 ? (
              <List>
                {bonuses.map((bonus: any) => (
                  <List.Item
                    key={bonus.id}
                    icon={<IconClock size={16} color="orange" />}
                    style={{ marginBottom: '1rem' }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>{bonus.bonus_type}</Text>
                        <Text size="sm" c="dimmed">
                          {bonus.description || 'No description'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {new Date(bonus.bonus_date).toLocaleDateString()}
                        </Text>
                      </div>
                      <Badge color="orange">
                        <NumberFormatter
                          value={(bonus.amount_cents || 0) / 100}
                          prefix="$"
                          decimalScale={2}
                        />
                      </Badge>
                    </Group>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No pending bonuses
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="completed" pt="md">
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Completed Bonuses
            </Title>
            {bonuses && bonuses.length > 0 ? (
              <List>
                {bonuses.map((bonus: any) => (
                  <List.Item
                    key={bonus.id}
                    icon={<IconCheck size={16} color="green" />}
                    style={{ marginBottom: '1rem' }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>{bonus.bonus_type}</Text>
                        <Text size="sm" c="dimmed">
                          {bonus.description || 'No description'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          Paid on {new Date(bonus.bonus_date).toLocaleDateString()}
                        </Text>
                      </div>
                      <Badge color="green">
                        <NumberFormatter
                          value={(bonus.amount_cents || 0) / 100}
                          prefix="$"
                          decimalScale={2}
                        />
                      </Badge>
                    </Group>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No completed bonuses
              </Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}


