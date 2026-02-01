/**
 * SlideToConfirm Component
 * Enterprise-grade slide-to-confirm control for mobile and desktop
 */

import React, { useState, useRef } from 'react';

type SlideToConfirmProps = {
  label?: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  resetAfterConfirmMs?: number;
};

const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label = "Slide to confirm",
  onConfirm,
  disabled = false,
  loading = false,
  resetAfterConfirmMs = 800,
}) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  const isActive = disabled || loading || isInternalLoading;

  // Calculate max drag distance
  const getMaxX = () => {
    if (!trackRef.current || !thumbRef.current) return 0;
    const trackWidth = trackRef.current.offsetWidth;
    const thumbWidth = thumbRef.current.offsetWidth;
    const padding = 6;
    return trackWidth - thumbWidth - padding * 2;
  };

  const getProgress = () => {
    const maxX = getMaxX();
    if (maxX === 0) return 0;
    return Math.min(100, (dragX / maxX) * 100);
  };

  const shouldConfirm = () => {
    return getProgress() >= 92;
  };

  const reset = () => {
    setDragX(0);
    setIsDragging(false);
    setIsConfirmed(false);
    currentXRef.current = 0;
  };

  const handleConfirm = async () => {
    setIsConfirmed(true);
    setIsInternalLoading(true);
    
    try {
      await onConfirm();
    } catch (error) {
      console.error('SlideToConfirm error:', error);
    } finally {
      setIsInternalLoading(false);
      setTimeout(() => {
        reset();
      }, resetAfterConfirmMs);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isActive || isConfirmed) return;
    
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX - dragX;
    
    if (trackRef.current) {
      trackRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isActive || isConfirmed) return;

    const maxX = getMaxX();
    const newX = e.clientX - startXRef.current;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    
    currentXRef.current = clampedX;
    setDragX(clampedX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || isActive || isConfirmed) return;

    setIsDragging(false);
    
    if (trackRef.current) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }

    if (shouldConfirm()) {
      handleConfirm();
    } else {
      // Snap back
      reset();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showHint) {
      e.preventDefault();
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }
  };

  const progress = getProgress();
  const fillColor = "#F57C00"; // Crave'n orange (spec)
  const trackBg = disabled ? "#F4F4F4" : "#ECECEC";
  const labelColor = disabled ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.45)";
  const labelOpacity = Math.max(0, 1 - progress / 50); // Fade as thumb passes

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Slide to confirm"
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: 52,
        borderRadius: 999,
        background: trackBg,
        border: '1px solid #E2E2E2',
        padding: 6,
        cursor: isActive ? 'not-allowed' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Progress fill */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          background: fillColor,
          borderRadius: 999,
          transition: isDragging ? 'none' : 'width 150ms ease-out',
        }}
      />

      {/* Label text */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: labelColor,
          opacity: labelOpacity,
          transition: 'opacity 100ms ease',
        }}
      >
        {isConfirmed ? 'Confirmed' : label}
      </div>

      {/* Hint text (keyboard) */}
      {showHint && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -28,
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(0,0,0,0.5)',
            fontStyle: 'italic',
          }}
        >
          Drag to confirm
        </div>
      )}

      {/* Thumb */}
      <div
        ref={thumbRef}
        style={{
          position: 'absolute',
          left: 6 + dragX,
          top: 6,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '1px solid #E5E5E5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isActive ? 'not-allowed' : 'grab',
          transition: isDragging ? 'none' : 'left 150ms ease-out',
          zIndex: 1,
        }}
      >
        {isInternalLoading || loading ? (
          <svg width={16} height={16} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke={fillColor} strokeWidth="2" fill="none" strokeDasharray="47.124" strokeDashoffset="23.562" strokeLinecap="round" opacity="0.6" />
          </svg>
        ) : isConfirmed ? (
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={fillColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12,5 19,12 12,19" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default SlideToConfirm;

