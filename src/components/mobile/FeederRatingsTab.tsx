/**
 * Crave'N Feeder App — Ratings Tab (Tier-Aware Redesign)
 * Clean, enterprise styling. No animations, no emojis.
 * Mobile-first, responsive. Crave'N orange (#F57C00) accent.
 */

import React, { useState } from "react";
import { useFeederTierProfile } from "@/hooks/useFeederTierProfile";
import { getTierConfig, getNextTier, TIER_PERKS, TIER_ORDER } from "@/utils/ratingHelpers";
import { RatingTier } from "@/types/diamond-orders";
import { format } from "date-fns";

const C = {
  orange: "#F57C00",
  text: "#111111",
  muted: "#777777",
  muted2: "#999999",
  border: "#EEEEEE",
  bg: "#FFFFFF",
  green: "#16A34A",
  red: "#DC2626",
} as const;

type FeederRatingsTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

// ─── TIER BADGE ─────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: RatingTier }) {
  const config = getTierConfig(tier);
  const isUltimate = tier === "Ultimate";

  return (
    <div
      style={{
        background: config.color,
        color: config.textColor,
        border: isUltimate ? `2px solid ${C.orange}` : "1px solid #E0E0E0",
        borderRadius: 10,
        padding: "20px 16px",
        margin: "0 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.8 }}>
        Current Tier
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
        {config.name}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.7 }}>
        +{config.dispatchWeight} dispatch priority
      </div>
    </div>
  );
}

// ─── METRIC ROW ─────────────────────────────────────────────────────────────
function MetricRow({ label, value, unit, target, inverse }: {
  label: string;
  value: number;
  unit: string;
  target?: number;
  inverse?: boolean; // for cancellation rate where lower is better
}) {
  let pct = 0;
  if (target && target > 0) {
    pct = inverse
      ? Math.min(100, ((target - value) / target) * 100)
      : Math.min(100, (value / target) * 100);
  }

  return (
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          {unit === "/5.00" ? value.toFixed(2) : unit === "% (max)" ? value.toFixed(1) : typeof value === "number" && unit === "%" ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      {target !== undefined && (
        <div style={{ height: 4, background: "#EEEEEE", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: pct >= 100 ? C.green : C.orange,
            borderRadius: 2,
          }} />
        </div>
      )}
    </div>
  );
}

// ─── REQUIREMENT CHECK ──────────────────────────────────────────────────────
function RequirementCheck({ label, current, required, met, unit }: {
  label: string;
  current: number;
  required: number;
  met: boolean;
  unit: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 16px", borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9,
        background: met ? C.green : "#E0E0E0",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {met ? (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={3}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: met ? C.green : C.text }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
        {unit === "/5.00" ? current.toFixed(2) : unit === "% (max)" ? `${current.toFixed(1)}%` : unit === "%" ? `${current.toFixed(1)}%` : current}
        {" / "}
        {unit === "/5.00" ? required.toFixed(2) : unit === "% (max)" ? `<${required}%` : unit === "%" ? `${required}%` : required}
      </div>
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

// ─── PERK ITEM ──────────────────────────────────────────────────────────────
function PerkItem({ text, locked }: { text: string; locked?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 16px", opacity: locked ? 0.4 : 1,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: 3,
        background: locked ? "#CCC" : C.orange,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: locked ? C.muted2 : C.text, fontWeight: 500 }}>
        {text}{locked ? " (locked)" : ""}
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
const FeederRatingsTab: React.FC<FeederRatingsTabProps> = ({ onOpenMenu }) => {
  const profile = useFeederTierProfile();
  const [historyOpen, setHistoryOpen] = useState(false);

  if (profile.loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, color: C.muted }}>Loading tier data...</span>
      </div>
    );
  }

  const { tier, tierConfig, metrics, progress, perks, nextPerks, history, graceActive } = profile;

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      paddingBottom: 80,
    }}>
      {/* Top bar */}
      <div style={{
        height: 56, background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 16px", borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Feeder Tier</span>
      </div>

      {/* Tier Badge */}
      <div style={{ padding: "16px 0 8px" }}>
        <TierBadge tier={tier} />
      </div>

      {/* Grace period warning */}
      {graceActive && (
        <div style={{
          margin: "0 16px 8px", padding: "8px 12px",
          background: "#FFF3E0", border: "1px solid #FFE0B2", borderRadius: 6,
          fontSize: 11, color: "#E65100", fontWeight: 600,
        }}>
          Grace period active — maintain metrics to keep your current tier
        </div>
      )}

      {/* Current Metrics */}
      <SectionHeader>Current Metrics (60-Day Rolling)</SectionHeader>
      <MetricRow label="Rating" value={metrics.rolling_rating} unit="/5.00" target={5} />
      <MetricRow label="Completion Rate" value={metrics.rolling_completion_rate} unit="%" target={100} />
      <MetricRow label="On-Time Rate" value={metrics.rolling_on_time_rate} unit="%" target={100} />
      <MetricRow label="Cancellation Rate" value={metrics.rolling_cancel_rate} unit="% (max)" />
      <MetricRow label="Deliveries (60-day)" value={metrics.rolling_deliveries} unit="" />

      {/* Next Tier Progress */}
      {progress.nextTier && progress.nextTierConfig && (
        <>
          <SectionHeader>Next Tier: {progress.nextTierConfig.name}</SectionHeader>
          {progress.requirements.map((req) => (
            <RequirementCheck key={req.label} {...req} />
          ))}
          {progress.nextTier === "Ultimate" && (
            <div style={{
              padding: "8px 16px", fontSize: 11, color: C.muted, fontStyle: "italic",
            }}>
              Ultimate tier requires manual admin approval after meeting all requirements.
            </div>
          )}
        </>
      )}

      {/* Current Perks */}
      <SectionHeader>Your Perks</SectionHeader>
      {perks.map((p) => (
        <PerkItem key={p} text={p} />
      ))}
      {nextPerks.length > 0 && (
        <>
          <div style={{ padding: "8px 16px 2px", fontSize: 10, fontWeight: 600, color: C.muted2, textTransform: "uppercase", letterSpacing: 1 }}>
            Unlock at {progress.nextTierConfig?.name}
          </div>
          {nextPerks.map((p) => (
            <PerkItem key={p} text={p} locked />
          ))}
        </>
      )}

      {/* Tier History */}
      <div style={{ padding: "14px 16px 6px" }}>
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 1.2, color: C.orange,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          Tier History
          <span style={{ fontSize: 10 }}>{historyOpen ? "▲" : "▼"}</span>
        </button>
      </div>
      {historyOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          {history.length === 0 ? (
            <div style={{ fontSize: 12, color: C.muted2, padding: "8px 0" }}>
              No tier changes yet.
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} style={{
                padding: "8px 0", borderBottom: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    {h.old_tier} → {h.new_tier}
                  </span>
                  {h.reason && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{h.reason}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: C.muted2 }}>
                  {format(new Date(h.created_at), "MMM d, yyyy")}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FeederRatingsTab;
