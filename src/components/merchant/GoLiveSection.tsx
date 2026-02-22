import { useMemo } from "react";

interface ReadinessData {
  score: number;
  ready: boolean;
  blockers: string[];
  missing_items: string[];
  estimated_go_live?: string;
}

interface GoLiveSectionProps {
  readiness: ReadinessData | null;
  targetDate: string;
  onNavigateToSettings?: (tab: string) => void;
  onNavigateToAvailability?: () => void;
}

const StoreIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5"/>
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
    <path d="M5 9v11h14V9"/>
    <rect x="9" y="14" width="6" height="6" rx="1"/>
  </svg>
);

const FlameIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#ea580c" stroke="none">
    <path d="M12 2c0 0-6 6-6 12a6 6 0 0 0 12 0C18 8 12 2 12 2zm0 16a3 3 0 0 1-3-3c0-2.5 3-6 3-6s3 3.5 3 6a3 3 0 0 1-3 3z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

function getActionTab(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.includes("bank") || lower.includes("payout")) return "bank";
  if (lower.includes("hour") || lower.includes("operating") || lower.includes("availability")) return "availability";
  if (lower.includes("menu") || lower.includes("catalog")) return "menu";
  if (lower.includes("store") || lower.includes("header") || lower.includes("logo")) return "store";
  return null;
}

export default function GoLiveSection({
  readiness,
  targetDate,
  onNavigateToSettings,
  onNavigateToAvailability,
}: GoLiveSectionProps) {
  const score = readiness?.score ?? 0;
  const ready = readiness?.ready ?? false;
  const blockers = readiness?.blockers ?? [];
  const missingItems = (readiness?.missing_items ?? []).slice(0, 5);

  const requiredItems = useMemo(
    () => blockers.map((label, id) => ({ id, label, tab: getActionTab(label) })),
    [blockers]
  );
  const recommendedItems = useMemo(
    () => missingItems.map((label, id) => ({ id, label, tab: getActionTab(label) })),
    [missingItems]
  );

  const handleAction = (label: string, tab: string | null) => {
    if (tab === "availability" && onNavigateToAvailability) {
      onNavigateToAvailability();
      return;
    }
    if (tab && onNavigateToSettings) onNavigateToSettings(tab);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .go-live-action-item {
          transition: background 0.15s ease, padding-left 0.15s ease;
          cursor: pointer;
        }
        .go-live-action-item:hover {
          background: rgba(234,88,12,0.04) !important;
          padding-left: 14px !important;
        }
        .go-live-action-item-blue:hover {
          background: rgba(37,99,235,0.04) !important;
          padding-left: 14px !important;
        }
        @keyframes go-live-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .go-live-readiness-fill {
          background: linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%);
          background-size: 200% auto;
          animation: go-live-shimmer 2.2s linear infinite;
        }
        @keyframes go-live-fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .go-live-card-required { animation: go-live-fadeUp 0.3s ease 0.05s both; }
        .go-live-card-recommended { animation: go-live-fadeUp 0.3s ease 0.13s both; }
      `}</style>

      <div
        style={{
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          padding: "24px 28px",
          maxWidth: 860,
          margin: "0 auto 24px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              flexShrink: 0,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StoreIcon />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: "-0.3px",
                }}
              >
                Go live with your store
              </h2>

              {ready ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: "#ecfdf5",
                    color: "#059669",
                    border: "1.5px solid #a7f3d0",
                  }}
                >
                  <CheckIcon /> Ready
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: "#fff7ed",
                    color: "#ea580c",
                    border: "1.5px solid #fed7aa",
                  }}
                >
                  <FlameIcon /> Not Ready
                </span>
              )}

              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                Readiness:{" "}
                <span
                  style={{
                    color: "#ea580c",
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {score}%
                </span>
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: "#f3f4f6",
                  borderRadius: 99,
                  overflow: "hidden",
                  maxWidth: 260,
                }}
              >
                <div
                  className="go-live-readiness-fill"
                  style={{ height: "100%", width: `${Math.min(100, score)}%`, borderRadius: 99 }}
                />
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>
              {ready ? (
                <>
                  You're ready to go live! Your estimated launch date is{" "}
                  <strong style={{ color: "#374151" }}>{targetDate}</strong>.
                </>
              ) : (
                <>
                  We recommend going live by <strong style={{ color: "#374151" }}>{targetDate}</strong>. Complete the
                  items below to go live.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Cards row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requiredItems.length > 0 && (
            <div
              className="go-live-card-required"
              style={{
                borderRadius: 8,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#9a3412",
                    letterSpacing: "0.01em",
                  }}
                >
                  Required to go live:
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {requiredItems.map((item) => (
                  <div
                    key={item.id}
                    className="go-live-action-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAction(item.label, item.tab)}
                    onKeyDown={(e) => e.key === "Enter" && handleAction(item.label, item.tab)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#ea580c",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, color: "#9a3412", fontWeight: 500 }}>{item.label}</span>
                    </div>
                    <span style={{ color: "#ea580c", opacity: 0.6 }}>
                      <ArrowIcon />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendedItems.length > 0 && (
            <div
              className="go-live-card-recommended"
              style={{
                borderRadius: 8,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#1e40af",
                    letterSpacing: "0.01em",
                  }}
                >
                  Recommended items:
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recommendedItems.map((item) => (
                  <div
                    key={item.id}
                    className="go-live-action-item go-live-action-item-blue"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAction(item.label, item.tab)}
                    onKeyDown={(e) => e.key === "Enter" && handleAction(item.label, item.tab)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#3b82f6",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 500 }}>{item.label}</span>
                    </div>
                    <span style={{ color: "#3b82f6", opacity: 0.6 }}>
                      <ArrowIcon />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requiredItems.length === 0 && recommendedItems.length === 0 && ready && (
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              All set. Complete store activation steps above if any are still pending.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
