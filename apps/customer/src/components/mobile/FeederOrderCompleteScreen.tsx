import React, { useState } from 'react';
import { Box, Stack, Text, Title, Button, Card, Group, Badge, Divider } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { FinalFeederEarnings } from '@/lib/feederCleanPaySummary';
import { formatCleanPayMoney } from '@/lib/feederCleanPaySummary';
import FeederEarningsReceiptModal from '@/components/mobile/FeederEarningsReceiptModal';
import FeederCompletedOrderDetailsModal, {
  type CompletedOrderDetailsInput,
} from '@/components/mobile/FeederCompletedOrderDetailsModal';
import feederAppIcon from '@/assets/feeder_app_icon.png';

export interface FeederOrderCompleteScreenProps {
  earnings: FinalFeederEarnings;
  displayOrderId: string;
  orderDetails: CompletedOrderDetailsInput;
  onContinue: () => void;
}

const SummaryRow: React.FC<{ label: string; cents: number; emphasize?: boolean }> = ({
  label,
  cents,
  emphasize = false,
}) => (
  <Group justify="space-between" wrap="nowrap">
    <Text size="sm" c={emphasize ? 'dark' : 'dimmed'} fw={emphasize ? 700 : 400}>
      {label}
    </Text>
    <Text size="sm" fw={emphasize ? 700 : 600}>
      {formatCleanPayMoney(cents)}
    </Text>
  </Group>
);

export const FeederOrderCompleteScreen: React.FC<FeederOrderCompleteScreenProps> = ({
  earnings,
  displayOrderId,
  orderDetails,
  onContinue,
}) => {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const totalEarned = earnings.finalPayoutCents;

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: '#ffffff',
          overflowY: 'auto',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Stack
          align="center"
          justify="flex-start"
          p="md"
          gap="md"
          maw={420}
          mx="auto"
          style={{
            minHeight: '100vh',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          <Box style={{ position: 'relative', width: 72, height: 72 }}>
            <img src={feederAppIcon} alt="Feeder" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            <Box
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
              }}
            >
              <IconCheck size={16} color="white" strokeWidth={3} />
            </Box>
          </Box>

          <Title order={2} fw={700} c="dark" ta="center">
            Order Complete
          </Title>

          <Box ta="center" w="100%">
            <Text size="xs" fw={500} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Total Earned
            </Text>
            <Text
              fw={800}
              c="#22c55e"
              style={{
                fontSize: 52,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {formatCleanPayMoney(totalEarned)}
            </Text>
          </Box>

          <Card withBorder w="100%" radius="md" p="md" bg="#F9FAFB">
            <Text fw={700} size="sm" mb="sm">
              Earnings Summary
            </Text>
            <Stack gap={6}>
              <SummaryRow label="Delivery Pay" cents={earnings.deliveryPayCents} />
              <SummaryRow label="Mileage Pay" cents={earnings.mileagePayCents} />
              <SummaryRow label="Customer Tip" cents={earnings.customerTipCents} />
              <SummaryRow label="Promo or Bonus" cents={earnings.promoBonusCents} />
              <SummaryRow label="Adjustment" cents={earnings.adjustmentCents} />
              <Divider my={4} />
              <SummaryRow label="Total Earned" cents={totalEarned} emphasize />
            </Stack>
            {earnings.originalAcceptedOfferCents != null &&
            earnings.originalAcceptedOfferCents > 0 &&
            earnings.originalAcceptedOfferCents !== totalEarned ? (
              <Text size="xs" c="dimmed" mt="sm">
                Original Accepted Offer: {formatCleanPayMoney(earnings.originalAcceptedOfferCents)}
              </Text>
            ) : null}
            {earnings.adjustmentReason ? (
              <Text size="xs" c="dimmed" mt={4}>
                {earnings.adjustmentReason}
              </Text>
            ) : null}
          </Card>

          <Card withBorder w="100%" radius="md" p="md">
            <Stack gap={6}>
              {earnings.cleanPayVerified ? (
                <Badge color="teal" variant="light" w="fit-content">
                  Clean Pay Verified
                </Badge>
              ) : null}
              <Text size="sm">
                <Text span c="dimmed">
                  Tip Status:{' '}
                </Text>
                {earnings.tipStatus}
              </Text>
              <Text size="sm">
                <Text span c="dimmed">
                  Payout Status:{' '}
                </Text>
                {earnings.payoutStatus}
              </Text>
              <Text size="xs" c="dimmed">
                Offer Accepted:{' '}
                {earnings.offerAcceptedAt
                  ? new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(earnings.offerAcceptedAt))
                  : '—'}
              </Text>
              <Text size="xs" c="dimmed">
                Pickup Confirmed:{' '}
                {earnings.pickupConfirmedAt
                  ? new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(earnings.pickupConfirmedAt))
                  : '—'}
              </Text>
              <Text size="xs" c="dimmed">
                Delivery Completed:{' '}
                {earnings.deliveryCompletedAt
                  ? new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(earnings.deliveryCompletedAt))
                  : '—'}
              </Text>
            </Stack>
          </Card>

          <Stack gap="xs" w="100%">
            <Button variant="light" color="orange" fullWidth onClick={() => setReceiptOpen(true)}>
              View Earnings Receipt
            </Button>
            <Button variant="outline" color="gray" fullWidth onClick={() => setDetailsOpen(true)}>
              View Order Details
            </Button>
            <Button
              fullWidth
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
              }}
              onClick={onContinue}
            >
              Continue Feeding
            </Button>
          </Stack>
        </Stack>
      </Box>

      <FeederEarningsReceiptModal
        opened={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        earnings={earnings}
        displayOrderId={displayOrderId}
      />
      <FeederCompletedOrderDetailsModal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        details={orderDetails}
      />
    </>
  );
};

export default FeederOrderCompleteScreen;
