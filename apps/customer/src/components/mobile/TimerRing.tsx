/**
 * Crave'n Timer Ring — Canvas Implementation
 * Enterprise-grade animated countdown ring with leading-edge bead
 * Spec: 68×68px canvas, 60fps animation, precise shadow rendering
 */

import React, { useRef, useEffect } from 'react';

interface TimerRingProps {
  timeLeft: number;      // seconds remaining
  totalSeconds: number;  // original timeout value
}

export const TimerRing: React.FC<TimerRingProps> = ({ timeLeft, totalSeconds }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Constants
    const cx = 34;
    const cy = 34;
    const R = 24;
    const pct = Math.max(0, Math.min(1, timeLeft / totalSeconds));
    const urgent = pct <= 0.3;
    const arcColor = urgent ? '#DC2626' : '#E8652A';

    // Animation loop
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, 68, 68);

      // ── 1. Track ────────────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = '#ECECEC';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── 2. Progress arc ─────────────────────────────────────
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (pct * Math.PI * 2);

      if (pct > 0.01) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = arcColor;
        ctx.beginPath();
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();

        // ── 3. Leading-edge bead ──────────────────────────────
        const tipX = cx + Math.cos(endAngle) * R;
        const tipY = cy + Math.sin(endAngle) * R;

        // White outer ring (with soft shadow for lift)
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Colored inner dot
        ctx.fillStyle = arcColor;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 4. Center time text ─────────────────────────────────
      const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const ss = String(timeLeft % 60).padStart(2, '0');

      ctx.save();
      ctx.fillStyle = urgent ? '#DC2626' : '#1A1A1A';
      ctx.font = '600 15px -apple-system, SF Pro Text, Helvetica Neue, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${mm}:${ss}`, cx, cy + 0.5);
      ctx.restore();

      animationIdRef.current = requestAnimationFrame(render);
    };

    // Start animation loop
    animationIdRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [timeLeft, totalSeconds]);

  return (
    <canvas
      ref={canvasRef}
      width={68}
      height={68}
      style={{
        display: 'block',
        width: '68px',
        height: '68px',
      }}
    />
  );
};

