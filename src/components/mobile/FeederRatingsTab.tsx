/**
 * Crave'n Feeder App — Ratings Tab (Enterprise Compact White)
 * ────────────────────────────────────────────────────────────
 * Drop-in:  src/components/mobile/FeederRatingsTab.tsx
 *
 * Cursor instructions:
 *   1) Replace src/components/mobile/FeederRatingsTab.tsx with this file.
 *   2) Route / tab already points to <FeederRatingsTab /> — no change needed.
 *   3) No icons, no emojis, no gradients, no orange backgrounds.
 *   4) All layout is inline-style; no external CSS file required.
 *   5) Mock data lives in useMockRatings() — swap for your API call there.
 *   6) Progress bars animate fill on first mount (staggered 200ms ease-out).
 *   7) Info icon opens a bottom-sheet modal explaining how ratings work.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange:  "#F57C00",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  track:   "#EEEEEE",
  starOff: "#E5E5E5",
  bg:      "#FFFFFF",
  bgMuted: "#FAFBFD",
} as const;

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface PulseMetric {
  label: string;
  value: number; // 0–100
}

interface RatingRow {
  stars: number; // 5 down to 1
  count: number;
}

interface RatingsData {
  score:        number;   // e.g. 5.0
  totalFeeds:   number;
  pulse:        PulseMetric[];
  breakdown:    RatingRow[];
}

type FeederRatingsTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

// ─── MOCK DATA (replace with API) ───────────────────────────────────────────
function useMockRatings(): RatingsData {
  return useMemo(() => ({
    score:      5.0,
    totalFeeds: 0,
    pulse: [
      { label: "On-Time",     value: 0 },
      { label: "Accuracy",    value: 0 },
      { label: "Quality",     value: 0 },
      { label: "Satisfaction",value: 0 },
    ],
    breakdown: [
      { stars: 5, count: 0 },
      { stars: 4, count: 0 },
      { stars: 3, count: 0 },
      { stars: 2, count: 0 },
      { stars: 1, count: 0 },
    ],
  }), []);
}

// ─── TINY UTILS ─────────────────────────────────────────────────────────────
/** Max count in breakdown — used to size the bars. Returns 1 if all zero to avoid div/0. */
function maxCount(rows: RatingRow[]) {
  return Math.max(1, ...rows.map((r) => r.count));
}

// ─── SVG: STAR ──────────────────────────────────────────────────────────────
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? C.orange : C.starOff}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/** Renders a row of 5 stars, first `count` filled. */
function StarRow({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= count} size={size} />
      ))}
    </div>
  );
}

// ─── SVG: HAMBURGER ─────────────────────────────────────────────────────────
function HamburgerIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ─── SVG: INFO CIRCLE ───────────────────────────────────────────────────────
function InfoIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8"  x2="12.01" y2="8" />
    </svg>
  );
}

// ─── SVG: OUTLINE STAR (empty state) ────────────────────────────────────────
function OutlineStarIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d={STAR_PATH} />
    </svg>
  );
}

// ─── ANIMATED PROGRESS BAR ──────────────────────────────────────────────────
/**
 * 2px thin bar that animates from 0 → targetPct on mount.
 * `delay` (ms) lets you stagger rows.
 */
function ThinBar({ targetPct, delay = 0 }: { targetPct: number; delay?: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), delay + 60);
    return () => clearTimeout(t);
  }, [targetPct, delay]);

  return (
    <div style={{ flex: 1, height: 2, background: C.track, borderRadius: 1, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        background: C.orange,
        borderRadius: 1,
        width: `${width}%`,
        transition: "width 500ms cubic-bezier(.22,.61,0,1)",
      }} />
    </div>
  );
}

// ─── COMPONENT: TOP BAR ─────────────────────────────────────────────────────
function TopBar({ onMenuPress, onInfoPress }: { onMenuPress?: () => void; onInfoPress: () => void }) {
  return (
    <div style={{
      height: 56, background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px",
      borderBottom: `1px solid ${C.border}`,
      flexShrink: 0,
      position: 'sticky' as const, top: 0, zIndex: 10,
    }}>
      <button 
        type="button" 
        onClick={onMenuPress} 
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
      >
        <HamburgerIcon />
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Ratings</span>
      <button type="button" onClick={onInfoPress} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
        <InfoIcon />
      </button>
    </div>
  );
}

// ─── COMPONENT: SUMMARY (horizontal split) ─────────────────────────────────
function Summary({ score, totalFeeds, pulse }: { score: number; totalFeeds: number; pulse: PulseMetric[] }) {
  // How many stars to fill (round to nearest 0.5 mapped to 0–5)
  const filledStars = Math.round(score);

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      padding: "14px 16px",
      display: "flex", gap: 16, alignItems: "flex-start",
    }}>
      {/* Left: score + stars + base */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1 }}>
          {score.toFixed(2)}
        </div>
        <div style={{ marginTop: 6 }}>
          <StarRow count={filledStars} size={14} />
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5, fontWeight: 500 }}>
          Based on {totalFeeds} completed {totalFeeds === 1 ? "feed" : "feeds"}
        </div>
      </div>

      {/* Right: metric label/value stack */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
        {pulse.map((m) => (
          <div key={m.label} style={{ display: "flex", gap: 10, alignItems: "baseline", width: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{m.label}</span>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700, width: 30, textAlign: "right" }}>{m.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPONENT: SECTION HEADER ──────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "12px 16px 0",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 1.2, color: C.orange,
    }}>
      {children}
    </div>
  );
}

// ─── COMPONENT: PERFORMANCE PULSE ──────────────────────────────────────────
function PerformancePulse({ metrics }: { metrics: PulseMetric[] }) {
  return (
    <div style={{ padding: "8px 16px 0" }}>
      {metrics.map((m, i) => (
        <div key={m.label} style={{
          height: 34, display: "flex", alignItems: "center", gap: 10,
          borderBottom: i < metrics.length - 1 ? `1px solid ${C.border}` : "none",
        }}>
          <span style={{ fontSize: 12, color: C.text, fontWeight: 600, width: 76, flexShrink: 0 }}>{m.label}</span>
          <ThinBar targetPct={m.value} delay={i * 80} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.text, width: 32, textAlign: "right", flexShrink: 0 }}>{m.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENT: RATING BREAKDOWN ───────────────────────────────────────────
function RatingBreakdown({ rows }: { rows: RatingRow[] }) {
  const max = maxCount(rows);

  return (
    <div style={{ padding: "8px 16px 0" }}>
      {rows.map((r, i) => {
        const pct = (r.count / max) * 100;
        return (
          <div key={r.stars} style={{
            height: 32, display: "flex", alignItems: "center", gap: 10,
            borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ width: 72, flexShrink: 0 }}>
              <StarRow count={r.stars} size={11} />
            </div>
            <ThinBar targetPct={pct} delay={200 + i * 70} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text, width: 22, textAlign: "right", flexShrink: 0 }}>{r.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMPONENT: EMPTY STATE ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      margin: "24px 16px 0",
      textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <OutlineStarIcon />
      <p style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45, maxWidth: 180, margin: 0 }}>
        Complete deliveries to start building your rating
      </p>
    </div>
  );
}

// ─── COMPONENT: INFO MODAL (bottom sheet) ──────────────────────────────────
function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: C.bg,
        borderRadius: "14px 14px 0 0",
        padding: "18px 16px 28px",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.25s cubic-bezier(.22,.61,0,1)",
        zIndex: 50,
      }}>
        {/* Handle */}
        <div style={{ width: 32, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />

        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          How Ratings Work
        </h3>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
          Your Feeder Score is calculated from customer feedback after each completed delivery.
          Scores range from 1.0 to 5.0 and update in real time.
        </p>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
          Performance Pulse tracks four operational metrics — On-Time, Accuracy, Quality, and
          Satisfaction — independently. Consistency across all four is what separates top feeders.
        </p>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 0 }}>
          Ratings older than 90 days are automatically removed from your score to keep it current.
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            display: "block", margin: "16px auto 0", background: "none",
            border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "6px 24px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}

// ─── PAGE ───────────────────────────────────────────────────────────────────
const FeederRatingsTab: React.FC<FeederRatingsTabProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const data          = useMockRatings();
  const [modal, setModal] = useState(false);

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>

      {/* Top bar */}
      <TopBar onMenuPress={onOpenMenu} onInfoPress={() => setModal(true)} />

      {/* Summary */}
      <Summary score={data.score} totalFeeds={data.totalFeeds} pulse={data.pulse} />

      {/* Performance Pulse */}
      <SectionHeader>Performance Pulse</SectionHeader>
      <PerformancePulse metrics={data.pulse} />

      {/* Rating Breakdown */}
      <SectionHeader>Rating Breakdown</SectionHeader>
      <RatingBreakdown rows={data.breakdown} />

      {/* Empty state — shown when no feeds yet */}
      {data.totalFeeds === 0 && <EmptyState />}

      {/* Info modal */}
      <InfoModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
};

export default FeederRatingsTab;
