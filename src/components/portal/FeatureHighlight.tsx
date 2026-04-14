import React, { useState, useRef, useEffect } from 'react';
import { IconInfoCircle, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FeatureHighlightProps {
  active: boolean;
  title: string;
  description: string;
  onDismiss: () => void;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function FeatureHighlight({
  active,
  title,
  description,
  onDismiss,
  children,
  position = 'right',
}: FeatureHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-show tooltip after a short delay when active
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setShowTooltip(true), 800);
    return () => clearTimeout(timer);
  }, [active]);

  // Close on outside click
  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        handleDismiss();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTooltip]);

  const handleDismiss = () => {
    setShowTooltip(false);
    onDismiss();
  };

  if (!active) return <>{children}</>;

  const tooltipPositionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground border-y-transparent border-l-transparent',
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {/* Glow ring */}
      <div
        className="relative cursor-pointer"
        onClick={() => {
          if (showTooltip) {
            handleDismiss();
          } else {
            setShowTooltip(true);
          }
        }}
      >
        <div className="feature-highlight-glow rounded-lg">
          {children}
        </div>
      </div>

      {/* Info tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-[9999] animate-scale-in',
            tooltipPositionClasses[position]
          )}
        >
          {/* Arrow */}
          <div className={cn('absolute h-0 w-0 border-[6px]', arrowClasses[position])} />

          <div
            className="w-64 rounded-lg border border-border bg-foreground p-3 text-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <IconInfoCircle size={14} className="flex-shrink-0 text-primary" />
                <span className="text-xs font-bold">{title}</span>
              </div>
              <button
                onClick={handleDismiss}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-background/60 transition-colors hover:text-background"
              >
                <IconX size={12} />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-background/80">{description}</p>
            <button
              onClick={handleDismiss}
              className="mt-2 w-full rounded-md bg-primary/90 px-2 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        .feature-highlight-glow {
          animation: featureGlow 2s ease-in-out infinite;
          position: relative;
        }
        .feature-highlight-glow::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 10px;
          background: linear-gradient(45deg, hsl(var(--primary)), hsl(var(--primary) / 0.4), hsl(var(--primary)));
          background-size: 200% 200%;
          animation: featureGlowBorder 2s ease-in-out infinite;
          z-index: -1;
          opacity: 0.7;
        }
        @keyframes featureGlow {
          0%, 100% { box-shadow: 0 0 8px 2px hsl(var(--primary) / 0.3); }
          50% { box-shadow: 0 0 16px 6px hsl(var(--primary) / 0.5); }
        }
        @keyframes featureGlowBorder {
          0% { background-position: 0% 50%; opacity: 0.5; }
          50% { background-position: 100% 50%; opacity: 0.8; }
          100% { background-position: 0% 50%; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
