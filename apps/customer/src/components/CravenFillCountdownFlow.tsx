import React, { useEffect, useMemo, useState } from "react";

/**
 * CravenFillCountdownFlow
 * ---------------------------------
 * Animated countdown that fills the Crave'n "C with bite marks" PNG
 * with a moving gradient, synced to the numeric timer in the center.
 *
 * ✅ No SVG path required — uses the PNG as a mask (works with your exact logo).
 *
 * Props:
 *  - duration (number): total seconds to count down (default 30)
 *  - size (number): square size in px (default 160)
 *  - logoPng (string): path to your PNG logo asset (required)
 *
 * Example:
 *  <CravenFillCountdownFlow
 *     duration={30}
 *     size={200}
 *     logoPng="/src/assets/craven-c-logo.png"
 *  />
 */

const CravenFillCountdownFlow = ({
  duration = 30,
  size = 160,
  logoPng = "/crave-c-logo.png",
}) => {
  const [progress, setProgress] = useState(0); // 0→1
  const [timeLeft, setTimeLeft] = useState(duration);

  // Drive the countdown + fill percentage
  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (t) => {
      const elapsed = (t - start) / 1000;
      const ratio = Math.min(elapsed / duration, 1);
      setProgress(ratio);
      setTimeLeft(Math.max(Math.ceil(duration - elapsed), 0));
      if (ratio < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  // Height of the fill (from bottom up)
  const fillHeight = useMemo(() => `${Math.round(progress * 100)}%`, [progress]);

  // Styles shared by -webkit-mask and mask for cross-browser (Safari/iOS included)
  const maskStyles = useMemo(
    () => ({
      WebkitMaskImage: `url(${logoPng})`,
      maskImage: `url(${logoPng})`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }),
    [logoPng]
  );

  // Debug logging
  console.log('CravenFillCountdownFlow props:', { duration, size, logoPng, progress, timeLeft });

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Base grey logo - always visible */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={logoPng} 
          alt="Crave'n C Logo" 
          className="w-full h-full object-contain filter grayscale brightness-50"
          onLoad={() => console.log('Base logo loaded successfully')}
          onError={(e) => console.error('Base logo failed to load:', e)}
        />
      </div>

      {/* Animated fill - drains from top to bottom (empties down) */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ 
          clipPath: `inset(${progress * 100}% 0 0 0)`,
          WebkitMaskImage: `url(${logoPng})`,
          maskImage: `url(${logoPng})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center"
        }}
      >
        {/* Moving gradient background with subtle top edge fade */}
        <div
          className="absolute inset-0 animate-cravenFlow"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(255,122,51,0.1) 1%, rgba(255,122,51,0.4) 3%, rgba(255,122,51,0.7) 5%, #ff7a33 8%, #ff4f00 35%, #d93c00 70%, #ff7a33 95%, transparent 100%)",
            backgroundSize: "100% 200%",
            backgroundPositionY: "0%",
            filter: "blur(1px) drop-shadow(0 0 8px rgba(255,79,0,0.35))",
          }}
        />
      </div>

      {/* CENTER TIMER */}
      <div className="absolute text-black font-bold drop-shadow-md z-10"
           style={{ fontSize: Math.max(12, size * 0.12) }}>
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </div>

      {/* Local CSS for the flowing gradient animation */}
      <style>{`
        @keyframes cravenFlow {
          0%   { background-position-y: 0%;   }
          50%  { background-position-y: 100%; }
          100% { background-position-y: 0%;   }
        }
        .animate-cravenFlow {
          animation: cravenFlow 2.25s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CravenFillCountdownFlow;
