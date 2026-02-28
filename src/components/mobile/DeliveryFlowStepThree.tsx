/**
 * Step three (en route to customer) – Mapbox map + bottom sheet, same design as steps one and two.
 * Status "En Route to Customer", step 3 of 3, customer address, special instructions, estimated pay, CTA.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import { IconNavigation, IconHome, IconBell, IconPhone, IconMessage } from '@tabler/icons-react';
import { StepOneMap } from './StepOneMap';
import SlideToConfirm from '@/components/SlideToConfirm';

const STEP_THREE_CSS = `
  .dfl-step-three-root { font-family: 'DM Sans', sans-serif; }
  .dfl-step-three-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
    height: calc(100% - 60px);
    transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform; touch-action: none;
  }
  .dfl-step-three-sheet.dragging { transition: none; }
  .dfl-step-three-sheet-inner {
    position: absolute; inset: 0;
    background: #ffffff;
    border-radius: 20px 20px 0 0;
    border-top: 1px solid rgba(28,28,30,0.09);
    border-left: 1px solid rgba(28,28,30,0.09);
    border-right: 1px solid rgba(28,28,30,0.09);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 -8px 48px rgba(28,28,30,0.10);
  }
  .dfl-step-three-handle {
    flex-shrink: 0; padding: 12px 0 8px;
    display: flex; justify-content: center; cursor: grab;
    touch-action: none; user-select: none;
  }
  .dfl-step-three-handle:active { cursor: grabbing; }
  .dfl-step-three-handle-pill {
    width: 36px; height: 4px; background: rgba(28,28,30,0.15); border-radius: 2px;
  }
  .dfl-step-three-status-bar {
    flex-shrink: 0; padding: 10px 20px 12px;
    border-bottom: 1px solid rgba(28,28,30,0.09);
    display: flex; align-items: center; justify-content: space-between;
  }
  .dfl-step-three-status-dot-wrap {
    width: 20px; height: 20px; border: 1px solid rgba(28,28,30,0.09);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .dfl-step-three-status-dot {
    width: 6px; height: 6px; background: #f26419; border-radius: 50%;
    animation: dfl-blink3 2.4s ease-in-out infinite;
  }
  @keyframes dfl-blink3 {
    0%, 100% { opacity: 1; } 50% { opacity: 0.25; }
  }
  .dfl-step-three-status-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(28,28,30,0.5); margin-bottom: 1px;
  }
  .dfl-step-three-status-name { font-size: 13px; font-weight: 500; color: #1c1c1e; }
  .dfl-step-three-dist-chip {
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
    color: #f26419; background: #fff4ed; border: 1px solid rgba(242,100,25,0.2);
    border-radius: 6px; padding: 5px 11px;
  }
  .dfl-step-three-body {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; padding: 20px 20px 0;
  }
  .dfl-step-three-body::-webkit-scrollbar { display: none; }
  .dfl-step-three-steps { display: flex; align-items: center; gap: 5px; margin-bottom: 18px; }
  .dfl-step-three-step { height: 3px; width: 22px; border-radius: 2px; background: rgba(28,28,30,0.15); }
  .dfl-step-three-step.done { background: #22a06b; }
  .dfl-step-three-step.active { background: #f26419; }
  .dfl-step-three-step-lbl {
    font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(28,28,30,0.5);
    letter-spacing: 0.1em; margin-left: 4px;
  }
  .dfl-step-three-customer-line {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.13em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 5px;
  }
  .dfl-step-three-order-row {
    display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px;
  }
  .dfl-step-three-order-num {
    font-size: 28px; font-weight: 300; color: #1c1c1e; letter-spacing: -0.02em;
  }
  .dfl-step-three-order-tag {
    font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.13em;
    text-transform: uppercase; border: 1px solid rgba(28,28,30,0.09);
    background: rgba(28,28,30,0.06); border-radius: 4px;
    color: rgba(28,28,30,0.5); padding: 4px 9px;
  }
  .dfl-step-three-data-block {
    border: 1px solid rgba(28,28,30,0.09); border-radius: 12px;
    margin-bottom: 10px; overflow: hidden; background: #fafafa;
  }
  .dfl-step-three-data-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid rgba(28,28,30,0.09);
  }
  .dfl-step-three-data-row:last-child { border-bottom: none; }
  .dfl-step-three-data-left { display: flex; align-items: center; gap: 12px; }
  .dfl-step-three-data-icon {
    width: 16px; height: 16px; color: rgba(28,28,30,0.5);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  }
  .dfl-step-three-data-label {
    font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(28,28,30,0.5); margin-bottom: 3px;
  }
  .dfl-step-three-data-value { font-size: 13px; color: #1c1c1e; font-weight: 400; }
  .dfl-step-three-pay-value {
    font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500;
    color: #1c1c1e; letter-spacing: -0.01em;
  }
  .dfl-step-three-nav-btn {
    display: flex; align-items: center; gap: 7px; border: none;
    background: #f26419; color: white; font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 9px 14px; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-three-nav-btn:active { opacity: 0.8; }
  .dfl-step-three-instruction-actions {
    display: flex; align-items: center; gap: 8px;
  }
  .dfl-step-three-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: 1px solid rgba(28,28,30,0.15);
    background: white; border-radius: 8px; cursor: pointer;
    color: rgba(28,28,30,0.6); -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-three-icon-btn:active { opacity: 0.8; }
  .dfl-step-three-contact-actions { display: flex; align-items: center; gap: 8px; }
  .dfl-step-three-contact-btn {
    display: flex; align-items: center; gap: 6px; border: none;
    background: #f26419; color: white; font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 8px 12px; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .dfl-step-three-contact-btn:active { opacity: 0.8; }
  .dfl-step-three-footer {
    flex-shrink: 0; padding: 14px 20px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 16px));
    border-top: 1px solid rgba(28,28,30,0.09); background: #ffffff;
  }
  .dfl-step-three-cta {
    width: 100%; background: #f26419; color: white; border: none;
    padding: 17px 24px; border-radius: 14px; font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; letter-spacing: 0.01em; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    -webkit-tap-highlight-color: transparent; transition: opacity 0.15s;
    box-shadow: 0 4px 20px rgba(242,100,25,0.28);
  }
  .dfl-step-three-cta:active { opacity: 0.85; }
  .dfl-step-three-cta-arrow {
    width: 18px; height: 1px; background: rgba(255,255,255,0.5); position: relative;
  }
  .dfl-step-three-cta-arrow::after {
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

export interface DeliveryFlowStepThreeProps {
  customerName: string;
  customerAddress: string;
  customerLat?: number;
  customerLng?: number;
  orderNumber: string;
  isTestOrder: boolean;
  estimatedPay: number;
  distanceMi: number;
  deliveryNotes?: string;
  /** Customer phone for contact. When set, Call and Message actions are shown. */
  customerPhone?: string;
  /** e.g. "Head to your stop" – shown when provided; no step/readiness line in that case. */
  headlineLabel?: string;
  /** Deliver-by time e.g. "9:55 AM" – shown with headline when provided. */
  deliveryByTime?: string;
  /** When true, footer shows Slide to confirm "I am here" instead of Arrived button. */
  useSlideToConfirm?: boolean;
  onNavigate: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onSpeakInstructions?: () => void;
  onCopyInstructions?: () => void;
  onArrived: () => void;
}

export const DeliveryFlowStepThree: React.FC<DeliveryFlowStepThreeProps> = ({
  customerName,
  customerAddress,
  customerLat,
  customerLng,
  orderNumber,
  isTestOrder,
  estimatedPay,
  distanceMi,
  deliveryNotes,
  customerPhone,
  headlineLabel,
  deliveryByTime,
  useSlideToConfirm,
  onNavigate,
  onCall,
  onMessage,
  onSpeakInstructions,
  onCopyInstructions,
  onArrived,
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

  const customerShort = customerName ? (customerName.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'C.') : 'C.';
  const distStr = distanceMi <= 0 ? '5.1' : distanceMi.toFixed(1);

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
    draggingRef.current = false;
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
      className="dfl-step-three-root"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#e8e4dc',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style>{STEP_THREE_CSS}</style>
      <Box style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
        <StepOneMap
          destinationLat={customerLat}
          destinationLng={customerLng}
          destinationAddress={customerAddress}
          destinationName={customerName}
          className="w-full h-full"
        />
      </Box>
      <div
        ref={sheetRef}
        className={`dfl-step-three-sheet ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateY(${sheetTranslatePct}%)`, pointerEvents: 'auto' }}
      >
        <div className="dfl-step-three-sheet-inner">
          <div className="dfl-step-three-handle" onPointerDown={handlePointerDown}>
            <div className="dfl-step-three-handle-pill" />
          </div>

          <div className="dfl-step-three-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="dfl-step-three-status-dot-wrap">
                <div className="dfl-step-three-status-dot" />
              </div>
              <div>
                {headlineLabel ? (
                  <>
                    <div className="dfl-step-three-status-eyebrow">{headlineLabel}</div>
                    {deliveryByTime && (
                      <div className="dfl-step-three-status-name">Deliver by {deliveryByTime}</div>
                    )}
                    {!deliveryByTime && (
                      <div className="dfl-step-three-status-name">{customerName}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="dfl-step-three-status-eyebrow">En Route to Customer</div>
                    <div className="dfl-step-three-status-name">{customerName}</div>
                  </>
                )}
              </div>
            </div>
            <div className="dfl-step-three-dist-chip">{distStr} MI</div>
          </div>

          <div ref={bodyRef} className="dfl-step-three-body" style={{ overflowY: 'auto' }}>
            {!headlineLabel && (
              <div className="dfl-step-three-steps">
                <div className="dfl-step-three-step done" />
                <div className="dfl-step-three-step done" />
                <div className="dfl-step-three-step active" />
                <span className="dfl-step-three-step-lbl">Step 3 of 3</span>
              </div>
            )}

            <div className="dfl-step-three-customer-line">Customer · {customerShort}</div>
            <div className="dfl-step-three-order-row">
              <div className="dfl-step-three-order-num">Order #{orderNumber}</div>
              <div className="dfl-step-three-order-tag">{isTestOrder ? 'Test Order' : 'Order'}</div>
            </div>

            <div className="dfl-step-three-data-block">
              <div className="dfl-step-three-data-row">
                <div className="dfl-step-three-data-left">
                  <div className="dfl-step-three-data-icon">
                    <IconHome size={16} stroke={1.4} />
                  </div>
                  <div>
                    <div className="dfl-step-three-data-label">Customer Address</div>
                    <div className="dfl-step-three-data-value">{customerAddress}</div>
                  </div>
                </div>
                <button type="button" className="dfl-step-three-nav-btn" onClick={onNavigate}>
                  <IconNavigation size={11} stroke={1.5} />
                  Navigate
                </button>
              </div>
            </div>

            {(customerPhone || onCall || onMessage) && (
              <div className="dfl-step-three-data-block">
                <div className="dfl-step-three-data-row">
                  <div className="dfl-step-three-data-left">
                    <div className="dfl-step-three-data-icon">
                      <IconPhone size={16} stroke={1.4} />
                    </div>
                    <div>
                      <div className="dfl-step-three-data-label">Contact Customer</div>
                      <div className="dfl-step-three-data-value">{customerPhone || '—'}</div>
                    </div>
                  </div>
                  <div className="dfl-step-three-contact-actions">
                    {onCall && (
                      <button type="button" className="dfl-step-three-contact-btn" onClick={onCall} title="Call">
                        <IconPhone size={12} stroke={2} />
                        Call
                      </button>
                    )}
                    {onMessage && (
                      <button type="button" className="dfl-step-three-contact-btn" onClick={onMessage} title="Message">
                        <IconMessage size={12} stroke={2} />
                        Message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {deliveryNotes && (
              <div className="dfl-step-three-data-block">
                <div className="dfl-step-three-data-row">
                  <div className="dfl-step-three-data-left">
                    <div className="dfl-step-three-data-icon">
                      <IconBell size={16} stroke={1.4} />
                    </div>
                    <div>
                      <div className="dfl-step-three-data-label">Special Instructions</div>
                      <div className="dfl-step-three-data-value">{deliveryNotes}</div>
                    </div>
                  </div>
                  <div className="dfl-step-three-instruction-actions" style={{ gap: 8 }}>
                    {onSpeakInstructions && (
                      <button
                        type="button"
                        className="dfl-step-three-icon-btn"
                        onClick={onSpeakInstructions}
                        title="Read out loud"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      </button>
                    )}
                    {onCopyInstructions && (
                      <button
                        type="button"
                        className="dfl-step-three-icon-btn"
                        onClick={onCopyInstructions}
                        title="Copy"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="dfl-step-three-data-block">
              <div className="dfl-step-three-data-row">
                <div className="dfl-step-three-data-left">
                  <div className="dfl-step-three-data-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1" />
                      <path d="M4 8h5M4 6h3" />
                    </svg>
                  </div>
                  <div>
                    <div className="dfl-step-three-data-label">Estimated Pay</div>
                    <div className="dfl-step-three-pay-value">${typeof estimatedPay === 'number' ? estimatedPay.toFixed(2) : '0.00'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ height: 20 }} />
          </div>

          <div className="dfl-step-three-footer">
            {useSlideToConfirm ? (
              <>
                <div style={{ fontSize: 12, color: 'rgba(28,28,30,0.6)', marginBottom: 10, textAlign: 'center' }}>
                  When you arrive at the customer&apos;s home, close GPS and slide to confirm.
                </div>
                <SlideToConfirm label="I am here" onConfirm={onArrived} />
              </>
            ) : (
              <button
                type="button"
                className="dfl-step-three-cta"
                onClick={onArrived}
                data-testid="arrived-at-customer-button"
              >
                <span>Arrived at Customer&apos;s Location</span>
                <div className="dfl-step-three-cta-arrow" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Box>
  );
};
