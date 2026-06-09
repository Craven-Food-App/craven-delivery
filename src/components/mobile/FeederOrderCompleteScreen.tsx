import React, { useEffect, useState } from 'react';
import cravenCarLogo from '@/assets/craven-c-celebration.png';
import { FeederCleanPayCard } from './FeederCleanPayCard';
import type { FeederCleanPaySummary } from '@/lib/feederCleanPaySummary';

interface Earnings {
  orderId: string;
  deliveryPayCents: number;
  mileagePayCents: number;
  customerTipCents: number;
  promoBonusCents: number;
  adjustmentCents: number;
  finalPayoutCents: number;
  originalAcceptedOfferCents: number | null;
  cleanPayVerified: boolean;
  tipStatus: string;
  payoutStatus: string;
  offerAcceptedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveryCompletedAt: string | null;
  adjustmentReason: string | null;
}

interface Props {
  earnings: Earnings;
  displayOrderId: string;
  orderDetails: unknown;
  onContinue: () => void;
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const useCountUp = (targetCents: number, durationMs = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(targetCents * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetCents, durationMs]);
  return value;
};

const buildSummaryFromEarnings = (e: Earnings): FeederCleanPaySummary => ({
  orderId: e.orderId,
  basePayCents: e.deliveryPayCents,
  deliveryFeeShareCents: 0,
  deliveryPayCents: e.deliveryPayCents,
  mileagePayCents: e.mileagePayCents,
  customerTipCents: e.customerTipCents,
  promoBonusCents: e.promoBonusCents,
  adjustmentCents: e.adjustmentCents,
  totalGuaranteedCents: e.deliveryPayCents + e.mileagePayCents,
  originalAcceptedOfferCents: e.originalAcceptedOfferCents ?? null,
  expectedFinalPayoutCents: e.finalPayoutCents,
  finalPayoutCents: e.finalPayoutCents,
  tipStatus: e.tipStatus,
  payoutStatus: e.payoutStatus,
  cleanPayStatusLabel: e.cleanPayVerified ? 'Clean Pay Verified' : 'Clean Pay',
  adjustmentReason: e.adjustmentReason,
  offerLockedAt: e.offerAcceptedAt,
  offerAcceptedAt: e.offerAcceptedAt,
  pickupConfirmedAt: e.pickupConfirmedAt,
  deliveryCompletedAt: e.deliveryCompletedAt,
  cleanPayVerified: e.cleanPayVerified,
});

const FeederOrderCompleteScreen: React.FC<Props> = ({ earnings, displayOrderId, onContinue }) => {
  const animated = useCountUp(earnings.finalPayoutCents);
  const summary = React.useMemo(() => buildSummaryFromEarnings(earnings), [earnings]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center px-5 py-8"
      style={{ background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 35%)' }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-5">
        {/* C car logo with orange glow */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234,88,12,0.18) 0%, rgba(234,88,12,0) 70%)',
          }}
        >
          <img
            src={cravenCarLogo}
            alt="Crave'n delivery complete"
            style={{ width: 104, height: 104, objectFit: 'contain' }}
            draggable={false}
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
            Delivery Complete!
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Order #{displayOrderId.slice(-6).toUpperCase()}
          </p>
        </div>

        {/* Big green animated total */}
        <div className="flex flex-col items-center">
          <div
            className="font-extrabold tabular-nums leading-none"
            style={{ color: '#16a34a', fontSize: 56, letterSpacing: '-0.02em' }}
          >
            {formatCurrency(animated)}
          </div>
          <div className="mt-1 text-sm font-medium uppercase tracking-wider" style={{ color: '#16a34a' }}>
            Total Earnings
          </div>
        </div>

        {/* Clean Pay breakdown */}
        <div className="w-full">
          <FeederCleanPayCard
            variant="full"
            orderEarnings={summary}
            showVerificationBadge
            showAdjustment
          />
        </div>

        {/* Continue CTA in Crave'n orange */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full py-3.5 font-semibold text-white transition active:scale-[0.99]"
          style={{
            background: '#EA580C',
            boxShadow: '0 8px 22px rgba(234, 88, 12, 0.38)',
            fontSize: 16,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default FeederOrderCompleteScreen;