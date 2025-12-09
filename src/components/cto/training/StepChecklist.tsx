import React from 'react';
import { Stack, Checkbox, Group, Text, Card } from '@mantine/core';
import { CtoTrainingStep } from '@/types/cto-training';
import { IconCheck } from '@tabler/icons-react';

interface StepChecklistProps {
  steps: CtoTrainingStep[];
  completedStepIds: string[];
  onStepToggle: (stepId: string, completed: boolean) => void;
  readonly?: boolean;
}

export const StepChecklist: React.FC<StepChecklistProps> = ({
  steps,
  completedStepIds,
  onStepToggle,
  readonly = false,
}) => {
  const requiredSteps = steps.filter((s) => s.isRequired);
  const optionalSteps = steps.filter((s) => !s.isRequired);
  const completedRequired = requiredSteps.filter((s) => completedStepIds.includes(s.id)).length;
  const allRequiredCompleted = completedRequired === requiredSteps.length;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600}>Step Checklist</Text>
        {requiredSteps.length > 0 && (
          <Text size="sm" c="dimmed">
            {completedRequired} / {requiredSteps.length} required steps completed
          </Text>
        )}
      </Group>

      {requiredSteps.length > 0 && (
        <Card padding="md" withBorder>
          <Text size="sm" fw={500} mb="sm" c="dimmed">
            Required Steps
          </Text>
          <Stack gap="sm">
            {requiredSteps.map((step) => {
              const isCompleted = completedStepIds.includes(step.id);
              return (
                <Group key={step.id} align="flex-start" gap="sm">
                  <Checkbox
                    checked={isCompleted}
                    onChange={(e) => onStepToggle(step.id, e.currentTarget.checked)}
                    disabled={readonly}
                    size="md"
                  />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={isCompleted ? 400 : 500} td={isCompleted ? 'line-through' : 'none'} c={isCompleted ? 'dimmed' : undefined}>
                      {step.title}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {step.description}
                    </Text>
                    {step.relatedUiKey && (
                      <Text size="xs" c="blue" mt={4}>
                        UI Key: {step.relatedUiKey}
                      </Text>
                    )}
                  </div>
                </Group>
              );
            })}
          </Stack>
        </Card>
      )}

      {optionalSteps.length > 0 && (
        <Card padding="md" withBorder>
          <Text size="sm" fw={500} mb="sm" c="dimmed">
            Optional Steps
          </Text>
          <Stack gap="sm">
            {optionalSteps.map((step) => {
              const isCompleted = completedStepIds.includes(step.id);
              return (
                <Group key={step.id} align="flex-start" gap="sm">
                  <Checkbox
                    checked={isCompleted}
                    onChange={(e) => onStepToggle(step.id, e.currentTarget.checked)}
                    disabled={readonly}
                    size="md"
                  />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={isCompleted ? 400 : 500} td={isCompleted ? 'line-through' : 'none'} c={isCompleted ? 'dimmed' : undefined}>
                      {step.title}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {step.description}
                    </Text>
                  </div>
                </Group>
              );
            })}
          </Stack>
        </Card>
      )}

      {allRequiredCompleted && requiredSteps.length > 0 && (
        <Card padding="md" bg="green.0" withBorder>
          <Group gap="sm">
            <IconCheck size={20} color="green" />
            <Text size="sm" fw={500} c="green">
              All required steps completed! You can mark this lesson as complete.
            </Text>
          </Group>
        </Card>
      )}
    </Stack>
  );
};


