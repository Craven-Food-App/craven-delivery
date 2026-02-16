// @ts-nocheck
import React from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Progress,
  List,
  Badge,
  Group,
  RingProgress,
  Loader,
  Center,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IconStar, IconCheck, IconX } from '@tabler/icons-react';

export default function FeederScoreScreen() {
  const { data: { user } } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: score, isLoading } = useQuery({
    queryKey: ['feeder-score', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('driver_scores')
        .select('*')
        .eq('driver_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching score:', error);
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const getTier = (scoreValue: number) => {
    if (scoreValue >= 95) return { name: 'Ultimate', color: 'orange', icon: '👑' };
    if (scoreValue >= 90) return { name: 'Diamond', color: 'blue', icon: '💎' };
    if (scoreValue >= 80) return { name: 'Platinum', color: 'gray', icon: '⚪' };
    if (scoreValue >= 70) return { name: 'Gold', color: 'yellow', icon: '🥇' };
    return { name: 'Feeder', color: 'gray', icon: '🍽️' };
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  const tier = score ? getTier(score.overall_score || 0) : { name: 'N/A', color: 'gray' };

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>My Driver Score</Title>

      {/* Score Gauge */}
      <Card withBorder padding="lg">
        <Stack gap="md" align="center">
          <RingProgress
            size={200}
            thickness={16}
            sections={[
              {
                value: score?.overall_score || 0,
                color: tier.color,
              },
            ]}
            label={
              <Text size="3xl" fw={700} ta="center">
                {score?.overall_score || 0}
              </Text>
            }
          />
          <Badge size="lg" color={tier.color}>
            {tier.name} Tier
          </Badge>
        </Stack>
      </Card>

      {/* Score Breakdown */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Score Breakdown
        </Title>
        <Stack gap="md">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">On-Time Rate</Text>
              <Text fw={600}>{((score?.on_time_rate || 0) * 100).toFixed(1)}%</Text>
            </Group>
            <Progress value={(score?.on_time_rate || 0) * 100} size="sm" />
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Acceptance Rate</Text>
              <Text fw={600}>{((score?.acceptance_rate || 0) * 100).toFixed(1)}%</Text>
            </Group>
            <Progress value={(score?.acceptance_rate || 0) * 100} size="sm" />
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Completion Rate</Text>
              <Text fw={600}>{((score?.completion_rate || 0) * 100).toFixed(1)}%</Text>
            </Group>
            <Progress value={(score?.completion_rate || 0) * 100} size="sm" />
          </div>
        </Stack>
      </Card>

      {/* Tier Benefits */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Tier Benefits
        </Title>
        <List>
          {tier.name === 'Ultimate' && (
            <>
              <List.Item icon={<IconCheck size={16} color="orange" />}>
                Top dispatch priority (+30 weight)
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="orange" />}>
                Catering & premium retail first access
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="orange" />}>
                Dedicated support queue
              </List.Item>
            </>
          )}
          {tier.name === 'Diamond' && (
            <>
              <List.Item icon={<IconCheck size={16} color="blue" />}>
                Priority dispatch access (+18 weight)
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="blue" />}>
                High-value retail access
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="blue" />}>
                Large order eligibility
              </List.Item>
            </>
          )}
          {tier.name === 'Platinum' && (
            <>
              <List.Item icon={<IconCheck size={16} color="gray" />}>
                Access to premium merchants
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="gray" />}>
                Early scheduling unlock (+10 weight)
              </List.Item>
            </>
          )}
          {tier.name === 'Gold' && (
            <>
              <List.Item icon={<IconCheck size={16} color="#D4AF37" />}>
                Early access to standard orders
              </List.Item>
              <List.Item icon={<IconCheck size={16} color="#D4AF37" />}>
                +5 dispatch weight
              </List.Item>
            </>
          )}
          {tier.name === 'Feeder' && (
            <>
              <List.Item icon={<IconX size={16} color="red" />}>
                Standard orders only
              </List.Item>
              <List.Item icon={<IconX size={16} color="red" />}>
                No premium retail or catering
              </List.Item>
            </>
          )}
        </List>
      </Card>
    </Stack>
  );
}



