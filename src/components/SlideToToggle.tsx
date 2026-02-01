/**
 * SlideToToggle Component
 * Enterprise-grade slide-to-toggle control (100px width)
 */

import React, { useState, useRef } from 'react';

type SlideToToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

const C = {
  orange: "#F57C00",
  text: "rgba(0,0,0,0.45)",
  muted: "#777777",
  trackIdle: "#ECECEC",
  trackDisabled: "#F4F4F4",
  border: "#E2E2E2",
  thumbBorder: "#E5E5E5",
  thumbBg: "#FFFFFF",
} as const;

const SlideToToggle: React.FC<SlideToToggleProps> = ({
  checked,
  onChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const trackRef = useRef<HTMLButtonElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);

  const trackWidth = 100;
  const thumbSize = 32;
  const padding = 4;
  const maxX = trackWidth - thumbSize - padding * 2;

  // Initialize position based on checked state
  React.useEffect(() => {
    if (!isDragging) {
      setTranslateX(checked ? maxX : 0);
    }
  }, [checked, isDragging, maxX]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startXRef.current = e.clientX;
    const currentX = checked ? maxX : 0;
    setTranslateX(currentX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || !trackRef.current || !thumbRef.current) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - startXRef.current;
      const baseX = checked ? maxX : 0;
      let newTranslateX = baseX + deltaX;
      newTranslateX = Math.max(0, Math.min(maxX, newTranslateX));
      setTranslateX(newTranslateX);
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsDragging(false);

    // Determine if we should toggle
    const threshold = maxX * 0.5; // 50% threshold
    const shouldToggle = checked ? translateX < threshold : translateX > threshold;

    if (shouldToggle) {
      onChange(!checked);
    } else {
      // Snap back to current state
      setTranslateX(checked ? maxX : 0);
    }
  };

  const progressWidth = translateX + thumbSize / 2 + padding;
  const fillColor = checked ? C.orange : C.trackIdle;

  return (
    <button
      ref={trackRef}
      role="switch"
      aria-checked={checked}
      aria-label={checked ? 'Enabled' : 'Disabled'}
      tabIndex={disabled ? -1 : 0}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      style={{
        position: 'relative',
        width: trackWidth,
        height: 40,
        borderRadius: 999,
        background: disabled ? C.trackDisabled : C.trackIdle,
        border: `1px solid ${C.border}`,
        padding: padding,
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
        transition: isDragging ? 'none' : 'background 0.2s ease',
      }}
    >
      {/* Progress Fill */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progressWidth}px`,
          background: fillColor,
          borderRadius: 999,
          transition: isDragging ? 'none' : 'width 0.18s ease-out',
          zIndex: 1,
        }}
      />

      {/* Thumb */}
      <div
        ref={thumbRef}
        style={{
          position: 'absolute',
          left: padding,
          width: thumbSize,
          height: thumbSize,
          borderRadius: '50%',
          background: C.thumbBg,
          border: `1px solid ${C.thumbBorder}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.18s ease-out',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {checked ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
    </button>
  );
};

export default SlideToToggle;

