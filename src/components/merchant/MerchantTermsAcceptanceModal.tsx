import React, { useState } from 'react';
import { Modal, Stack, Text, Checkbox, Button, Anchor, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MERCHANT_TERMS_PATH } from '@/constants/merchantTerms';

type Props = {
  opened: boolean;
  onAccept: () => Promise<void>;
  /** When true, user can close without accepting (e.g. landing only). Portal uses false. */
  allowClose?: boolean;
  onClose?: () => void;
};

const MerchantTermsAcceptanceModal: React.FC<Props> = ({
  opened,
  onAccept,
  allowClose = false,
  onClose,
}) => {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setSubmitting(true);
    try {
      await onAccept();
      notifications.show({ title: 'Terms accepted', message: 'Thank you.', color: 'green' });
      setChecked(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save acceptance';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={allowClose && onClose ? onClose : () => {}}
      closeOnClickOutside={allowClose}
      closeOnEscape={allowClose}
      withCloseButton={allowClose}
      title="Merchant terms"
      centered
      size="md"
      overlayProps={{ opacity: 0.65, blur: 4 }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          We&apos;ve updated the Merchant Terms of Service. You&apos;ll need to accept the current version to continue
          receiving orders and using merchant tools.
        </Text>
        <Text size="sm">
          By continuing, you agree to Crave&apos;n&apos;s Merchant Terms, including fees and payouts, optional paid
          features, Drive On-Demand (when used), CX courier tools (when applicable), integrations, data use, refunds,
          chargebacks, and operational standards.
        </Text>
        <Checkbox
          label="I agree to the Merchant Terms of Service"
          checked={checked}
          onChange={(e) => setChecked(e.currentTarget.checked)}
        />
        <Anchor href={MERCHANT_TERMS_PATH} target="_blank" rel="noopener noreferrer" size="sm">
          View full terms (opens in new tab)
        </Anchor>
        <Group justify="flex-end" mt="xs">
          <Button color="orange" disabled={!checked} loading={submitting} onClick={() => void handleAccept()}>
            Accept & continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default MerchantTermsAcceptanceModal;
