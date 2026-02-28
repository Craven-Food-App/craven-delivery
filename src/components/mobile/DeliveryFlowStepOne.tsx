/**
 * Step one (routing to kitchen) of delivery flow – bottom sheet design with drag.
 * Matches the provided HTML design: status bar, step indicator, pickup/est pay cards, CTA.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import { IconMapPin, IconNavigation } from '@tabler/icons-react';
import { StepOneMap } from './StepOneMap';

const STEP_ONE_CSS = `
  .dfl-step-one-root { font-family: 'DM Sans', sans-serif; }
  .dfl-step-one-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
    height: calc(100% - 60px);
    transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
    touch-action: none;
  }
  .dfl-step-one-sheet.dragging { transition: none; }
  .dfl-step-one-sheet-inner {
    position: absolute; inset: 0;
    background: #ffffff;
    border-radius: 20px 20px 0 0;
    border-top: 1px solid rgba(28,28,30,0.09);
    border-left: 1px solid rgba(28,28,30,0.09);
    border-right: 1px solid rgba(28,28,30,0.09);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 -8px 48px rgba(28,28,30,0.10);
  }
  .dfl-step-one-handle {
    flex-shrink: 0; padding: 12px 0 8px;
    display: flex; justify-content: center; cursor: grab;
    touch-action: none; user-select: none;
  }
  .dfl-step-one-handle:active { cursor: grabbing; }
  .dfl-step-one-handle-pill {
    width: 36px; height: 4px; background: rgba(28,28,30,0.15);
    border-radius: 2px;
  }
  .dfl-step-one-status-bar {
    flex-shrink: 0; padding: 10px 20px 12px;
    border-bottom: 1px solid rgba(28,28,30,0.09);
    display: flex; align-items: center; justify-content: space-between;
  }
  .dfl-step-one-status-dot-wrap {
    width: 20px; height: 20px; border: 1px solid rgba(28,28,30,0.09);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .dfl-step-one-status-dot {
    width: 6px; height: 6px; background: #f26419; border-radius: 50%;
    animation: dfl-blink 2.4s ease-in-out infinite;
  }
  @keyframes dfl-blink {
    0%, 100% { opacity: 1; } 50% { opacity: 0.25; }
  }
  .dfl-step-one-status-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(28,28,30,0.5); margin-bottom: 1px;
  }
  .dfl-step-one-status-name { font-size: 13px; font-weight: 500; color: #1c1c1e; letter-spacing: 0.005em; }
  .dfl-step-one-dist-chip {
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
    color: #f26419; background: #fff4ed; border: 1px solid rgba(242,100,25,0.2);
    border-radius: 6px; padding: 5px 11px;
  }
  .dfl-step-one-body {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; padding: 20px 20px 0;
  }
  .dfl-step-one-body::-webkit-scrollbar { display: none; }
  .dfl-step-one-steps {
    display: flex; align-items: center; gap: 5px; margin-bottom: 18px;
  }
  .dfl-step-one-step { height: 3px; width: 22px; background: #f26419; border-radius: 2px; }
  .dfl-step-one-step.off { background: rgba(28,28,30,0.15); }
  .dfl-step-one-step-lbl {
    font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(28,28,30,0.5);
    letter-spacing: 0.1em; margin-left: 4px;
  }
  .dfl-step-one-customer-line {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.13em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 5px;
  }
  .dfl-step-one-order-row {
    display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px;
  }
  .dfl-step-one-order-num {
    font-size: 28px; font-weight: 300; color: #1c1c1e; letter-spacing: -0.02em;
  }
  .dfl-step-one-order-tag {
    font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.13em;
    text-transform: uppercase; border: 1px solid rgba(28,28,30,0.09);
    background: rgba(28,28,30,0.06); border-radius: 4px;
    color: rgba(28,28,30,0.5); padding: 4px 9px;
  }
  .dfl-step-one-data-block {
    border: 1px solid rgba(28,28,30,0.09); border-radius: 12px;
    margin-bottom: 10px; overflow: hidden; background: #fafafa;
  }
  .dfl-step-one-data-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid rgba(28,28,30,0.09);
  }
  .dfl-step-one-data-row:last-child { border-bottom: none; }
  .dfl-step-one-data-left { display: flex; align-items: center; gap: 12px; }
  .dfl-step-one-data-icon {
    width: 16px; height: 16px; color: rgba(28,28,30,0.5);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  }
  .dfl-step-one-data-label {
    font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 3px;
  }
  .dfl-step-one-data-value { font-size: 13px; color: #1c1c1e; font-weight: 400; }
  .dfl-step-one-pay-value {
    font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500;
    color: #1c1c1e; letter-spacing: -0.01em;
  }
  .dfl-step-one-nav-btn {
    display: flex; align-items: center; gap: 7px; border: none;
    background: #f26419; color: white; font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 9px 14px; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-one-nav-btn:active { opacity: 0.8; }
  .dfl-step-one-footer {
    flex-shrink: 0; padding: 14px 20px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 16px));
    border-top: 1px solid rgba(28,28,30,0.09); background: #ffffff;
  }
  .dfl-step-one-cta {
    width: 100%; background: #f26419; color: white; border: none;
    padding: 17px 24px; border-radius: 14px; font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; letter-spacing: 0.01em; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    -webkit-tap-highlight-color: transparent; transition: opacity 0.15s;
    box-shadow: 0 4px 20px rgba(242,100,25,0.28);
  }
  .dfl-step-one-cta:active { opacity: 0.85; }
  .dfl-step-one-cta-arrow {
    width: 18px; height: 1px; background: rgba(255,255,255,0.5); position: relative;
  }
  .dfl-step-one-cta-arrow::after {
    content: ''; position: absolute; right: 0; top: -3px;
    width: 6px; height: 6px;
    border-top: 1.5px solid rgba(255,255,255,0.5);
    border-right: 1.5px solid rgba(255,255,255,0.5);
    transform: rotate(45deg);
  }
`;

const SNAP_HALF = 50;
const SNAP_UP = 0;
const SNAP_DOWN = 82;

export interface DeliveryFlowStepOneProps {
  restaurantName: string;
  pickupAddress: string;
  /** Store coords for map; if missing, pickupAddress is geocoded. */
  storeLat?: number;
  storeLng?: number;
  orderNumber: string;
  customerName: string;
  isTestOrder: boolean;
  estimatedPay: number;
  distanceMi: number;
  estArrivalMin?: number;
  onNavigate: () => void;
  onArrived: () => void;
}

export const DeliveryFlowStepOne: React.FC<DeliveryFlowStepOneProps> = ({
  restaurantName,
  pickupAddress,
  storeLat,
  storeLng,
  orderNumber,
  customerName,
  isTestOrder,
  estimatedPay,
  distanceMi,
  estArrivalMin = 4,
  onNavigate,
  onArrived,
}) => {
  const [sheetTranslatePct, setSheetTranslatePct] = useState(SNAP_HALF);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startTranslateRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const getTranslatePx = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return 0;
    const style = window.getComputedStyle(el);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m42;
  }, []);

  const snapTo = useCallback((pct: number) => {
    setSheetTranslatePct(pct);
    setDragging(false);
    const el = sheetRef.current;
    if (el) {
      el.style.transition = 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)';
      el.style.transform = `translateY(${pct}%)`;
    }
    if (bodyRef.current) {
      bodyRef.current.style.overflowY = pct < 20 ? 'auto' : 'hidden';
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    const sheetEl = sheetRef.current;
    if (sheetEl) sheetEl.style.transition = 'none';
    startYRef.current = e.clientY;
    startTranslateRef.current = getTranslatePx();
    lastYRef.current = e.clientY;
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [getTranslatePx]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dy = e.clientY - lastYRef.current;
    velocityRef.current = dy;
    lastYRef.current = e.clientY;
    const delta = e.clientY - startYRef.current;
    const sheetEl = sheetRef.current;
    if (!sheetEl) return;
    const sheetH = sheetEl.offsetHeight;
    const newPx = Math.max(0, startTranslateRef.current + delta);
    const maxPx = sheetH * 0.85;
    const clamped = Math.min(newPx, maxPx);
    sheetEl.style.transition = 'none';
    sheetEl.style.transform = `translateY(${clamped}px)`;
  }, [dragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const sheetEl = sheetRef.current;
    if (!sheetEl) return;
    const sheetH = sheetEl.offsetHeight;
    const currentPx = getTranslatePx();
    const currentPct = sheetH > 0 ? (currentPx / sheetH) * 100 : SNAP_HALF;
    const velocity = velocityRef.current;

    if (velocity > 6) {
      snapTo(currentPct > 65 ? SNAP_DOWN : SNAP_HALF);
    } else if (velocity < -6) {
      snapTo(currentPct < 30 ? SNAP_UP : SNAP_HALF);
    } else {
      const snaps = [SNAP_UP, SNAP_HALF, SNAP_DOWN];
      const nearest = snaps.reduce((a, b) => Math.abs(a - currentPct) < Math.abs(b - currentPct) ? a : b);
      snapTo(nearest);
    }
  }, [dragging, getTranslatePx, snapTo]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transform = `translateY(${sheetTranslatePct}%)`;
  }, [sheetTranslatePct]);

  const customerShort = customerName ? (customerName.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'C.') : 'C.';
  const distStr = distanceMi <= 0 ? '0.8' : distanceMi.toFixed(1);

  return (
    <Box
      className="dfl-step-one-root"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#e8e4dc',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style>{STEP_ONE_CSS}</style>
      {/* Mapbox: driver icon, store icon, route options */}
      <Box style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
        <StepOneMap
          storeLat={storeLat}
          storeLng={storeLng}
          storeAddress={pickupAddress}
          storeName={restaurantName}
          className="w-full h-full"
        />
      </Box>
      {/* Sheet – pointer-events auto so it remains interactive */}
      <div
        ref={sheetRef}
        className={`dfl-step-one-sheet ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateY(${sheetTranslatePct}%)`, pointerEvents: 'auto' }}
      >
        <div className="dfl-step-one-sheet-inner">
          <div
            className="dfl-step-one-handle"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div className="dfl-step-one-handle-pill" />
          </div>

          <div className="dfl-step-one-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="dfl-step-one-status-dot-wrap">
                <div className="dfl-step-one-status-dot" />
              </div>
              <div>
                <div className="dfl-step-one-status-eyebrow">En Route · Kitchen</div>
                <div className="dfl-step-one-status-name">{restaurantName}</div>
              </div>
            </div>
            <div className="dfl-step-one-dist-chip">{distStr} MI</div>
          </div>

          <div ref={bodyRef} className="dfl-step-one-body" style={{ overflowY: sheetTranslatePct < 20 ? 'auto' : 'hidden' }}>
            <div className="dfl-step-one-steps">
              <div className="dfl-step-one-step" />
              <div className="dfl-step-one-step off" />
              <div className="dfl-step-one-step off" />
              <span className="dfl-step-one-step-lbl">Step 1 of 3</span>
            </div>

            <div className="dfl-step-one-customer-line">Customer · {customerShort}</div>
            <div className="dfl-step-one-order-row">
              <div className="dfl-step-one-order-num">Order #{orderNumber}</div>
              <div className="dfl-step-one-order-tag">{isTestOrder ? 'Test Order' : 'Order'}</div>
            </div>

            <div className="dfl-step-one-data-block">
              <div className="dfl-step-one-data-row">
                <div className="dfl-step-one-data-left">
                  <div className="dfl-step-one-data-icon">
                    <IconMapPin size={16} stroke={1.4} color="rgba(28,28,30,0.5)" />
                  </div>
                  <div>
                    <div className="dfl-step-one-data-label">Pickup Address</div>
                    <div className="dfl-step-one-data-value">{pickupAddress}</div>
                  </div>
                </div>
                <button type="button" className="dfl-step-one-nav-btn" onClick={onNavigate}>
                  <IconNavigation size={11} stroke={1.5} />
                  Navigate
                </button>
              </div>
              <div className="dfl-step-one-data-row">
                <div className="dfl-step-one-data-left">
                  <div className="dfl-step-one-data-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 4.5v3.5l2.5 1.5" />
                    </svg>
                  </div>
                  <div>
                    <div className="dfl-step-one-data-label">Est. Arrival</div>
                    <div className="dfl-step-one-data-value">~{estArrivalMin} min</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dfl-step-one-data-block">
              <div className="dfl-step-one-data-row">
                <div className="dfl-step-one-data-left">
                  <div className="dfl-step-one-data-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1" />
                      <path d="M4 8h5M4 6h3" />
                    </svg>
                  </div>
                  <div>
                    <div className="dfl-step-one-data-label">Estimated Pay</div>
                    <div className="dfl-step-one-pay-value">${typeof estimatedPay === 'number' ? estimatedPay.toFixed(2) : '0.00'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ height: 20 }} />
          </div>

          <div className="dfl-step-one-footer">
            <button type="button" className="dfl-step-one-cta" onClick={onArrived} data-testid="arrived-at-restaurant-button">
              <span>Arrived at Craven Kitchen</span>
              <div className="dfl-step-one-cta-arrow" />
            </button>
          </div>
        </div>
      </div>
    </Box>
  );
};
