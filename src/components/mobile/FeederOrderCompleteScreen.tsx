import React, { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Text, Title, Button, Card } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Star, Flag } from 'lucide-react';
import type { FinalFeederEarnings, FeederCleanPaySummary } from '@/lib/feederCleanPaySummary';
import FeederCleanPayCard from '@/components/mobile/FeederCleanPayCard';
import FeederEarningsReceiptModal from '@/components/mobile/FeederEarningsReceiptModal';
import FeederCompletedOrderDetailsModal, {
  type CompletedOrderDetailsInput,
} from '@/components/mobile/FeederCompletedOrderDetailsModal';
import { RatingSheet } from '@/components/trust/RatingSheet';
import { ReportDialog } from '@/components/trust/ReportDialog';
import feederAppIcon from '@/assets/feeder_app_icon.png';

export interface FeederOrderCompleteScreenProps {
  earnings: FinalFeederEarnings;
  displayOrderId: string;
  orderDetails: CompletedOrderDetailsInput;
  onContinue: () => void;
  /** Preferred Clean Pay RPC payload for the detailed breakdown card. */
  cleanPaySummary?: FeederCleanPaySummary | null;
  /** Optional ids used for post-delivery rating + reporting. */
  orderId?: string | null;
  customerId?: string | null;
  restaurantId?: string | null;
  customerLabel?: string;
  restaurantLabel?: string;
}

function summaryFromEarnings(earnings: FinalFeederEarnings): FeederCleanPaySummary {
  return {
    orderId: earnings.orderId,
    basePayCents: earnings.deliveryPayCents,
    deliveryFeeShareCents: 0,
    deliveryPayCents: earnings.deliveryPayCents,
    mileagePayCents: earnings.mileagePayCents,
    customerTipCents: earnings.customerTipCents,
    promoBonusCents: earnings.promoBonusCents,
    adjustmentCents: earnings.adjustmentCents,
    totalGuaranteedCents:
      earnings.originalAcceptedOfferCents ??
      earnings.deliveryPayCents + earnings.mileagePayCents + earnings.promoBonusCents,
    originalAcceptedOfferCents: earnings.originalAcceptedOfferCents,
    expectedFinalPayoutCents: earnings.finalPayoutCents,
    finalPayoutCents: earnings.finalPayoutCents,
    tipStatus: earnings.tipStatus,
    payoutStatus: earnings.payoutStatus,
    cleanPayStatusLabel: earnings.cleanPayVerified ? 'Clean Pay Verified' : earnings.payoutStatus,
    adjustmentReason: earnings.adjustmentReason,
    offerLockedAt: earnings.offerAcceptedAt,
    offerAcceptedAt: earnings.offerAcceptedAt,
    pickupConfirmedAt: earnings.pickupConfirmedAt,
    deliveryCompletedAt: earnings.deliveryCompletedAt,
    cleanPayVerified: earnings.cleanPayVerified,
    flowStage: 'completed',
  };
}

export const FeederOrderCompleteScreen: React.FC<FeederOrderCompleteScreenProps> = ({
  earnings,
  displayOrderId,
  orderDetails,
  onContinue,
  cleanPaySummary = null,
  orderId,
  customerId,
  restaurantId,
  customerLabel = 'your customer',
  restaurantLabel = 'the restaurant',
}) => {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rateCustomerOpen, setRateCustomerOpen] = useState(false);
  const [rateMerchantOpen, setRateMerchantOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<'customer' | 'merchant' | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);

  const totalEarned = earnings.finalPayoutCents;
  const cardSummary = useMemo(
    () => cleanPaySummary ?? summaryFromEarnings(earnings),
    [cleanPaySummary, earnings]
  );

  // Big green total count-up when the complete screen mounts.
  useEffect(() => {
    const totalDollars = totalEarned / 100;
    setAnimatedTotal(0);
    const duration = 2000;
    const steps = 60;
    const increment = totalDollars / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;
    const interval = window.setInterval(() => {
      currentStep += 1;
      const next = Math.min(increment * currentStep, totalDollars);
      setAnimatedTotal(next);
      if (currentStep >= steps) {
        setAnimatedTotal(totalDollars);
        window.clearInterval(interval);
      }
    }, stepDuration);
    return () => window.clearInterval(interval);
  }, [totalEarned]);

  const openReport = (t: 'customer' | 'merchant') => {
    setReportTarget(t);
    setReportOpen(true);
  };

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
          gap="lg"
          maw={420}
          mx="auto"
          style={{
            minHeight: '100vh',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          {/* 1. Feeder driver icon */}
          <Box style={{ position: 'relative', width: 88, height: 88 }}>
            <img
              src={feederAppIcon}
              alt="Feeder"
              style={{ width: 88, height: 88, objectFit: 'contain' }}
            />
            <Box
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
              }}
            >
              <IconCheck size={17} color="white" strokeWidth={3} />
            </Box>
          </Box>

          <Stack gap={4} align="center">
            <Title order={2} fw={800} c="dark" ta="center">
              Order Complete
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Order {displayOrderId}
            </Text>
          </Stack>

          {/* 2. Big green total counter */}
          <Box ta="center" w="100%">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
              Total Earned
            </Text>
            <Text
              fw={800}
              c="#22c55e"
              style={{
                fontSize: 56,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${animatedTotal.toFixed(2)}
            </Text>
          </Box>

          {/* 3. Detailed Clean Pay breakdown + view Clean Pay */}
          <Box w="100%">
            <FeederCleanPayCard
              variant="full"
              orderEarnings={cardSummary}
              showTimestamps
              showAdjustment
              showVerificationBadge
              onViewOrderDetails={() => setDetailsOpen(true)}
              onViewEarningsReceipt={() => setReceiptOpen(true)}
            />
          </Box>

          <Stack gap="xs" w="100%">
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

          {orderId && (customerId || restaurantId) && (
            <Card withBorder w="100%" radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" mb="sm" style={{ letterSpacing: '0.08em' }}>
                Rate this delivery
              </Text>
              <div className="grid grid-cols-2 gap-2">
                {customerId && (
                  <button
                    type="button"
                    onClick={() => setRateCustomerOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/40 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-500/10"
                  >
                    <Star className="h-3.5 w-3.5" /> Rate customer
                  </button>
                )}
                {restaurantId && (
                  <button
                    type="button"
                    onClick={() => setRateMerchantOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/40 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-500/10"
                  >
                    <Star className="h-3.5 w-3.5" /> Rate restaurant
                  </button>
                )}
                {customerId && (
                  <button
                    type="button"
                    onClick={() => openReport('customer')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report customer
                  </button>
                )}
                {restaurantId && (
                  <button
                    type="button"
                    onClick={() => openReport('merchant')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report restaurant
                  </button>
                )}
              </div>
            </Card>
          )}
        </Stack>
      </Box>

      <FeederEarningsReceiptModal
        opened={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        earnings={earnings}
        displayOrderId={displayOrderId}
      />
      <FeederCompletedOrderDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        details={orderDetails}
      />

      {orderId && customerId && (
        <RatingSheet
          open={rateCustomerOpen}
          onOpenChange={setRateCustomerOpen}
          orderId={orderId}
          raterType="feeder"
          rateeType="customer"
          rateeId={customerId}
          rateeLabel={customerLabel}
        />
      )}
      {orderId && restaurantId && (
        <RatingSheet
          open={rateMerchantOpen}
          onOpenChange={setRateMerchantOpen}
          orderId={orderId}
          raterType="feeder"
          rateeType="merchant"
          rateeId={restaurantId}
          rateeLabel={restaurantLabel}
        />
      )}
      {orderId && reportTarget && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={(o) => {
            setReportOpen(o);
            if (!o) setReportTarget(null);
          }}
          orderId={orderId}
          reporterType="feeder"
          reportedType={reportTarget}
          reportedId={reportTarget === 'customer' ? (customerId as string) : (restaurantId as string)}
          reportedLabel={reportTarget === 'customer' ? customerLabel : restaurantLabel}
        />
      )}
    </>
  );
};

export default FeederOrderCompleteScreen;
