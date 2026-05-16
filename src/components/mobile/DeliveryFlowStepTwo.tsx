/**
 * Step two (awaiting hand-off at store) – Mapbox map + bottom sheet with order items to confirm.
 * Same design system as step one: status bar, step 2 of 3, address, checkable items, Confirm Pickup CTA.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import { IconMapPin, IconNavigation } from '@tabler/icons-react';
import { StepOneMap } from './StepOneMap';

const STEP_TWO_CSS = `
  .dfl-step-two-root { font-family: 'DM Sans', sans-serif; }
  .dfl-step-two-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
    height: calc(100% - 60px);
    transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform; touch-action: none;
  }
  .dfl-step-two-sheet.dragging { transition: none; }
  .dfl-step-two-sheet-inner {
    position: absolute; inset: 0;
    background: #ffffff;
    border-radius: 20px 20px 0 0;
    border-top: 1px solid rgba(28,28,30,0.09);
    border-left: 1px solid rgba(28,28,30,0.09);
    border-right: 1px solid rgba(28,28,30,0.09);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 -8px 48px rgba(28,28,30,0.10);
  }
  .dfl-step-two-handle {
    flex-shrink: 0; padding: 16px 0 12px;
    display: flex; justify-content: center; cursor: grab;
    touch-action: none; user-select: none;
    -webkit-user-select: none;
  }
  .dfl-step-two-handle:active { cursor: grabbing; }
  .dfl-step-two-handle-pill {
    width: 36px; height: 4px; background: rgba(28,28,30,0.15); border-radius: 2px;
  }
  .dfl-step-two-status-bar {
    flex-shrink: 0; padding: 10px 20px 12px;
    border-bottom: 1px solid rgba(28,28,30,0.09);
    display: flex; align-items: center; justify-content: space-between;
  }
  .dfl-step-two-status-dot-wrap {
    width: 20px; height: 20px; border: 1px solid rgba(28,28,30,0.09);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .dfl-step-two-status-dot {
    width: 6px; height: 6px; background: #f26419; border-radius: 50%;
    animation: dfl-blink2 2.4s ease-in-out infinite;
  }
  @keyframes dfl-blink2 {
    0%, 100% { opacity: 1; } 50% { opacity: 0.25; }
  }
  .dfl-step-two-status-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(28,28,30,0.5); margin-bottom: 1px;
  }
  .dfl-step-two-status-name { font-size: 13px; font-weight: 500; color: #1c1c1e; }
  .dfl-step-two-dist-chip {
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
    color: #f26419; background: #fff7f2; border: 1px solid rgba(242,100,25,0.18);
    border-radius: 6px; padding: 5px 11px;
  }
  .dfl-step-two-body {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; padding: 20px 20px 0;
  }
  .dfl-step-two-body::-webkit-scrollbar { display: none; }
  .dfl-step-two-steps { display: flex; align-items: center; gap: 5px; margin-bottom: 18px; }
  .dfl-step-two-step { height: 3px; width: 22px; border-radius: 2px; background: rgba(28,28,30,0.15); }
  .dfl-step-two-step.done { background: #22a06b; }
  .dfl-step-two-step.active { background: #f26419; }
  .dfl-step-two-step-lbl {
    font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(28,28,30,0.5);
    letter-spacing: 0.1em; margin-left: 4px;
  }
  .dfl-step-two-customer-line {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.13em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 5px;
  }
  .dfl-step-two-order-row {
    display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px;
  }
  .dfl-step-two-order-num {
    font-size: 28px; font-weight: 300; color: #1c1c1e; letter-spacing: -0.02em;
  }
  .dfl-step-two-order-tag {
    font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.13em;
    text-transform: uppercase; border: 1px solid rgba(28,28,30,0.09);
    background: rgba(28,28,30,0.06); border-radius: 4px;
    color: rgba(28,28,30,0.5); padding: 4px 9px;
  }
  .dfl-step-two-address-block {
    border: 1px solid rgba(28,28,30,0.09); border-radius: 12px;
    margin-bottom: 12px; overflow: hidden; background: #fafafa;
  }
  .dfl-step-two-address-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px;
  }
  .dfl-step-two-address-left { display: flex; align-items: center; gap: 12px; }
  .dfl-step-two-addr-label {
    font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 3px;
  }
  .dfl-step-two-addr-value { font-size: 13px; color: #1c1c1e; }
  .dfl-step-two-nav-btn {
    display: flex; align-items: center; gap: 7px; border: none;
    background: #f26419; color: white; font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 9px 14px; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-two-nav-btn:active { opacity: 0.8; }
  .dfl-step-two-items-block {
    border: 1px solid rgba(28,28,30,0.09); border-radius: 12px;
    overflow: hidden; margin-bottom: 12px; background: #fafafa;
  }
  .dfl-step-two-items-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid rgba(28,28,30,0.09);
  }
  .dfl-step-two-items-title {
    font-size: 13px; font-weight: 600; color: #1c1c1e;
    display: flex; align-items: center; gap: 8px;
  }
  .dfl-step-two-items-count {
    font-family: 'DM Mono', monospace; font-size: 10px;
    color: rgba(28,28,30,0.5); letter-spacing: 0.06em;
  }
  .dfl-step-two-items-progress {
    font-family: 'DM Mono', monospace; font-size: 10px;
    color: #f26419; letter-spacing: 0.06em; transition: color 0.3s;
  }
  .dfl-step-two-items-progress.complete { color: #22a06b; }
  .dfl-step-two-item-row {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px; border-bottom: 1px solid rgba(28,28,30,0.09);
    transition: background 0.2s; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-two-item-row:last-child { border-bottom: none; }
  .dfl-step-two-item-row.checked { background: #f0faf5; }
  .dfl-step-two-item-check {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1.5px solid rgba(28,28,30,0.15); background: white;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: border-color 0.2s, background 0.2s;
  }
  .dfl-step-two-item-row.checked .dfl-step-two-item-check {
    border-color: #22a06b; background: #22a06b;
  }
  .dfl-step-two-check-tick {
    opacity: 0; transform: scale(0.4);
    transition: opacity 0.18s, transform 0.18s;
  }
  .dfl-step-two-item-row.checked .dfl-step-two-check-tick {
    opacity: 1; transform: scale(1);
  }
  .dfl-step-two-item-name {
    font-size: 13px; color: #1c1c1e; font-weight: 400; transition: color 0.2s;
  }
  .dfl-step-two-item-info { flex: 1; }
  .dfl-step-two-item-row.checked .dfl-step-two-item-name { color: #22a06b; }
  .dfl-step-two-item-sub {
    font-size: 11px; color: rgba(28,28,30,0.5); margin-top: 2px;
  }
  .dfl-step-two-item-qty {
    font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500;
    color: rgba(28,28,30,0.5); background: rgba(28,28,30,0.06);
    border: 1px solid rgba(28,28,30,0.09); border-radius: 5px;
    padding: 3px 8px; letter-spacing: 0.04em;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .dfl-step-two-item-row.checked .dfl-step-two-item-qty {
    background: rgba(34,160,107,0.1); color: #22a06b;
    border-color: rgba(34,160,107,0.2);
  }
  .dfl-step-two-pay-block {
    border: 1px solid rgba(28,28,30,0.09); border-radius: 12px;
    overflow: hidden; margin-bottom: 12px; background: #fafafa;
  }
  .dfl-step-two-pay-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px;
  }
  .dfl-step-two-pay-label {
    font-family: 'DM Mono', monospace; font-size: 9.5px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(28,28,30,0.5);
  }
  .dfl-step-two-pay-value {
    font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500;
    color: #1c1c1e; letter-spacing: -0.01em;
  }
  .dfl-step-two-footer {
    flex-shrink: 0; padding: 14px 20px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 16px));
    border-top: 1px solid rgba(28,28,30,0.09); background: #ffffff;
  }
  .dfl-step-two-cta {
    width: 100%; background: rgba(28,28,30,0.15); color: rgba(28,28,30,0.4);
    border: none; padding: 17px 24px; border-radius: 14px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    letter-spacing: 0.01em; cursor: default;
    display: flex; align-items: center; justify-content: space-between;
    transition: background 0.3s, color 0.3s, box-shadow 0.3s;
    -webkit-tap-highlight-color: transparent; pointer-events: none;
  }
  .dfl-step-two-cta.active {
    background: #f26419; color: white;
    box-shadow: 0 4px 20px rgba(242,100,25,0.28);
    cursor: pointer; pointer-events: auto;
  }
  .dfl-step-two-cta.active:active { opacity: 0.85; }
  .dfl-step-two-cta-hint {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; color: rgba(28,28,30,0.35);
    text-align: center; margin-top: 8px; transition: opacity 0.3s;
  }
  .dfl-step-two-cta-hint.hidden { opacity: 0; }
  .dfl-step-two-cta-arrow {
    width: 18px; height: 1px; background: rgba(255,255,255,0.5);
    position: relative; opacity: 0; transition: opacity 0.3s;
  }
  .dfl-step-two-cta.active .dfl-step-two-cta-arrow { opacity: 1; }
  .dfl-step-two-cta-arrow::after {
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

export interface OrderItemStepTwo {
  id: string;
  name: string;
  quantity: number;
  special_instructions?: string;
}

export interface DeliveryFlowStepTwoProps {
  restaurantName: string;
  pickupAddress: string;
  storeLat?: number;
  storeLng?: number;
  orderNumber: string;
  customerName: string;
  isTestOrder: boolean;
  estimatedPay: number;
  distanceMi: number;
  orderItems: OrderItemStepTwo[];
  checkedItemIds: Set<string>;
  onToggleItem: (itemId: string) => void;
  onNavigate: () => void;
  onConfirmPickup: () => void;
  /** When >1, this leg is part of a multi-stop batch — remind to verify each order at the store. */
  batchRouteStopCount?: number;
  cleanPaySlot?: React.ReactNode;
}

export const DeliveryFlowStepTwo: React.FC<DeliveryFlowStepTwoProps> = ({
  restaurantName,
  pickupAddress,
  storeLat,
  storeLng,
  orderNumber,
  customerName,
  isTestOrder,
  estimatedPay,
  distanceMi,
  orderItems,
  checkedItemIds,
  onToggleItem,
  onNavigate,
  onConfirmPickup,
  batchRouteStopCount,
  cleanPaySlot,
}) => {
  const [sheetTranslatePct, setSheetTranslatePct] = useState(SNAP_HALF);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startTranslateRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const draggingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const allChecked = orderItems.length > 0 && checkedItemIds.size === orderItems.length;
  const customerShort = customerName ? (customerName.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'C.') : 'C.';
  const distStr = distanceMi <= 0 ? '0.8' : distanceMi.toFixed(1);

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
    if (bodyRef.current) bodyRef.current.style.overflowY = 'auto';
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    draggingRef.current = true;
    const sheetEl = sheetRef.current;
    if (sheetEl) sheetEl.style.transition = 'none';
    startYRef.current = e.clientY;
    startTranslateRef.current = getTranslatePx();
    lastYRef.current = e.clientY;
    velocityRef.current = 0;

    const onDocMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      ev.preventDefault();
      velocityRef.current = ev.clientY - lastYRef.current;
      lastYRef.current = ev.clientY;
      const delta = ev.clientY - startYRef.current;
      const el = sheetRef.current;
      if (!el) return;
      const sheetH = el.offsetHeight;
      const newPx = Math.max(0, startTranslateRef.current + delta);
      const clamped = Math.min(newPx, sheetH * 0.85);
      el.style.transform = `translateY(${clamped}px)`;
    };
    const onDocUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.removeEventListener('pointermove', onDocMove);
      document.removeEventListener('pointerup', onDocUp);
      document.removeEventListener('pointercancel', onDocUp);
      const el = sheetRef.current;
      if (!el) return;
      const sheetH = el.offsetHeight;
      const currentPx = getTranslatePx();
      const currentPct = sheetH > 0 ? (currentPx / sheetH) * 100 : SNAP_HALF;
      const velocity = velocityRef.current;
      el.style.transition = 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)';
      if (velocity > 6) snapTo(currentPct > 65 ? SNAP_DOWN : SNAP_HALF);
      else if (velocity < -6) snapTo(currentPct < 30 ? SNAP_UP : SNAP_HALF);
      else {
        const snaps = [SNAP_UP, SNAP_HALF, SNAP_DOWN];
        const nearest = snaps.reduce((a, b) => Math.abs(a - currentPct) < Math.abs(b - currentPct) ? a : b);
        snapTo(nearest);
      }
    };

    document.addEventListener('pointermove', onDocMove, { passive: false });
    document.addEventListener('pointerup', onDocUp);
    document.addEventListener('pointercancel', onDocUp);
  }, [getTranslatePx, snapTo]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transform = `translateY(${sheetTranslatePct}%)`;
  }, [sheetTranslatePct]);

  return (
    <Box
      className="dfl-step-two-root"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#e8e4dc',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style>{STEP_TWO_CSS}</style>
      <Box style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
        <StepOneMap
          storeLat={storeLat}
          storeLng={storeLng}
          storeAddress={pickupAddress}
          storeName={restaurantName}
          className="w-full h-full"
        />
      </Box>
      <div
        ref={sheetRef}
        className={`dfl-step-two-sheet ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateY(${sheetTranslatePct}%)`, pointerEvents: 'auto' }}
      >
        <div className="dfl-step-two-sheet-inner">
          <div
            className="dfl-step-two-handle"
            onPointerDown={handlePointerDown}
          >
            <div className="dfl-step-two-handle-pill" />
          </div>

          <div className="dfl-step-two-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="dfl-step-two-status-dot-wrap">
                <div className="dfl-step-two-status-dot" />
              </div>
              <div>
                <div className="dfl-step-two-status-eyebrow">Awaiting Hand-off</div>
                <div className="dfl-step-two-status-name">{restaurantName}</div>
              </div>
            </div>
            <div className="dfl-step-two-dist-chip">{distStr} MI</div>
          </div>

          <div ref={bodyRef} className="dfl-step-two-body" style={{ overflowY: 'auto' }}>
            {batchRouteStopCount != null && batchRouteStopCount > 1 && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.12), rgba(220, 38, 38, 0.1))',
                  border: '1px solid rgba(234, 88, 12, 0.28)',
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: '#1c1c1e',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4, color: '#c2410c' }}>Multi-order batch</strong>
                Confirm <em>this</em> order’s items with the store before you leave. If the next leg is a different
                restaurant, the app will send you there to verify the next handoff before drop-offs.
              </div>
            )}
            <div className="dfl-step-two-steps">
              <div className="dfl-step-two-step done" />
              <div className="dfl-step-two-step active" />
              <div className="dfl-step-two-step" />
              <span className="dfl-step-two-step-lbl">Step 2 of 3</span>
            </div>

            <div className="dfl-step-two-customer-line">Customer · {customerShort}</div>
            <div className="dfl-step-two-order-row">
              <div className="dfl-step-two-order-num">Order #{orderNumber}</div>
              <div className="dfl-step-two-order-tag">{isTestOrder ? 'Test Order' : 'Order'}</div>
            </div>

            <div className="dfl-step-two-address-block">
              <div className="dfl-step-two-address-row">
                <div className="dfl-step-two-address-left">
                  <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(28,28,30,0.5)' }}>
                    <IconMapPin size={16} stroke={1.4} />
                  </div>
                  <div>
                    <div className="dfl-step-two-addr-label">Pickup Address</div>
                    <div className="dfl-step-two-addr-value">{pickupAddress}</div>
                  </div>
                </div>
                <button type="button" className="dfl-step-two-nav-btn" onClick={onNavigate}>
                  <IconNavigation size={11} stroke={1.5} />
                  Navigate
                </button>
              </div>
            </div>

            <div className="dfl-step-two-items-block">
              <div className="dfl-step-two-items-header">
                <div className="dfl-step-two-items-title">
                  Order Items
                  <span className="dfl-step-two-items-count">({orderItems.length})</span>
                </div>
                <div className={`dfl-step-two-items-progress ${allChecked ? 'complete' : ''}`}>
                  {checkedItemIds.size} / {orderItems.length} confirmed
                </div>
              </div>
              {orderItems.length > 0 ? (
                orderItems.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={`dfl-step-two-item-row ${checkedItemIds.has(item.id) ? 'checked' : ''}`}
                    onClick={() => onToggleItem(item.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleItem(item.id); } }}
                  >
                    <div className="dfl-step-two-item-check">
                      <svg className="dfl-step-two-check-tick" width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="dfl-step-two-item-info">
                      <div className="dfl-step-two-item-name">{item.name}</div>
                      {item.special_instructions && <div className="dfl-step-two-item-sub">{item.special_instructions}</div>}
                    </div>
                    <div className="dfl-step-two-item-qty">×{item.quantity}</div>
                  </div>
                ))
              ) : (
                <div className="dfl-step-two-address-row">
                  <div className="dfl-step-two-addr-value" style={{ padding: 12 }}>Loading items…</div>
                </div>
              )}
            </div>

            <div className="dfl-step-two-pay-block">
              <div className="dfl-step-two-pay-row">
                <div className="dfl-step-two-pay-label">Estimated Pay</div>
                <div className="dfl-step-two-pay-value">${typeof estimatedPay === 'number' ? estimatedPay.toFixed(2) : '0.00'}</div>
              </div>
            </div>
            {cleanPaySlot ? <div style={{ marginTop: 10 }}>{cleanPaySlot}</div> : null}
            <div style={{ height: 20 }} />
          </div>

          <div className="dfl-step-two-footer">
            <button
              type="button"
              className={`dfl-step-two-cta ${allChecked ? 'active' : ''}`}
              onClick={allChecked ? onConfirmPickup : undefined}
              data-testid="verify-pickup-button"
            >
              <span>{allChecked ? 'Confirm Pickup' : 'Confirm items first'}</span>
              <div className="dfl-step-two-cta-arrow" />
            </button>
            <div className={`dfl-step-two-cta-hint ${allChecked ? 'hidden' : ''}`}>CHECK ALL ITEMS TO CONTINUE</div>
          </div>
        </div>
      </div>
    </Box>
  );
};
