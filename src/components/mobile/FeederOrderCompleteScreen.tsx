import React, { useEffect, useState } from 'react';
import { RatingSheet } from '@/components/trust/RatingSheet';
import { ReportDialog } from '@/components/trust/ReportDialog';
import { Star, Flag } from 'lucide-react';

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
  /** Optional ids used for post-delivery rating + reporting. */
  orderId?: string | null;
  customerId?: string | null;
  restaurantId?: string | null;
  customerLabel?: string;
  restaurantLabel?: string;
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const FeederOrderCompleteScreen: React.FC<Props> = ({
  earnings,
  displayOrderId,
  onContinue,
  orderId,
  customerId,
  restaurantId,
  customerLabel = 'your customer',
  restaurantLabel = 'the restaurant',
}) => {
  const [rateCustomerOpen, setRateCustomerOpen] = useState(false);
  const [rateMerchantOpen, setRateMerchantOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<'customer' | 'merchant' | null>(null);
  const [primaryShown, setPrimaryShown] = useState(false);

  // Auto-prompt feeder to rate the customer immediately after delivery completes.
  useEffect(() => {
    if (!primaryShown && orderId && customerId) {
      setPrimaryShown(true);
      setRateCustomerOpen(true);
    }
  }, [primaryShown, orderId, customerId]);

  const openReport = (t: 'customer' | 'merchant') => { setReportTarget(t); setReportOpen(true); };

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

        {orderId && (customerId || restaurantId) && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground text-left">Rate this delivery</p>
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
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:bg-primary/90 transition"
        >
          Continue
        </button>
      </div>

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
          onOpenChange={(o) => { setReportOpen(o); if (!o) setReportTarget(null); }}
          orderId={orderId}
          reporterType="feeder"
          reportedType={reportTarget}
          reportedId={reportTarget === 'customer' ? (customerId as string) : (restaurantId as string)}
          reportedLabel={reportTarget === 'customer' ? customerLabel : restaurantLabel}
        />
      )}
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