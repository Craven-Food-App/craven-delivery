import React from 'react';
import { Card, Group, Stack, Text, Badge, Button } from '@mantine/core';
import { IconFileText, IconCheck, IconClock } from '@tabler/icons-react';
import { VersionBadge } from './VersionBadge';

interface DocumentCardProps {
  documentKey: string;
  title: string;
  category: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  onClick: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  category,
  isAcknowledged,
  acknowledgedAt,
  onClick,
}) => {
  return (
    <Card
      withBorder
      p="lg"
      style={{ cursor: 'pointer', height: '100%' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <IconFileText size={24} color="var(--mantine-color-blue-6)" />
            <div>
              <Text fw={600} size="lg">{title}</Text>
              <Text size="sm" c="dimmed">{category}</Text>
            </div>
          </Group>
          <VersionBadge version="1.0" />
        </Group>

        <Group justify="space-between" mt="auto">
          {isAcknowledged ? (
            <Badge
              color="green"
              leftSection={<IconCheck size={12} />}
              variant="light"
            >
              Acknowledged
            </Badge>
          ) : (
            <Badge
              color="orange"
              leftSection={<IconClock size={12} />}
              variant="light"
            >
              Pending
            </Badge>
          )}
          <Button variant="light" size="xs" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            View
          </Button>
        </Group>

        {acknowledgedAt && (
          <Text size="xs" c="dimmed">
            Signed: {new Date(acknowledgedAt).toLocaleDateString()}
          </Text>
        )}
      </Stack>
    </Card>
  );
};

