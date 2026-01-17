import React from 'react';
import { Card, Group, Text, Badge, Button, Stack, Progress } from '@mantine/core';
import { CtoTrainingModuleWithProgress } from '@/types/cto-training';
import { IconClock, IconCheck, IconArrowRight } from '@tabler/icons-react';

interface TrainingModuleCardProps {
  module: CtoTrainingModuleWithProgress;
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
}

export const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  module,
  onStart,
  onContinue,
  onReview,
}) => {
  const progress = module.progress;
  const status = progress?.status || 'not_started';
  const progressPercent = module.completedLessonsCount && module.lessonsCount
    ? Math.round((module.completedLessonsCount / module.lessonsCount) * 100)
    : 0;

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge color="green" leftSection={<IconCheck size={14} />}>Completed</Badge>;
      case 'in_progress':
        return <Badge color="blue">In Progress</Badge>;
      default:
        return <Badge color="gray">Not Started</Badge>;
    }
  };

  const getActionButton = () => {
    switch (status) {
      case 'completed':
        return (
          <Button variant="light" onClick={onReview}>
            Review Module
          </Button>
        );
      case 'in_progress':
        return (
          <Button leftSection={<IconArrowRight size={16} />} onClick={onContinue}>
            Continue
          </Button>
        );
      default:
        return (
          <Button leftSection={<IconArrowRight size={16} />} onClick={onStart}>
            Start Module
          </Button>
        );
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {module.title}
              </Text>
              {getStatusBadge()}
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              {module.description}
            </Text>
            <Group gap="md">
              <Group gap={4}>
                <IconClock size={16} />
                <Text size="sm">{module.estimatedMinutes} min</Text>
              </Group>
              {module.lessonsCount !== undefined && (
                <Text size="sm" c="dimmed">
                  {module.completedLessonsCount || 0} / {module.lessonsCount} lessons
                </Text>
              )}
            </Group>
          </div>
          {getActionButton()}
        </Group>
        {status === 'in_progress' && progressPercent > 0 && (
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Progress</Text>
              <Text size="xs" c="dimmed">{progressPercent}%</Text>
            </Group>
            <Progress value={progressPercent} size="sm" />
          </div>
        )}
      </Stack>
    </Card>
  );
};



