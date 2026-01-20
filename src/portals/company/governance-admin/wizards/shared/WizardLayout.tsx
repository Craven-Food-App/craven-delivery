import React from 'react';
import {
  Paper,
  Stack,
  Group,
  Button,
  Stepper,
  Box,
  Title,
  Text,
  Progress,
  Alert,
  Card,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

export interface WizardStep {
  label: string;
  description: string;
  component: React.ReactNode;
  validate?: () => boolean | Promise<boolean>;
  optional?: boolean;
  icon?: React.ReactNode;
}

interface WizardLayoutProps {
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  activeStep: number;
  completedSteps: number[];
  onStepChange: (step: number) => void;
  onNext: () => void | Promise<void>;
  onBack: () => void;
  onComplete?: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  showProgress?: boolean;
  allowSkip?: boolean;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  title,
  subtitle,
  steps,
  activeStep,
  completedSteps,
  onStepChange,
  onNext,
  onBack,
  onComplete,
  loading = false,
  error,
  showProgress = true,
  allowSkip = false,
}) => {
  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <Paper
      p="xl"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        minHeight: '600px',
      }}
    >
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={2} mb={4} style={{ letterSpacing: '0.3px' }}>
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" size="sm" mb="md">
              {subtitle}
            </Text>
          )}
          {showProgress && (
            <>
              <Progress value={progress} size="lg" radius="xl" color="orange" mb="xs" />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Step {activeStep + 1} of {steps.length}
                </Text>
                <Text size="sm" fw={500} c="orange">
                  {Math.round(progress)}% Complete
                </Text>
              </Group>
            </>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {/* Stepper */}
        <Card padding="lg" radius="md" withBorder>
          <Stepper
            active={activeStep}
            onStepClick={onStepChange}
            breakpoint="sm"
            allowNextStepsSelect={false}
          >
            {steps.map((step, index) => (
              <Stepper.Step
                key={index}
                label={step.label}
                description={step.description}
                icon={
                  completedSteps.includes(index) ? (
                    <IconCheck size={18} />
                  ) : (
                    step.icon
                  )
                }
                allowStepSelect={completedSteps.includes(index) || index <= activeStep}
              >
                <Box mt="xl" mb="xl">
                  {step.component}
                </Box>
              </Stepper.Step>
            ))}
          </Stepper>
        </Card>

        {/* Navigation */}
        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
            disabled={activeStep === 0 || loading}
          >
            Back
          </Button>
          <Group gap="xs">
            {allowSkip && !isLastStep && (
              <Button
                variant="light"
                onClick={onNext}
                disabled={loading}
              >
                Skip Step
              </Button>
            )}
            <Button
              rightSection={!isLastStep ? <IconArrowRight size={16} /> : undefined}
              onClick={isLastStep ? onComplete : onNext}
              loading={loading}
              disabled={loading}
              size="md"
            >
              {isLastStep ? 'Complete' : 'Next'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
};















































