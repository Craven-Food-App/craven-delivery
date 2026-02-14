// @ts-nocheck
import React from 'react';
import { Card, Text, Group, Stack, Badge, Loader, Alert } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number; // percentage change
    direction: 'up' | 'down' | 'neutral';
    period: string; // e.g., "vs last week"
  };
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  chart?: React.ReactNode; // mini sparkline chart
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  loading?: boolean;
  error?: string;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  chart,
  format = 'number',
  loading = false,
  error,
  onClick,
}: KpiCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'duration':
        return typeof val === 'number' ? `${val.toFixed(1)}s` : val;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return <IconTrendingUp size={16} color="#10b981" />;
      case 'down':
        return <IconTrendingDown size={16} color="#ef4444" />;
      case 'neutral':
        return <IconMinus size={16} color="#6b7280" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'gray';
    switch (trend.direction) {
      case 'up':
        return 'green';
      case 'down':
        return 'red';
      case 'neutral':
        return 'gray';
    }
  };

  if (error) {
    return (
      <Card
        padding="md"
        radius="md"
        withBorder
        style={{
          cursor: onClick ? 'pointer' : 'default',
          height: '100%',
        }}
        onClick={onClick}
      >
        <Alert color="red" title="Error" size="sm">
          {error}
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      padding="md"
      radius="md"
      withBorder
      style={{
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        transition: 'all 150ms',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>
              {label}
            </Text>
            {loading ? (
              <Loader size="sm" />
            ) : (
              <Text size="xl" fw={700} c="dark">
                {formatValue(value)}
              </Text>
            )}
          </div>
          {Icon && (
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 95, 31, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} style={{ color: '#ff5f1f' }} />
            </div>
          )}
        </Group>

        {trend && !loading && (
          <Group gap={4} align="center">
            {getTrendIcon()}
            <Text size="xs" c={getTrendColor()}>
              {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
              {Math.abs(trend.value).toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              {trend.period}
            </Text>
          </Group>
        )}

        {chart && !loading && (
          <div style={{ marginTop: '8px', height: '40px' }}>{chart}</div>
        )}
      </Stack>
    </Card>
  );
}

