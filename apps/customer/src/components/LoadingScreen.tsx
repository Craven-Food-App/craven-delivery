import React, { useEffect, useState } from 'react';
import { Box } from '@mantine/core';
import cravenCLogo from '@/assets/craven-c-new.png';

const STYLE_ID = 'craven-editorial-splash';

/**
 * Concept C — Editorial mark splash.
 * Quiet white field, oversized C, wordmark, thin progress line.
 * Complements the Crave Wheel nav (same C asset, same orange).
 */
const LoadingScreen: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .craven-splash-root {
        position: fixed;
        inset: 0;
        width: 100%;
        max-width: 430px;
        margin: 0 auto;
        min-height: 100vh;
        min-height: 100dvh;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        overflow: hidden;
        padding: max(24px, env(safe-area-inset-top)) 32px max(32px, env(safe-area-inset-bottom));
        box-sizing: border-box;
      }

      .craven-splash-atmosphere {
        position: absolute;
        inset: 0;
        background: radial-gradient(
          ellipse 80% 50% at 50% 42%,
          rgba(255, 107, 53, 0.04) 0%,
          transparent 70%
        );
        pointer-events: none;
      }

      @keyframes craven-splash-enter {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes craven-splash-progress {
        0% {
          transform: scaleX(0);
          transform-origin: left center;
        }
        100% {
          transform: scaleX(1);
          transform-origin: left center;
        }
      }

      .craven-splash-mark {
        position: relative;
        width: min(42vw, 168px);
        height: min(42vw, 168px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: craven-splash-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .craven-splash-mark img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .craven-splash-wordmark {
        margin-top: 28px;
        font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #141210;
        line-height: 1;
        animation: craven-splash-enter 520ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
      }

      .craven-splash-track {
        margin-top: 36px;
        width: 72px;
        height: 2px;
        border-radius: 1px;
        background: #e8e6e3;
        overflow: hidden;
        position: relative;
        animation: craven-splash-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) 140ms both;
      }

      .craven-splash-bar {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border-radius: 1px;
        background: #ff6b35;
        animation: craven-splash-progress 1.85s cubic-bezier(0.4, 0, 0.2, 1) 200ms both;
      }

      .craven-splash-bar.is-static {
        animation: none;
        width: 40%;
        transform: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .craven-splash-mark,
        .craven-splash-wordmark,
        .craven-splash-track,
        .craven-splash-bar {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
        .craven-splash-bar {
          width: 40%;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return (
    <Box className="craven-splash-root" role="status" aria-live="polite" aria-label="Loading Crave'n">
      <Box className="craven-splash-atmosphere" aria-hidden />

      <Box className="craven-splash-mark">
        <img src={cravenCLogo} alt="" width={168} height={168} decoding="async" />
      </Box>

      <Box className="craven-splash-wordmark">Crave&apos;n</Box>

      <Box className="craven-splash-track">
        <Box className={`craven-splash-bar${reducedMotion ? ' is-static' : ''}`} />
      </Box>
    </Box>
  );
};

export default LoadingScreen;
