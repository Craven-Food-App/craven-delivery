import React from 'react';
import { Modal, Stack, Text, Divider, Button } from '@mantine/core';
import type { FinalFeederEarnings } from '@/lib/feederCleanPaySummary';
import { formatCleanPayMoney } from '@/lib/feederCleanPaySummary';

export interface FeederEarningsReceiptModalProps {
  opened: boolean;
  onClose: () => void;
  earnings: FinalFeederEarnings;
  displayOrderId: string;
}

const ReceiptLine: React.FC<{ label: string; cents: number; bold?: boolean }> = ({
  label,
  cents,
  bold = false,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      fontWeight: bold ? 700 : 500,
      padding: '2px 0',
    }}
  >
    <span>{label}</span>
    <span>{formatCleanPayMoney(cents)}</span>
  </div>
);

export const FeederEarningsReceiptModal: React.FC<FeederEarningsReceiptModalProps> = ({
  opened,
  onClose,
  earnings,
  displayOrderId,
}) => {
  const completedLabel = earnings.deliveryCompletedAt
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(earnings.deliveryCompletedAt)
      )
    : '—';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      centered
      size="sm"
      padding="lg"
      styles={{ content: { maxWidth: 360 } }}
    >
      <Stack gap="xs" align="stretch" style={{ fontFamily: 'ui-monospace, monospace' }}>
        <Text ta="center" fw={800} size="lg" style={{ letterSpacing: '0.12em' }}>
          CRAVE&apos;N
        </Text>
        <Text ta="center" size="sm" fw={600} c="dimmed">
          Clean Pay Receipt
        </Text>
        <Divider my={4} />
        <Text size="xs">Order ID: {displayOrderId}</Text>
        <Text size="xs" mb="sm">
          Completed: {completedLabel}
        </Text>
        <ReceiptLine label="Delivery Pay" cents={earnings.deliveryPayCents} />
        <ReceiptLine label="Mileage Pay" cents={earnings.mileagePayCents} />
        <ReceiptLine label="Customer Tip" cents={earnings.customerTipCents} />
        <ReceiptLine label="Promo / Bonus" cents={earnings.promoBonusCents} />
        {earnings.adjustmentCents !== 0 ? (
          <ReceiptLine label="Adjustment" cents={earnings.adjustmentCents} />
        ) : null}
        <Divider my={6} />
        <ReceiptLine label="Total Earned" cents={earnings.finalPayoutCents} bold />
        <Divider my="sm" />
        <Text size="xs">Tip Status: {earnings.tipStatus}</Text>
        <Text size="xs">Payout Status: {earnings.payoutStatus}</Text>
        {earnings.cleanPayVerified ? (
          <Text size="xs" fw={600} c="teal">
            Clean Pay Verified
          </Text>
        ) : null}
        <Text size="xs" c="dimmed" mt="md" style={{ lineHeight: 1.4 }}>
          Your earnings were itemized from offer acceptance through delivery completion.
        </Text>
        <Button variant="light" fullWidth mt="md" onClick={onClose}>
          Close
        </Button>
      </Stack>
    </Modal>
  );
};

export default FeederEarningsReceiptModal;
