import React from 'react';
import { Card, Stack, Group, Text, Progress, Grid } from '@mantine/core';
import { TrainingProgressSummary } from '@/types/cxo-training';
import { IconCheck, IconClock, IconBook } from '@tabler/icons-react';

interface ProgressSummaryProps {
  summary: TrainingProgressSummary;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({ summary }) => {
  const moduleProgress = summary.totalModules > 0
    ? Math.round((summary.completedModules / summary.totalModules) * 100)
    : 0;

  const lessonProgress = summary.totalLessons > 0
    ? Math.round((summary.completedLessons / summary.totalLessons) * 100)
    : 0;

  return (
    <Stack gap="lg">
      <Card padding="lg" withBorder>
        <Stack gap="md">
          <Text fw={600} size="lg">
            Overall Progress
          </Text>
          <Progress value={summary.overallProgress} size="xl" />
          <Text size="sm" c="dimmed" ta="center">
            {summary.overallProgress}% Complete
          </Text>
        </Stack>
      </Card>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card padding="md" withBorder>
            <Stack gap="sm">
              <Group gap="sm">
                <IconBook size={20} />
                <Text fw={600}>Modules</Text>
              </Group>
              <Text size="xl" fw={700}>
                {summary.completedModules} / {summary.totalModules}
              </Text>
              <Progress value={moduleProgress} size="sm" />
              <Text size="xs" c="dimmed">
                {moduleProgress}% complete
              </Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card padding="md" withBorder>
            <Stack gap="sm">
              <Group gap="sm">
                <IconCheck size={20} />
                <Text fw={600}>Lessons</Text>
              </Group>
              <Text size="xl" fw={700}>
                {summary.completedLessons} / {summary.totalLessons}
              </Text>
              <Progress value={lessonProgress} size="sm" />
              <Text size="xs" c="dimmed">
                {lessonProgress}% complete
              </Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card padding="md" withBorder>
            <Stack gap="sm">
              <Group gap="sm">
                <IconClock size={20} />
                <Text fw={600}>Time</Text>
              </Group>
              <Text size="xl" fw={700}>
                {summary.completedEstimatedMinutes} / {summary.totalEstimatedMinutes} min
              </Text>
              <Text size="xs" c="dimmed">
                Estimated time completed
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

