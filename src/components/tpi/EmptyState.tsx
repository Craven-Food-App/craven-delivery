import React from 'react';
import { Card, Stack, Text, Button, Group } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = IconInbox,
  title,
  description,
  action,
  illustration,
}: EmptyStateProps) {
  return (
    <Card
      padding="xl"
      radius="md"
      withBorder
      style={{
        textAlign: 'center',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <Stack gap="md" align="center">
        {illustration ? (
          illustration
        ) : (
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
            }}
          >
            <Icon size={32} style={{ color: '#9ca3af' }} />
          </div>
        )}

        <Stack gap="xs" align="center">
          <Text size="lg" fw={600} c="dark">
            {title}
          </Text>
          <Text size="sm" c="dimmed" style={{ maxWidth: '300px' }}>
            {description}
          </Text>
        </Stack>

        {action && (
          <Button
            onClick={action.onClick}
            color="orange"
            style={{ marginTop: '8px' }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

