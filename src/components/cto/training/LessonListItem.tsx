import React from 'react';
import { Group, Text, Badge, Button, Card } from '@mantine/core';
import { CtoTrainingLesson } from '@/types/cto-training';
import { CtoTrainingProgress } from '@/types/cto-training';
import { IconClock, IconCheck, IconArrowRight } from '@tabler/icons-react';

interface LessonListItemProps {
  lesson: CtoTrainingLesson;
  progress?: CtoTrainingProgress;
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
}

export const LessonListItem: React.FC<LessonListItemProps> = ({
  lesson,
  progress,
  onStart,
  onContinue,
  onReview,
}) => {
  const status = progress?.status || 'not_started';

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge color="green" leftSection={<IconCheck size={12} />}>Completed</Badge>;
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
          <Button size="xs" variant="light" onClick={onReview}>
            Review
          </Button>
        );
      case 'in_progress':
        return (
          <Button size="xs" leftSection={<IconArrowRight size={14} />} onClick={onContinue}>
            Continue
          </Button>
        );
      default:
        return (
          <Button size="xs" leftSection={<IconArrowRight size={14} />} onClick={onStart}>
            Start
          </Button>
        );
    }
  };

  return (
    <Card padding="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <div style={{ flex: 1 }}>
          <Group gap="sm" mb="xs">
            <Text fw={500}>{lesson.title}</Text>
            {getStatusBadge()}
          </Group>
          {lesson.subtitle && (
            <Text size="sm" c="dimmed" mb="xs">
              {lesson.subtitle}
            </Text>
          )}
          <Group gap="md">
            <Group gap={4}>
              <IconClock size={14} />
              <Text size="xs" c="dimmed">
                {lesson.estimatedMinutes} min
              </Text>
            </Group>
            {lesson.associatedRoute && (
              <Text size="xs" c="blue">
                {lesson.associatedRoute}
              </Text>
            )}
          </Group>
        </div>
        {getActionButton()}
      </Group>
    </Card>
  );
};



