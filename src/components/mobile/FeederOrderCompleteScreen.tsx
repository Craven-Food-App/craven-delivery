import React from 'react';

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

const FeederOrderCompleteScreen: React.FC<Props> = ({ earnings, displayOrderId, onContinue }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Delivery Complete</h1>
          <p className="text-sm text-muted-foreground">Order {displayOrderId}</p>
        </div>
        <div className="space-y-3 text-left">
          <Row label="Delivery pay" value={formatCurrency(earnings.deliveryPayCents)} />
          <Row label="Mileage pay" value={formatCurrency(earnings.mileagePayCents)} />
          <Row label="Customer tip" value={formatCurrency(earnings.customerTipCents)} />
          {earnings.promoBonusCents > 0 && (
            <Row label="Promo bonus" value={formatCurrency(earnings.promoBonusCents)} />
          )}
          {earnings.adjustmentCents !== 0 && (
            <Row label="Adjustment" value={formatCurrency(earnings.adjustmentCents)} />
          )}
          <div className="border-t border-border pt-3 flex justify-between font-semibold text-foreground">
            <span>Total payout</span>
            <span>{formatCurrency(earnings.finalPayoutCents)}</span>
          </div>
        </div>
        <button
          onClick={onContinue}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:bg-primary/90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);

export default FeederOrderCompleteScreen;