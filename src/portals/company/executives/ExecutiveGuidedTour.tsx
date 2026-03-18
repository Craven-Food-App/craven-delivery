import React, { useState } from 'react';
import { Modal, Stepper, Button, Group, Text, Title, Stack, Checkbox } from '@mantine/core';
import { IconRocket, IconFileText, IconChecklist, IconFolder, IconCoins } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface ExecutiveGuidedTourProps {
  opened: boolean;
  onClose: () => void;
  execUserId: string | null;
  existingMetadata: Record<string, any> | null;
}

const steps = [
  {
    icon: <IconRocket size={28} />,
    label: 'Welcome',
    title: 'Welcome to Your Executive Dashboard',
    description:
      'This is your central hub for managing your corporate appointment, documents, equity, and more. Let\'s walk through the key sections so you know where everything is.',
  },
  {
    icon: <IconFileText size={28} />,
    label: 'My Appointment',
    title: 'My Appointment',
    description:
      'View your official appointment details including your role titles, effective date, appointment status, and the authority that appointed you. This is your official corporate record.',
  },
  {
    icon: <IconChecklist size={28} />,
    label: 'Onboarding Packet',
    title: 'Onboarding Packet',
    description:
      'Your onboarding packet contains all the documents you need to review and sign as part of your appointment — offer letters, NDAs, conflict-of-interest disclosures, and more.',
  },
  {
    icon: <IconFolder size={28} />,
    label: 'Documents & Vault',
    title: 'Documents & Vault',
    description:
      'My Documents shows documents assigned to you. The Document Vault is a secure repository for all your corporate governance documents — bylaws, resolutions, certificates, and policies.',
  },
  {
    icon: <IconCoins size={28} />,
    label: 'Equity & Vesting',
    title: 'Equity & Vesting',
    description:
      'Track your equity grants, stock options, and vesting schedule. See how much has vested, upcoming milestones, and the overall value of your equity compensation.',
  },
];

const ExecutiveGuidedTour: React.FC<ExecutiveGuidedTourProps> = ({
  opened,
  onClose,
  execUserId,
  existingMetadata,
}) => {
  const [active, setActive] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  const persistDismissal = async () => {
    if (!execUserId) return;
    try {
      await supabase
        .from('exec_users')
        .update({
          metadata: { ...(existingMetadata || {}), guided_tour_completed: true },
        } as any)
        .eq('id', execUserId);
    } catch (err) {
      console.error('Failed to persist tour dismissal:', err);
    }
  };

  const handleFinish = async () => {
    await persistDismissal();
    onClose();
  };

  const handleDontShowAndClose = async () => {
    await persistDismissal();
    onClose();
  };

  const isLast = active === steps.length - 1;

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      size="lg"
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      radius="md"
    >
      <Stack gap="lg" py="sm">
        <Stepper
          active={active}
          onStepClick={setActive}
          size="sm"
          color="orange"
          allowNextStepsSelect={false}
        >
          {steps.map((step, i) => (
            <Stepper.Step key={i} icon={step.icon} label={step.label} />
          ))}
        </Stepper>

        <Stack gap="md" px="md" py="lg" style={{ minHeight: 160 }}>
          <Title order={3} c="dark">
            {steps[active].title}
          </Title>
          <Text size="md" c="dimmed" style={{ lineHeight: 1.6 }}>
            {steps[active].description}
          </Text>
        </Stack>

        <Group justify="space-between" px="md">
          <Checkbox
            label="Don't show me this again"
            checked={dontShow}
            onChange={(e) => setDontShow(e.currentTarget.checked)}
            size="sm"
            color="orange"
          />
          <Group gap="sm">
            {active > 0 && (
              <Button variant="default" onClick={() => setActive(active - 1)}>
                Back
              </Button>
            )}
            {dontShow ? (
              <Button color="orange" onClick={handleDontShowAndClose}>
                Close
              </Button>
            ) : isLast ? (
              <Button color="orange" onClick={handleFinish}>
                Finish Tour
              </Button>
            ) : (
              <Button color="orange" onClick={() => setActive(active + 1)}>
                Next
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ExecutiveGuidedTour;
