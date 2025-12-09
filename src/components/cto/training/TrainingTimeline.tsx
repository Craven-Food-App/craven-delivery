import React from 'react';
import { Stack, Text, Timeline, Card, Group, Badge } from '@mantine/core';
import { CtoTrainingAudit } from '@/types/cto-training';
import { IconCheck, IconPlayerPlay, IconBook, IconFileText } from '@tabler/icons-react';

interface TrainingTimelineProps {
  auditLog: CtoTrainingAudit[];
}

export const TrainingTimeline: React.FC<TrainingTimelineProps> = ({ auditLog }) => {
  const getEventIcon = (eventType: CtoTrainingAudit['eventType']) => {
    switch (eventType) {
      case 'module_started':
      case 'lesson_started':
        return <IconPlayerPlay size={16} />;
      case 'module_completed':
      case 'lesson_completed':
        return <IconCheck size={16} />;
      case 'quiz_submitted':
        return <IconFileText size={16} />;
      case 'step_completed':
        return <IconBook size={16} />;
      default:
        return <IconBook size={16} />;
    }
  };

  const getEventLabel = (eventType: CtoTrainingAudit['eventType']) => {
    switch (eventType) {
      case 'module_started':
        return 'Module Started';
      case 'module_completed':
        return 'Module Completed';
      case 'lesson_started':
        return 'Lesson Started';
      case 'lesson_completed':
        return 'Lesson Completed';
      case 'quiz_submitted':
        return 'Quiz Submitted';
      case 'step_completed':
        return 'Step Completed';
      default:
        return eventType;
    }
  };

  const getEventColor = (eventType: CtoTrainingAudit['eventType']) => {
    switch (eventType) {
      case 'module_completed':
      case 'lesson_completed':
        return 'green';
      case 'quiz_submitted':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (auditLog.length === 0) {
    return (
      <Card padding="lg" withBorder>
        <Text c="dimmed" ta="center">
          No training activity yet. Start a module to see your progress timeline.
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" withBorder>
      <Text fw={600} size="lg" mb="md">
        Training Activity Timeline
      </Text>
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {auditLog.map((entry) => (
          <Timeline.Item
            key={entry.id}
            bullet={getEventIcon(entry.eventType)}
            title={
              <Group gap="sm">
                <Text fw={500} size="sm">
                  {getEventLabel(entry.eventType)}
                </Text>
                <Badge size="sm" color={getEventColor(entry.eventType)}>
                  {entry.eventType}
                </Badge>
              </Group>
            }
          >
            <Text size="xs" c="dimmed" mt={4}>
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <Text size="xs" c="dimmed" mt={4}>
                {entry.metadata.score !== undefined && `Score: ${entry.metadata.score}%`}
                {entry.metadata.stepId && `Step ID: ${entry.metadata.stepId}`}
              </Text>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
};


