// @ts-nocheck
import React from 'react';
import { Stack, Timeline, Text, Badge, Card } from '@mantine/core';
import { CxoTrainingAudit } from '@/types/cxo-training';
import { IconCheck, IconArrowRight, IconFileText } from '@tabler/icons-react';

interface TrainingTimelineProps {
  auditLog: CxoTrainingAudit[];
}

export const TrainingTimeline: React.FC<TrainingTimelineProps> = ({ auditLog }) => {
  const getEventIcon = (eventType: CxoTrainingAudit['eventType']) => {
    switch (eventType) {
      case 'module_completed':
      case 'lesson_completed':
        return <IconCheck size={16} />;
      case 'module_started':
      case 'lesson_started':
        return <IconArrowRight size={16} />;
      default:
        return <IconFileText size={16} />;
    }
  };

  const getEventLabel = (eventType: CxoTrainingAudit['eventType']) => {
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

  const getEventColor = (eventType: CxoTrainingAudit['eventType']) => {
    switch (eventType) {
      case 'module_completed':
      case 'lesson_completed':
        return 'green';
      case 'module_started':
      case 'lesson_started':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (auditLog.length === 0) {
    return (
      <Card padding="lg" withBorder>
        <Text c="dimmed" ta="center">
          No training activity yet
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" withBorder>
      <Text fw={600} mb="md">
        Training Timeline
      </Text>
      <Timeline active={-1} bulletSize={24} lineWidth={2}>
        {auditLog.map((entry) => (
          <Timeline.Item
            key={entry.id}
            bullet={getEventIcon(entry.eventType)}
            title={
              <Group gap="sm">
                <Text size="sm" fw={500}>
                  {getEventLabel(entry.eventType)}
                </Text>
                <Badge size="xs" color={getEventColor(entry.eventType)}>
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
                {JSON.stringify(entry.metadata)}
              </Text>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
};

