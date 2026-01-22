import { Modal, Stack, Text, Title, Button, Alert } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

interface RewardIssuanceModalProps {
  opened: boolean;
  onClose: () => void;
  rewardAmount: number;
}

export const RewardIssuanceModal: React.FC<RewardIssuanceModalProps> = ({
  opened,
  onClose,
  rewardAmount,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Reward Issued!"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<IconCheck size={16} />} color="green">
          <Text size="sm" fw={600} mb="xs">Your reward has been issued!</Text>
          <Text size="sm">
            Your reward of <strong>${(rewardAmount / 100).toFixed(2)}</strong> has been issued as <strong>Crave'n Credits</strong> inside the app.
          </Text>
        </Alert>
        <Text size="sm" c="dimmed">
          You can now use these credits when placing orders. Credits apply to Crave'n platform fees.
        </Text>
        <Button onClick={onClose} fullWidth size="lg" style={{ backgroundColor: '#ff5f1f' }}>
          Got it
        </Button>
      </Stack>
    </Modal>
  );
};

