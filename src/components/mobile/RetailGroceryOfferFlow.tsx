/**
 * Grocery / Retail delivery offer flow — Step 1 (Accept/Reject) and Step 2 (Start route).
 * Mapbox is shown in the background (parent provides full-screen map behind this overlay).
 */

import React from 'react';
import { DeliveryMap } from './DeliveryMap';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  surface: '#FFFFFF',
  border: '#ECECEC',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  orange: '#E8652A',
  red: '#DC2626',
  green: '#22C55E',
  arrowGray: '#C5C5C5',
} as const;

export interface RetailGroceryOfferFlowProps {
  /** Step 1 = offer (Accept/Reject), Step 2 = confirm (Start route) */
  step: 1 | 2;
  /** Total estimated payout in dollars (shown in green) */
  estimateAmount: number;
  /** Amount earned for mileage, shown on same row as estimate (right) */
  mileageEarnings: number;
  /** Number of stops (e.g. 24) */
  stops: number;
  /** Total miles for the trip */
  totalMiles: number;
  /** Human-readable duration (e.g. "2 hrs, 34 mins") */
  durationText: string;
  /** e.g. "ASAP • Pickup" */
  pickupLabel: string;
  /** Store name (e.g. "Walmart HOLLAND #3445") */
  pickupStoreName: string;
  /** Store logo URL — shown next to pickup instead of the default icon */
  pickupStoreLogoUrl?: string;
  /** Number of drop-offs (e.g. 23) or use dropoffLabel instead */
  dropoffCount: number;
  /** Optional labels like "Apartment", "Bulky item" */
  tags?: string[];
  /** e.g. "1:00 PM" */
  getOffersUntil?: string;
  /** Pickup address (object or string) — when provided with dropoffAddress, an interactive
   * Crave'N orange route map (CX-style) is rendered above the card. */
  pickupAddress?: any;
  /** Dropoff address (object or string) for the route. */
  dropoffAddress?: any;
  /** When set, shows Clean Pay Standard offer breakdown before accept (step 1). */
  cleanPayOffer?: {
    basePayDollars: number;
    deliveryFeeShareDollars: number;
    customerTipDollars: number;
    promoBonusDollars: number;
    totalGuaranteedDollars: number;
  } | null;
  onAccept: () => void;
  onReject: () => void;
  /** Called when user taps "Start route" on step 2 */
  onStartRoute: () => void;
}

const PickupStoreIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      stroke={C.orange}
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M9 22V12h6v10" stroke={C.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DropoffIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      stroke={C.green}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="7" r="4" stroke={C.green} strokeWidth="1.5" fill="none" />
  </svg>
);

const ChevronRight: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 4L10 8L6 12" stroke={C.arrowGray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RetailGroceryOfferFlow: React.FC<RetailGroceryOfferFlowProps> = ({
  step,
  estimateAmount,
  mileageEarnings,
  stops,
  totalMiles,
  durationText,
  pickupLabel,
  pickupStoreName,
  pickupStoreLogoUrl,
  dropoffCount,
  tags = [],
  getOffersUntil,
  pickupAddress,
  dropoffAddress,
  cleanPayOffer,
  onAccept,
  onReject,
  onStartRoute,
}) => {
  const tripSummary = `${stops} stop${stops !== 1 ? 's' : ''} • ${totalMiles.toFixed(1)} miles • ${durationText}`;

  const showRouteMap = !!(pickupAddress && dropoffAddress);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* CX-style route map fills the space above the bottom card */}
      {showRouteMap && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'auto',
            zIndex: 0,
          }}
        >
          <DeliveryMap
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            showRoute
            className="w-full h-full"
          />
        </div>
      )}
      <div
        style={{
          pointerEvents: 'auto',
          fontFamily: '-apple-system, SF Pro Text, Helvetica Neue, sans-serif',
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top bar: "Get offers until" — optional */}
        {getOffersUntil != null && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '12px 16px 8px',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: 13, color: C.textSecondary }}>Get offers until</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.textPrimary,
                background: '#F3F4F6',
                padding: '4px 12px',
                borderRadius: 999,
              }}
            >
              {getOffersUntil}
            </span>
          </div>
        )}

        {/* Main card */}
        <div
          style={{
            margin: '0 16px 16px',
            padding: '20px 16px 20px',
            background: C.surface,
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            border: `1px solid ${C.border}`,
          }}
        >
          {/* "This includes" + trip summary — on top of estimate/mileage row */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              This includes
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.textPrimary }}>
              {tripSummary}
            </div>
          </div>

          {/* Row: Estimated amount (green) + mileage (right) + chevron */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: '-0.02em' }}>
                ${estimateAmount.toFixed(2)}
              </span>
              <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>estimate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                Mileage: ${mileageEarnings.toFixed(2)}
              </span>
              <ChevronRight />
            </div>
          </div>

          {cleanPayOffer && step === 1 && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                background: '#FFFBEB',
                border: `1px solid #FDE68A`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#92400E',
                    background: '#FEF3C7',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  Clean Pay
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Locked offer</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: C.textPrimary }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSecondary }}>Base Pay</span>
                  <span style={{ fontWeight: 600 }}>${cleanPayOffer.basePayDollars.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSecondary }}>Delivery Fee Share</span>
                  <span style={{ fontWeight: 600 }}>${cleanPayOffer.deliveryFeeShareDollars.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSecondary }}>Customer Tip</span>
                  <span style={{ fontWeight: 600 }}>${cleanPayOffer.customerTipDollars.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSecondary }}>Promo or Bonus</span>
                  <span style={{ fontWeight: 600 }}>${cleanPayOffer.promoBonusDollars.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 8,
                    borderTop: `1px dashed ${C.border}`,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Total Guaranteed Offer</span>
                  <span style={{ fontWeight: 800, color: C.green }}>${cleanPayOffer.totalGuaranteedDollars.toFixed(2)}</span>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, lineHeight: 1.35, color: C.textSecondary }}>
                Customer tips are shown separately and paid to the Feeder.
              </p>
            </div>
          )}

          {/* Pickup row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: pickupStoreLogoUrl ? 'transparent' : '#FFF7ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {pickupStoreLogoUrl ? (
                <img
                  src={pickupStoreLogoUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <PickupStoreIcon />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{pickupLabel}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, marginTop: 2 }}>{pickupStoreName}</div>
            </div>
          </div>

          {/* Drop-off row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: tags.length > 0 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DropoffIcon />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
                {dropoffCount} drop-off{dropoffCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, paddingBottom: 16 }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.textSecondary,
                    background: '#F3F4F6',
                    padding: '6px 12px',
                    borderRadius: 8,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              paddingTop: tags.length > 0 ? 0 : 16,
            }}
          >
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: C.orange,
                    color: C.surface,
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(232, 101, 42, 0.35)',
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: C.red,
                    color: C.surface,
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartRoute}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: C.orange,
                  color: C.surface,
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(232, 101, 42, 0.35)',
                }}
              >
                Start route
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailGroceryOfferFlow;
