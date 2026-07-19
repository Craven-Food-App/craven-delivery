import React from 'react';
import { Badge, Card, Divider, Group, Stack, Text, Button } from '@mantine/core';
import type { FeederCleanPaySummary } from '@/lib/feederCleanPaySummary';
import { formatCleanPayMoney } from '@/lib/feederCleanPaySummary';

export type FeederCleanPayCardVariant = 'compact' | 'full';

export interface FeederCleanPayCardProps {
  variant: FeederCleanPayCardVariant;
  orderEarnings: FeederCleanPaySummary | null;
  /** Pass-through for analytics / future conditional copy */
  orderStatus?: string | null;
  showTimestamps?: boolean;
  showAdjustment?: boolean;
  showVerificationBadge?: boolean;
  /** Full / receipt: primary actions */
  onViewOrderDetails?: () => void;
  onViewEarningsReceipt?: () => void;
  onReturnToMap?: () => void;
  supportText?: string;
}

const fmtTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
    : '—';

export const FeederCleanPayCard: React.FC<FeederCleanPayCardProps> = ({
  variant,
  orderEarnings,
  orderStatus: _orderStatus,
  showTimestamps = false,
  showAdjustment: showAdjustmentProp,
  showVerificationBadge = false,
  onViewOrderDetails,
  onViewEarningsReceipt,
  onReturnToMap,
  supportText,
}) => {
  if (!orderEarnings || orderEarnings.error === 'forbidden' || orderEarnings.error === 'order_not_found') {
    return null;
  }

  const isFull = variant === 'full';
  const showAdjustment =
    showAdjustmentProp !== false &&
    orderEarnings.adjustmentCents !== 0 &&
    (isFull || orderEarnings.offerAcceptedAt != null);

  const title = isFull ? 'Final Earnings Receipt' : 'Clean Pay Summary';

  return (
    <Card
      withBorder
      radius="md"
      p={isFull ? 'md' : 'sm'}
      style={{
        background: isFull ? '#fff' : '#F9FAFB',
        borderColor: '#E5E7EB',
        maxWidth: isFull ? 420 : undefined,
        width: '100%',
      }}
    >
      <Group justify="space-between" align="flex-start" mb={6} wrap="nowrap" gap="xs">
        <Text fw={700} size={isFull ? 'md' : 'sm'} c="dark">
          {title}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Badge size="xs" variant="light" color="orange">
            Clean Pay
          </Badge>
          {showVerificationBadge && orderEarnings.cleanPayVerified ? (
            <Badge size="xs" variant="filled" color="teal">
              Clean Pay Verified
            </Badge>
          ) : null}
        </Group>
      </Group>

      {isFull ? (
        <Text size="xs" c="dimmed" mb="sm">
          Order Complete
        </Text>
      ) : null}

      <Stack gap={4}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Guaranteed Offer
          </Text>
          <Text size="sm" fw={600}>
            {formatCleanPayMoney(orderEarnings.totalGuaranteedCents)}
          </Text>
        </Group>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Customer Tip
          </Text>
          <Text size="sm" fw={600}>
            {formatCleanPayMoney(orderEarnings.customerTipCents)}
          </Text>
        </Group>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Tip Status
          </Text>
          <Text size="sm" fw={500}>
            {orderEarnings.tipStatus}
          </Text>
        </Group>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Pay Status
          </Text>
          <Text size="sm" fw={600} c="orange.7">
            {orderEarnings.cleanPayStatusLabel}
          </Text>
        </Group>

        {isFull ? (
          <>
            <Divider label="Itemized" labelPosition="center" my={6} />
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Base Pay
              </Text>
              <Text size="sm">{formatCleanPayMoney(orderEarnings.basePayCents)}</Text>
            </Group>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Delivery Fee Share
              </Text>
              <Text size="sm">{formatCleanPayMoney(orderEarnings.deliveryFeeShareCents)}</Text>
            </Group>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Promo or Bonus
              </Text>
              <Text size="sm">{formatCleanPayMoney(orderEarnings.promoBonusCents)}</Text>
            </Group>
          </>
        ) : null}

        {showAdjustment ? (
          <>
            <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
              <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                Adjustment
              </Text>
              <Text size="sm" fw={600} c={orderEarnings.adjustmentCents < 0 ? 'red' : 'dark'}>
                {formatCleanPayMoney(orderEarnings.adjustmentCents)}
              </Text>
            </Group>
            {orderEarnings.adjustmentReason ? (
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.3 }}>
                Adjustment Reason: {orderEarnings.adjustmentReason}
              </Text>
            ) : null}
          </>
        ) : null}

        {isFull ? (
          <>
            <Divider my={6} />
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="sm" fw={700}>
                Total Paid
              </Text>
              <Text size="lg" fw={800} c="green.7">
                {formatCleanPayMoney(
                  orderEarnings.finalPayoutCents ?? orderEarnings.expectedFinalPayoutCents
                )}
              </Text>
            </Group>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Payout Status
              </Text>
              <Text size="sm" fw={500}>
                {orderEarnings.payoutStatus}
              </Text>
            </Group>
          </>
        ) : orderEarnings.nextStepHint ? (
          <Text size="xs" c="dimmed" mt={4}>
            Next Step: {orderEarnings.nextStepHint}
          </Text>
        ) : null}

        {showTimestamps && isFull ? (
          <>
            <Divider my={6} />
            <Text size="xs" c="dimmed">
              Offer Locked: {fmtTime(orderEarnings.offerLockedAt)}
            </Text>
            <Text size="xs" c="dimmed">
              Pickup Confirmed: {fmtTime(orderEarnings.pickupConfirmedAt)}
            </Text>
            <Text size="xs" c="dimmed">
              Delivery Completed: {fmtTime(orderEarnings.deliveryCompletedAt)}
            </Text>
          </>
        ) : null}

        {supportText ? (
          <Text size="xs" c="dimmed" mt={8} style={{ lineHeight: 1.35 }}>
            {supportText}
          </Text>
        ) : !isFull ? (
          <Text size="xs" c="dimmed" mt={6} style={{ lineHeight: 1.35 }}>
            This offer is locked based on the accepted order details.
          </Text>
        ) : (
          <Text size="xs" c="dimmed" mt={8} style={{ lineHeight: 1.35 }}>
            Your earnings were itemized from offer acceptance through delivery completion.
          </Text>
        )}

        {isFull && (onViewOrderDetails || onViewEarningsReceipt || onReturnToMap) ? (
          <Stack gap="xs" mt="md">
            {onViewOrderDetails ? (
              <Button variant="light" color="orange" size="sm" fullWidth onClick={onViewOrderDetails}>
                View Order Details
              </Button>
            ) : null}
            {onViewEarningsReceipt ? (
              <Button variant="outline" color="orange" size="sm" fullWidth onClick={onViewEarningsReceipt}>
                View Clean Pay
              </Button>
            ) : null}
            {onReturnToMap ? (
              <Button variant="filled" color="orange" size="sm" fullWidth onClick={onReturnToMap}>
                Return to Map
              </Button>
            ) : null}
          </Stack>
        ) : null}

        {isFull && orderEarnings.orderStatus === 'cancelled' ? (
          (orderEarnings.cancellationPayCents ?? 0) > 0 || (orderEarnings.finalPayoutCents ?? 0) > 0 ? (
            <Card withBorder mt="sm" p="sm" bg="gray.0" radius="sm">
              <Text fw={600} size="sm" mb={6}>
                Cancellation Summary
              </Text>
              <Text size="xs" c="dimmed">
                Base Pay: {formatCleanPayMoney(orderEarnings.basePayCents)}
              </Text>
              <Text size="xs" c="dimmed">
                Customer Tip: {formatCleanPayMoney(orderEarnings.customerTipCents)}
              </Text>
              <Text size="xs" c="dimmed">
                Cancellation Pay: {formatCleanPayMoney(orderEarnings.cancellationPayCents ?? 0)}
              </Text>
              <Text size="sm" fw={600} mt={4}>
                Final Payout: {formatCleanPayMoney(orderEarnings.finalPayoutCents ?? 0)}
              </Text>
              <Text size="xs" c="dimmed" mt={6}>
                Payout Status: Cancelled or Partial Pay
              </Text>
            </Card>
          ) : (
            <Text size="xs" c="dimmed" mt="xs">
              No payout was generated for this cancelled order.
            </Text>
          )
        ) : null}
      </Stack>
    </Card>
  );
};

export default FeederCleanPayCard;
