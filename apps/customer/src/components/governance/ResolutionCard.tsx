import React from 'react';
import { Card, Group, Text, Badge, Button, Stack } from '@mantine/core';
import { IconFileText, IconCheckbox, IconCheck, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface ResolutionCardProps {
  resolution: {
    id: string;
    resolution_number: string;
    title: string;
    description?: string;
    type: string;
    status: string;
    meeting_date?: string;
    effective_date?: string;
    votes?: {
      YES: number;
      NO: number;
      ABSTAIN: number;
    };
    total_board_members?: number;
    total_votes?: number;
  };
  onVote?: (resolutionId: string) => void;
  showVoteButton?: boolean;
}

export const ResolutionCard: React.FC<ResolutionCardProps> = ({
  resolution,
  onVote,
  showVoteButton = false,
}) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADOPTED':
      case 'EXECUTED':
        return 'green';
      case 'REJECTED':
        return 'red';
      case 'PENDING_VOTE':
        return 'yellow';
      case 'DRAFT':
        return 'gray';
      default:
        return 'blue';
    }
  };

  return (
    <Card padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <IconFileText size={18} />
              <Text fw={600} size="sm" c="dimmed">
                {resolution.resolution_number}
              </Text>
              <Badge color={getStatusColor(resolution.status)} size="sm">
                {resolution.status}
              </Badge>
            </Group>
            <Text fw={600} size="lg" mb="xs">
              {resolution.title}
            </Text>
            {resolution.description && (
              <Text size="sm" c="dimmed" lineClamp={2}>
                {resolution.description}
              </Text>
            )}
          </div>
        </Group>

        <Group gap="md">
          <Badge variant="light">{resolution.type}</Badge>
          {resolution.meeting_date && (
            <Text size="xs" c="dimmed">
              Meeting: {new Date(resolution.meeting_date).toLocaleDateString()}
            </Text>
          )}
        </Group>

        {resolution.votes && (
          <Group gap="xs">
            <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
              {resolution.votes.YES} Yes
            </Badge>
            <Badge color="red" variant="light" leftSection={<IconX size={12} />}>
              {resolution.votes.NO} No
            </Badge>
            <Text size="xs" c="dimmed">
              {resolution.total_votes || 0} / {resolution.total_board_members || 0} voted
            </Text>
          </Group>
        )}

        {showVoteButton && resolution.status === 'PENDING_VOTE' && onVote && (
          <Button
            size="sm"
            variant="light"
            leftSection={<IconCheckbox size={16} />}
            onClick={() => onVote(resolution.id)}
            fullWidth
          >
            Cast Vote
          </Button>
        )}
      </Stack>
    </Card>
  );
};

