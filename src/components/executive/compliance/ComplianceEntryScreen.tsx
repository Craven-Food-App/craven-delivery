// @ts-nocheck
import React from 'react';
import {
  Container, Title, Text, Stack, Card, Group, Badge, Button,
  Progress, ThemeIcon, SimpleGrid, Alert,
} from '@mantine/core';
import {
  IconReceipt, IconId, IconBuildingBank, IconSignature,
  IconCheck, IconArrowRight, IconShieldCheck,
} from '@tabler/icons-react';

interface ComplianceEntryScreenProps {
  taxComplete: boolean;
  eligibilityComplete: boolean;
  directDepositComplete: boolean;
  complianceStatus: string;
  onNavigate: (step: 'tax' | 'eligibility' | 'deposit' | 'review') => void;
}

const ComplianceEntryScreen: React.FC<ComplianceEntryScreenProps> = ({
  taxComplete,
  eligibilityComplete,
  directDepositComplete,
  complianceStatus,
  onNavigate,
}) => {
  const completedSteps = [taxComplete, eligibilityComplete, directDepositComplete].filter(Boolean).length;
  const totalSteps = 3;
  const allComplete = completedSteps === totalSteps;
  const progressPct = (completedSteps / totalSteps) * 100;

  const steps = [
    {
      key: 'tax' as const,
      label: 'Identity & Tax Setup',
      description: 'Federal and state tax withholding elections (W-4 equivalent)',
      icon: IconReceipt,
      complete: taxComplete,
      color: 'blue',
    },
    {
      key: 'eligibility' as const,
      label: 'Work Eligibility',
      description: 'Employment authorization and citizenship verification (I-9 equivalent)',
      icon: IconId,
      complete: eligibilityComplete,
      color: 'violet',
    },
    {
      key: 'deposit' as const,
      label: 'Direct Deposit',
      description: 'Secure banking details for payroll disbursement',
      icon: IconBuildingBank,
      complete: directDepositComplete,
      color: 'teal',
    },
  ];

  if (complianceStatus === 'submitted' || complianceStatus === 'review_pending') {
    return null; // Handled by CompliancePendingReview
  }

  return (
    <Stack gap="xl">
      <Alert icon={<IconShieldCheck size={20} />} color="green" variant="light" title="Executive Documents Complete">
        <Text size="sm">
          You've completed signing all required executive appointment documents.
          To activate payroll and finalize your onboarding, complete the steps below.
        </Text>
      </Alert>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Final Activation Progress</Text>
              <Text size="xl" fw={700}>{completedSteps} of {totalSteps} sections complete</Text>
            </div>
            <Badge color={allComplete ? 'green' : 'orange'} size="lg">
              {allComplete ? 'READY TO SIGN' : 'IN PROGRESS'}
            </Badge>
          </Group>
          <Progress value={progressPct} size="lg" color={allComplete ? 'green' : 'orange'} />
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {steps.map((step) => (
          <Card key={step.key} padding="lg" radius="md" withBorder
            style={{ borderColor: step.complete ? 'var(--mantine-color-green-4)' : undefined }}
          >
            <Stack gap="md">
              <Group justify="space-between">
                <ThemeIcon size="lg" radius="md" color={step.complete ? 'green' : step.color} variant="light">
                  {step.complete ? <IconCheck size={20} /> : <step.icon size={20} />}
                </ThemeIcon>
                <Badge color={step.complete ? 'green' : 'gray'} variant="light">
                  {step.complete ? 'Complete' : 'Pending'}
                </Badge>
              </Group>
              <div>
                <Text fw={600} size="md">{step.label}</Text>
                <Text size="sm" c="dimmed" mt={4}>{step.description}</Text>
              </div>
              <Button
                variant={step.complete ? 'light' : 'filled'}
                color={step.complete ? 'green' : step.color}
                rightSection={<IconArrowRight size={16} />}
                onClick={() => onNavigate(step.key)}
                fullWidth
              >
                {step.complete ? 'Review' : 'Start'}
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {allComplete && (
        <Card padding="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-green-4)' }}>
          <Group justify="space-between">
            <div>
              <Text fw={600} size="lg">All sections complete</Text>
              <Text size="sm" c="dimmed">Review and sign your compliance records to finalize activation.</Text>
            </div>
            <Button
              size="lg"
              color="green"
              leftSection={<IconSignature size={20} />}
              onClick={() => onNavigate('review')}
            >
              Review & Sign
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
};

export default ComplianceEntryScreen;