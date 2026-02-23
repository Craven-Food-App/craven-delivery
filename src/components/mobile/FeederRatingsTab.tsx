/**
 * Crave'n Feeder App — Ratings Tab
 * Uses real data from driver_profiles via useFeederTier hook.
 * Displays tier badge, rolling metrics, rating breakdown, next-tier progress, and benefits.
 */

import React, { useEffect, useState } from "react";
import { useFeederTier } from "@/hooks/useFeederTier";
import { FEEDER_TIERS, TIER_BADGE_STYLES, type FeederTierName } from "@/utils/ratingHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  track:   "#EEEEEE",
  starOff: "#E5E5E5",
  bg:      "#FFFFFF",
  bgMuted: "#FAFBFD",
  green:   "#10b981",
  red:     "#ef4444",
} as const;

type FeederRatingsTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

// ─── SVG ICONS ──────────────────────────────────────────────────────────────
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#F5C518" : C.starOff}>
      <path d={STAR_PATH} />
    </svg>
  );
}

function StarRow({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= count} size={size} />
      ))}
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ─── ANIMATED PROGRESS BAR ──────────────────────────────────────────────────
function ThinBar({ targetPct, delay = 0, color = C.orange }: { targetPct: number; delay?: number; color?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), delay + 60);
    return () => clearTimeout(t);
  }, [targetPct, delay]);

  return (
    <div style={{ flex: 1, height: 3, background: C.track, borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        background: color,
        borderRadius: 2,
        width: `${Math.min(100, width)}%`,
        transition: "width 500ms cubic-bezier(.22,.61,0,1)",
      }} />
    </div>
  );
}

// ─── TIER BADGE ─────────────────────────────────────────────────────────────
function TierBadge({ tier, icon }: { tier: FeederTierName; icon: string }) {
  const styleKey = tier.toUpperCase() as keyof typeof TIER_BADGE_STYLES;
  const style = TIER_BADGE_STYLES[styleKey] || TIER_BADGE_STYLES.FEEDER;

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: style.bg,
      color: style.text,
      border: `2px solid ${style.border}`,
      padding: "6px 14px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 0.5,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {tier} Feeder
    </div>
  );
}

// ─── TIER BENEFITS ──────────────────────────────────────────────────────────
const TIER_BENEFITS: Record<FeederTierName, string[]> = {
  Feeder: [
    "Standard orders only",
    "No premium retail or catering",
    "No early scheduling",
  ],
  Gold: [
    "Early access to standard orders",
    "+5 dispatch weight",
  ],
  Platinum: [
    "Access to premium merchants",
    "Early scheduling unlock",
    "+10 dispatch weight",
  ],
  Diamond: [
    "Priority dispatch access",
    "High-value retail access",
    "Large order eligibility",
    "+18 dispatch weight",
  ],
  Ultimate: [
    "Top dispatch priority (+30 weight)",
    "Catering & premium retail first access",
    "Dedicated support queue",
    "Beta feature access",
    "Enhanced referral bonus",
  ],
};

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
      <button type="button" onClick={onMenuPress} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
        <HamburgerIcon />
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Ratings</span>
      <button type="button" onClick={onInfoPress} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
        <InfoIcon />
      </button>
    </div>
  );
}

// ─── SECTION HEADER ─────────────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "14px 16px 6px",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 1.2, color: C.orange,
    }}>
      {children}
    </div>
  );
}

// ─── INFO MODAL ─────────────────────────────────────────────────────────────
function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.35)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.2s ease",
        zIndex: 40,
      }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: C.bg,
        borderRadius: "14px 14px 0 0",
        padding: "18px 16px 28px",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.25s cubic-bezier(.22,.61,0,1)",
        zIndex: 50,
      }}>
        <div style={{ width: 32, height: 3, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          How the Feeder Tier System Works
        </h3>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
          Your tier is evaluated on a <strong>rolling 60-day window</strong> of performance metrics including
          rating, completion rate, on-time rate, and cancellation rate.
        </p>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
          Higher tiers unlock better dispatch priority, premium order access, and increased earnings potential.
          Ultimate Feeder requires admin approval and sustained excellence.
        </p>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 0 }}>
          Demotion occurs if metrics drop below tier thresholds for 7 consecutive days.
        </p>
        <button type="button" onClick={onClose} style={{
          display: "block", margin: "16px auto 0", background: "none",
          border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "6px 24px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer",
        }}>
          Close
        </button>
      </div>
    </>
  );
}

// ─── PAGE ───────────────────────────────────────────────────────────────────
const FeederRatingsTab: React.FC<FeederRatingsTabProps> = ({ onOpenMenu }) => {
  const { tier, tierConfig, metrics, nextTier, loading } = useFeederTier();
  const [modal, setModal] = useState(false);

  const rating = metrics.rolling_rating || metrics.rating;
  const deliveries = metrics.rolling_deliveries || metrics.total_deliveries;
  const filledStars = Math.round(rating);

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: C.muted }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>
      <TopBar onMenuPress={onOpenMenu} onInfoPress={() => setModal(true)} />

      {/* ── Tier Badge + Rating Summary ── */}
      <div style={{ padding: "16px 16px 0", textAlign: "center" }}>
        <TierBadge tier={tier} icon={tierConfig.icon} />
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.text, lineHeight: 1 }}>
            {rating.toFixed(2)}
          </div>
          <div style={{ marginTop: 6 }}><StarRow count={filledStars} size={16} /></div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5, fontWeight: 500 }}>
            Based on {deliveries} completed {deliveries === 1 ? "delivery" : "deliveries"}
          </div>
        </div>
      </div>

      {/* ── Performance Pulse (rolling 60-day metrics) ── */}
      <SectionHeader>Performance Pulse (60-Day)</SectionHeader>
      <div style={{ padding: "0 16px" }}>
        {[
          { label: "On-Time Rate", value: metrics.rolling_on_time_rate, req: nextTier?.minOnTimeRate },
          { label: "Completion Rate", value: metrics.rolling_completion_rate, req: nextTier?.minCompletionRate },
          { label: "Cancellation Rate", value: metrics.rolling_cancel_rate, req: nextTier?.maxCancellationRate, inverse: true },
        ].map((m, i) => (
          <div key={m.label} style={{
            height: 38, display: "flex", alignItems: "center", gap: 10,
            borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
          }}>
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600, width: 110, flexShrink: 0 }}>{m.label}</span>
            <ThinBar
              targetPct={m.inverse ? Math.max(0, 100 - m.value) : m.value}
              delay={i * 80}
              color={m.inverse ? (m.value > (m.req || 100) ? C.red : C.green) : (m.value >= (m.req || 0) ? C.green : C.orange)}
            />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text, width: 40, textAlign: "right", flexShrink: 0 }}>
              {m.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* ── Next Tier Progress ── */}
      {nextTier && (
        <>
          <SectionHeader>Next Tier: {nextTier.name} Feeder</SectionHeader>
          <div style={{ padding: "0 16px" }}>
            {[
              { label: "Deliveries", current: deliveries, required: nextTier.minDeliveries, unit: "" },
              { label: "Rating", current: rating, required: nextTier.minRating, unit: "", decimals: 2 },
              { label: "Completion", current: metrics.rolling_completion_rate, required: nextTier.minCompletionRate, unit: "%" },
              { label: "On-Time", current: metrics.rolling_on_time_rate, required: nextTier.minOnTimeRate, unit: "%" },
              { label: "Cancel Rate", current: metrics.rolling_cancel_rate, required: nextTier.maxCancellationRate, unit: "%", inverse: true },
            ].map((req, i) => {
              const met = req.inverse
                ? req.current <= req.required
                : req.current >= req.required;
              return (
                <div key={req.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
                }}>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
                    {req.label}: {req.required}{req.unit}{req.inverse ? " max" : "+"}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: met ? C.green : C.red,
                    background: met ? "#e6f4ea" : "#fef2f2",
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    {met ? "✓" : `${req.decimals ? req.current.toFixed(req.decimals) : req.current}${req.unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Tier Benefits ── */}
      <SectionHeader>{tier} Feeder Benefits</SectionHeader>
      <div style={{ padding: "0 16px 16px" }}>
        {TIER_BENEFITS[tier].map((benefit, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 0",
            borderBottom: i < TIER_BENEFITS[tier].length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <span style={{ fontSize: 12, color: tier === 'Feeder' ? C.red : C.green }}>
              {tier === 'Feeder' ? '✗' : '✓'}
            </span>
            <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{benefit}</span>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {deliveries === 0 && (
        <div style={{ textAlign: "center", padding: "24px 16px 0" }}>
          <div style={{ fontSize: 28, opacity: 0.3 }}>⭐</div>
          <p style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45, maxWidth: 200, margin: "8px auto 0" }}>
            Complete deliveries to start building your tier status
          </p>
        </div>
      )}

      <InfoModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
};

export default FeederRatingsTab;
