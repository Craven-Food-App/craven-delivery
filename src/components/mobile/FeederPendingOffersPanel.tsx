import React, { useMemo } from 'react';
import { X, Clock, Package, MapPin } from 'lucide-react';
import type { OrderAssignment } from './feederOrderTypes';
import {
  buildOfferDisplayRows,
  sumPayoutCents,
  type OfferRow,
} from '@/lib/feederOfferBatching';

function formatCountdown(expiresAt: string, now: number): string {
  const sec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  if (sec >= 3600) {
    const m = Math.floor(sec / 60);
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface FeederPendingOffersPanelProps {
  offers: OrderAssignment[];
  nowMs: number;
  onDeclineOne: (assignmentId: string) => void;
  onDeclineBatch: (assignmentIds: string[]) => void;
  /** Non-retail: quick accept from list */
  onAcceptSingle: (offer: OrderAssignment) => void;
  onAcceptBatch: (offers: OrderAssignment[]) => void;
  /** Retail / grocery: open full offer flow */
  onOpenDetails: (offer: OrderAssignment) => void;
  onOpenBatchDetails: (offers: OrderAssignment[]) => void;
  isRetailOffer: (o: OrderAssignment) => boolean;
  maxDropoffMiles: number;
}

export const FeederPendingOffersPanel: React.FC<FeederPendingOffersPanelProps> = ({
  offers,
  nowMs,
  onDeclineOne,
  onDeclineBatch,
  onAcceptSingle,
  onAcceptBatch,
  onOpenDetails,
  onOpenBatchDetails,
  isRetailOffer,
  maxDropoffMiles,
}) => {
  const rows = useMemo(
    () => buildOfferDisplayRows(offers, maxDropoffMiles),
    [offers, maxDropoffMiles]
  );

  const renderRow = (row: OfferRow) => {
    if (row.kind === 'single') {
      const o = row.offer;
      const exp = o.expires_at;
      const retail = isRetailOffer(o);
      return (
        <div
          key={o.assignment_id}
          className="rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{o.restaurant_name || 'Pickup'}</p>
              {o.customer_name ? (
                <p className="text-xs text-muted-foreground truncate">Customer: {o.customer_name}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-emerald-600 font-bold">{formatMoney(o.payout_cents)}</span>
                {o.tip_cents != null && o.tip_cents > 0 && (
                  <span className="text-xs text-muted-foreground">+{formatMoney(o.tip_cents)} tip</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{formatCountdown(exp, nowMs)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDeclineOne(o.assignment_id)}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Decline"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenDetails(o)}
              className="flex-1 min-w-[100px] rounded-lg border border-border bg-background py-2 text-sm font-medium"
            >
              Details
            </button>
            {retail ? (
              <button
                type="button"
                onClick={() => onOpenDetails(o)}
                className="flex-1 min-w-[100px] rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
              >
                Review
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAcceptSingle(o)}
                className="flex-1 min-w-[100px] rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
              >
                Accept
              </button>
            )}
          </div>
        </div>
      );
    }

    const list = row.offers;
    const totalCents = sumPayoutCents(list);
    const minExp = row.minExpiresAt;
    const anyRetail = list.some((o) => isRetailOffer(o));
    return (
      <div
        key={list.map((x) => x.assignment_id).join(',')}
        className="rounded-xl border-2 border-orange-200 bg-orange-50/90 p-3 shadow-sm dark:bg-orange-950/40 dark:border-orange-800"
      >
        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Package className="h-5 w-5 shrink-0" />
          <span className="font-bold text-sm">Batch offer ({list.length} orders)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Same store · drop-offs within {maxDropoffMiles} mi
        </p>
        <p className="mt-1 font-semibold text-foreground">{list[0]?.restaurant_name}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {list.map((o) => (
            <li key={o.assignment_id} className="flex justify-between gap-2">
              <span className="truncate">{o.order_number || o.order_id.slice(0, 8)}</span>
              <span className="shrink-0 text-foreground">{formatMoney(o.payout_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-bold text-emerald-600">Total {formatMoney(totalCents)}</span>
          <div className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
            <MapPin className="h-3.5 w-3.5" />
            {formatCountdown(minExp, nowMs)} left
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDeclineBatch(list.map((x) => x.assignment_id))}
            className="flex-1 rounded-lg border border-border bg-background py-2 text-sm font-medium"
          >
            Decline all
          </button>
          {anyRetail ? (
            <button
              type="button"
              onClick={() => onOpenBatchDetails(list)}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              Review batch
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAcceptBatch(list)}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              Accept all
            </button>
          )}
        </div>
      </div>
    );
  };

  if (rows.length === 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40 max-h-[55vh] flex flex-col rounded-t-2xl border-t border-border bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] safe-area-bottom"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <p className="text-sm font-semibold">New offers · pick one before it expires</p>
        <span className="text-xs text-muted-foreground">{offers.length} open</span>
      </div>
      <div className="overflow-y-auto px-3 py-2 space-y-2 pb-4">
        {rows.map((row, i) => (
          <React.Fragment key={row.kind === 'single' ? row.offer.assignment_id : `batch-${i}`}>
            {renderRow(row)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FeederPendingOffersPanel;
