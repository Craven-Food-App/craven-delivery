/**
 * Crave'n — New Delivery Request Screen
 * Enterprise Redesign — Single-stakes delivery accept/decline moment
 * All white surfaces, single border token, typography-driven hierarchy
 */

import React from 'react';
import { TimerRing } from './TimerRing';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

// Theme is now dynamic via useFeederDarkMode()

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface DeliveryRequestProps {
  orderId: string;
  timeLeft: number;
  totalSeconds: number;
  merchant: {
    name: string;
    address: string;
  };
  customer: {
    name: string;
    address: string;
  };
  distance: number;       // miles
  eta: number;           // minutes
  earnings: number;      // dollars
  subtotal: number;      // dollars
  tip: number;           // dollars
  feePercentage: number; // e.g., 70
  mapComponent?: React.ReactNode; // Your existing Mapbox GL component
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

// ─── ICONS ──────────────────────────────────────────────────────────────────
const PickupIcon: React.FC = () => {
  const { colors: C } = useFeederDarkMode();
  return (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 5.5L8 2L14 5.5V10.5L8 14L2 10.5V5.5Z"
      stroke={C.orange}
      strokeWidth="1.3"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2 5.5L8 9L14 5.5"
      stroke={C.orange}
      strokeWidth="1.3"
      fill="none"
    />
  </svg>
  );
};

const DropoffIcon: React.FC = () => {
  const { colors: C } = useFeederDarkMode();
  return (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.51 10.49 1.5 8 1.5Z"
      stroke={C.green}
      strokeWidth="1.3"
      fill="none"
    />
    <circle
      cx="8"
      cy="6"
      r="1.8"
      stroke={C.green}
      strokeWidth="1.3"
      fill="none"
    />
  </svg>
  );
};

const ArrowIcon: React.FC = () => {
  const { colors: C } = useFeederDarkMode();
  return (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M3 6H9 M9 6L7 4 M9 6L7 8"
      stroke={C.arrowGray}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  );
};

const CloseIcon: React.FC = () => {
  const { colors: C } = useFeederDarkMode();
  return (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12" stroke="#B0B0B0" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 4L4 12" stroke="#B0B0B0" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
  );
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export const NewDeliveryRequest: React.FC<DeliveryRequestProps> = ({
  orderId,
  timeLeft,
  totalSeconds,
  merchant,
  customer,
  distance,
  eta,
  earnings,
  subtotal,
  tip,
  feePercentage,
  mapComponent,
  onAccept,
  onDecline,
  onClose,
}) => {
  const { colors: C } = useFeederDarkMode();
  const pct = timeLeft / totalSeconds;
  const urgent = pct <= 0.3;
  const progressColor = urgent ? C.red : C.orange;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: '10px',
          boxShadow: '0 2px 24px rgba(0, 0, 0, 0.08)',
          maxWidth: '380px',
          width: '100%',
          fontFamily: '-apple-system, SF Pro Text, Helvetica Neue, sans-serif',
          color: C.textPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '20px 20px 0',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: C.textPrimary,
              }}
            >
              New Delivery Request
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: C.textSecondary,
                marginTop: '3px',
              }}
            >
              Order #{orderId}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Timer Strip Card ──────────────────────────────────────── */}
        <div
          style={{
            margin: '16px 20px 0',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Timer Ring */}
          <TimerRing timeLeft={timeLeft} totalSeconds={totalSeconds} />

          {/* Route summary + progress */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Route names */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: C.orange,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: C.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {merchant.name}
              </span>
              <ArrowIcon />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: C.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {customer.name}
              </span>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: C.green,
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: '2px',
                background: C.border,
                borderRadius: '1px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct * 100}%`,
                  background: progressColor,
                  borderRadius: '1px',
                  transition: 'width 1s linear, background 0.6s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Mapbox Container ──────────────────────────────────────── */}
        {mapComponent && (
          <div
            style={{
              margin: '16px 20px 0',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '200px',
              border: `1px solid ${C.border}`,
            }}
          >
            {mapComponent}
          </div>
        )}

        {/* ── Pickup / Dropoff Card ─────────────────────────────────── */}
        <div
          style={{
            margin: '16px 20px 0',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {/* Pickup Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '13px 16px',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: `1px solid ${C.border}`,
                background: C.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PickupIcon />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: C.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {merchant.name}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 400,
                  color: C.textSecondary,
                  marginTop: '1.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {merchant.address}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: C.border,
              margin: '0 16px',
            }}
          />

          {/* Dropoff Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '13px 16px',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: `1px solid ${C.border}`,
                background: C.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DropoffIcon />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: C.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {customer.name}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 400,
                  color: C.textSecondary,
                  marginTop: '1.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {customer.address}
              </div>
            </div>
          </div>
        </div>

        {/* ── Metrics Row ───────────────────────────────────────────── */}
        <div
          style={{
            margin: '12px 20px 0',
            display: 'flex',
            gap: '8px',
          }}
        >
          {/* Distance */}
          <div
            style={{
              flex: 1,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: C.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '5px',
              }}
            >
              Distance
            </div>
            <div>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: C.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              >
                {distance.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: C.textSecondary,
                  marginLeft: '1px',
                }}
              >
                mi
              </span>
            </div>
          </div>

          {/* ETA */}
          <div
            style={{
              flex: 1,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: C.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '5px',
              }}
            >
              ETA
            </div>
            <div>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: C.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              >
                {eta}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: C.textSecondary,
                  marginLeft: '1px',
                }}
              >
                min
              </span>
            </div>
          </div>

          {/* Earnings */}
          <div
            style={{
              flex: 1,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: C.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '5px',
              }}
            >
              Earnings
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: C.orange,
                letterSpacing: '-0.02em',
              }}
            >
              ${earnings.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Earnings Detail Card ──────────────────────────────────── */}
        <div
          style={{
            margin: '8px 20px 0',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '13px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: C.textPrimary,
              }}
            >
              Your Earnings
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 400,
                color: C.textSecondary,
                marginTop: '1.5px',
              }}
            >
              {feePercentage}% of fee
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: C.orange,
                letterSpacing: '-0.02em',
              }}
            >
              ${earnings.toFixed(2)}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 400,
                color: C.textSecondary,
                marginTop: '1.5px',
              }}
            >
              Sub: ${subtotal.toFixed(2)} · Tip: ${tip.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Action Buttons ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '20px 20px 24px',
          }}
        >
          {/* Accept */}
          <button
            onClick={onAccept}
            style={{
              width: '100%',
              padding: '14px',
              background: C.orange,
              color: C.surface,
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              boxShadow: '0 2px 8px rgba(232, 101, 42, 0.28)',
              cursor: 'pointer',
            }}
          >
            Accept Delivery
          </button>

          {/* Decline */}
          <button
            onClick={onDecline}
            style={{
              width: '100%',
              padding: '11px',
              background: C.surface,
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 400,
              cursor: 'pointer',
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

