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
import { IconCheck, IconX } from '@tabler/icons-react';
import { useFeederTier } from '@/hooks/useFeederTier';
import { TIER_BADGE_STYLES, type FeederTierName } from '@/utils/ratingHelpers';

const TIER_BENEFITS: Record<FeederTierName, { text: string; positive: boolean }[]> = {
  Feeder: [
    { text: 'Standard orders only', positive: false },
    { text: 'No premium retail or catering', positive: false },
  ],
  Gold: [
    { text: 'Early access to standard orders', positive: true },
    { text: '+5 dispatch weight', positive: true },
  ],
  Platinum: [
    { text: 'Access to premium merchants', positive: true },
    { text: 'Early scheduling unlock (+10 weight)', positive: true },
  ],
  Diamond: [
    { text: 'Priority dispatch access (+18 weight)', positive: true },
    { text: 'High-value retail access', positive: true },
    { text: 'Large order eligibility', positive: true },
  ],
  Ultimate: [
    { text: 'Top dispatch priority (+30 weight)', positive: true },
    { text: 'Catering & premium retail first access', positive: true },
    { text: 'Dedicated support queue', positive: true },
    { text: 'Beta feature access', positive: true },
    { text: 'Enhanced referral bonus', positive: true },
  ],
};

export default function FeederScoreScreen() {
  const { tier, tierConfig, metrics, nextTier, loading } = useFeederTier();

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  const rating = metrics.rolling_rating || metrics.rating;
  const deliveries = metrics.rolling_deliveries || metrics.total_deliveries;
  const styleKey = tier.toUpperCase() as keyof typeof TIER_BADGE_STYLES;
  const badgeStyle = TIER_BADGE_STYLES[styleKey] || TIER_BADGE_STYLES.FEEDER;

  // For the ring progress, map rating to percentage (out of 5)
  const ratingPct = (rating / 5) * 100;

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>My Feeder Score</Title>

      {/* Score Gauge */}
      <Card withBorder padding="lg">
        <Stack gap="md" align="center">
          <RingProgress
            size={200}
            thickness={16}
            sections={[{ value: ratingPct, color: tier === 'Ultimate' ? '#E8622A' : tier === 'Diamond' ? '#1E3A5F' : tier === 'Platinum' ? '#C0C0C0' : tier === 'Gold' ? '#D4AF37' : '#999999' }]}
            label={
              <Text size="3xl" fw={700} ta="center">
                {rating.toFixed(2)}
              </Text>
            }
          />
          <Badge
            size="lg"
            style={{
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `2px solid ${badgeStyle.border}`,
            }}
          >
            {tierConfig.icon} {tier} Feeder
          </Badge>
          <Text size="sm" c="dimmed">{deliveries} deliveries (rolling 60-day)</Text>
        </Stack>
      </Card>

      {/* Score Breakdown */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">Performance Metrics (60-Day Rolling)</Title>
        <Stack gap="md">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">On-Time Rate</Text>
              <Text fw={600}>{metrics.rolling_on_time_rate.toFixed(1)}%</Text>
            </Group>
            <Progress value={metrics.rolling_on_time_rate} size="sm" />
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Completion Rate</Text>
              <Text fw={600}>{metrics.rolling_completion_rate.toFixed(1)}%</Text>
            </Group>
            <Progress value={metrics.rolling_completion_rate} size="sm" />
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Cancellation Rate</Text>
              <Text fw={600} c={metrics.rolling_cancel_rate > 10 ? 'red' : undefined}>
                {metrics.rolling_cancel_rate.toFixed(1)}%
              </Text>
            </Group>
            <Progress value={metrics.rolling_cancel_rate} size="sm" color="red" />
          </div>
        </Stack>
      </Card>

      {/* Next Tier Progress */}
      {nextTier && (
        <Card withBorder padding="lg">
          <Title order={4} mb="md">Next Tier: {nextTier.name} Feeder</Title>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm">Deliveries: {nextTier.minDeliveries}+</Text>
              <Badge color={deliveries >= nextTier.minDeliveries ? 'green' : 'gray'}>
                {deliveries >= nextTier.minDeliveries ? '✓' : deliveries}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Rating: {nextTier.minRating}+</Text>
              <Badge color={rating >= nextTier.minRating ? 'green' : 'gray'}>
                {rating >= nextTier.minRating ? '✓' : rating.toFixed(2)}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Completion: {nextTier.minCompletionRate}%+</Text>
              <Badge color={metrics.rolling_completion_rate >= nextTier.minCompletionRate ? 'green' : 'gray'}>
                {metrics.rolling_completion_rate >= nextTier.minCompletionRate ? '✓' : `${metrics.rolling_completion_rate.toFixed(1)}%`}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">On-Time: {nextTier.minOnTimeRate}%+</Text>
              <Badge color={metrics.rolling_on_time_rate >= nextTier.minOnTimeRate ? 'green' : 'gray'}>
                {metrics.rolling_on_time_rate >= nextTier.minOnTimeRate ? '✓' : `${metrics.rolling_on_time_rate.toFixed(1)}%`}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Cancel Rate: {'<'}{nextTier.maxCancellationRate}%</Text>
              <Badge color={metrics.rolling_cancel_rate <= nextTier.maxCancellationRate ? 'green' : 'gray'}>
                {metrics.rolling_cancel_rate <= nextTier.maxCancellationRate ? '✓' : `${metrics.rolling_cancel_rate.toFixed(1)}%`}
              </Badge>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Tier Benefits */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">{tier} Feeder Benefits</Title>
        <List>
          {TIER_BENEFITS[tier].map((b, i) => (
            <List.Item
              key={i}
              icon={b.positive
                ? <IconCheck size={16} color={tier === 'Ultimate' ? '#E8622A' : '#10b981'} />
                : <IconX size={16} color="#ef4444" />
              }
            >
              {b.text}
            </List.Item>
          ))}
        </List>
      </Card>
    </Stack>
  );
}
