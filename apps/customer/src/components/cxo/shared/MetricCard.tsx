import React from 'react';
import { Card, Text, Group, ThemeIcon } from '@mantine/core';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
  color = 'blue',
}) => {
  const trendColor = trend && trend > 0 ? 'green' : trend && trend < 0 ? 'red' : 'gray';
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="sm" c="dimmed">
          {title}
        </Text>
        {icon && (
          <ThemeIcon color={color} variant="light" size="lg">
            {icon}
          </ThemeIcon>
        )}
      </Group>
      <Text fw={700} size="xl">
        {value}
      </Text>
      {trend !== undefined && trendLabel && (
        <Group gap={4} mt="xs">
          <TrendIcon size={16} color={trendColor} />
          <Text size="xs" c={trendColor}>
            {Math.abs(trend)}% {trendLabel}
          </Text>
        </Group>
      )}
    </Card>
  );
};

