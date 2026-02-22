import { useMemo } from "react";
import { format } from "date-fns";
import type { MerchantLabels } from "@/utils/merchantCategoryLabels";

interface OnboardingProgress {
  business_info_verified?: boolean;
  menu_preparation_status?: "not_started" | "in_progress" | "ready";
  tablet_shipped?: boolean;
  tablet_delivered_at?: string | null;
  tablet_preparing_shipment?: boolean;
  tablet_tracking_number?: string | null;
  tablet_shipping_carrier?: string | null;
  tablet_shipped_at?: string | null;
  tablet_shipping_label_url?: string | null;
}

type StepStatus = "complete" | "active" | "pending";

interface StepConfig {
  id: number;
  step: string;
  title: string;
  description: string;
  status: StepStatus;
  tag: string;
  icon: React.ReactNode;
  extraContent?: React.ReactNode;
}

const STATUS_STYLES: Record<StepStatus, {
  tag: { bg: string; text: string; border: string };
  icon: { bg: string; color: string; border: string };
  num: { bg: string; color: string };
  leftBar: string;
  rowBg: string;
  rowBorder: string;
  titleColor: string;
}> = {
  complete: {
    tag: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
    icon: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
    num: { bg: "#059669", color: "#fff" },
    leftBar: "#059669",
    rowBg: "#fff",
    rowBorder: "#f3f4f6",
    titleColor: "#111827",
  },
  active: {
    tag: { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
    icon: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
    num: { bg: "#ea580c", color: "#fff" },
    leftBar: "#ea580c",
    rowBg: "#fffaf7",
    rowBorder: "#fed7aa",
    titleColor: "#111827",
  },
  pending: {
    tag: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
    icon: { bg: "#f9fafb", color: "#9ca3af", border: "#e5e7eb" },
    num: { bg: "#e5e7eb", color: "#6b7280" },
    leftBar: "#e5e7eb",
    rowBg: "#fff",
    rowBorder: "#f3f4f6",
    titleColor: "#374151",
  },
};

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 6 5 9 10 3"/>
  </svg>
);

interface StoreActivationProps {
  progress: OnboardingProgress | null;
  restaurant: { business_verified_at?: string | null; header_image_url?: string | null } | null;
  labels: MerchantLabels;
  onNavigateToSettings?: (tab: string) => void;
  onContactSupport?: () => void;
}

export default function StoreActivation({
  progress,
  restaurant,
  labels,
  onNavigateToSettings,
  onContactSupport,
}: StoreActivationProps) {
  const steps = useMemo((): StepConfig[] => {
    const isBusinessVerified = Boolean(progress?.business_info_verified) || Boolean(restaurant?.business_verified_at);
    const menuStatus = progress?.menu_preparation_status ?? "not_started";
    const menuReady = menuStatus === "ready";
    const menuInProgress = menuStatus === "in_progress";
    const tabletDelivered = Boolean(progress?.tablet_delivered_at);
    const tabletShipped = Boolean(progress?.tablet_shipped);
    const tabletPreparing = Boolean(progress?.tablet_preparing_shipment);
    const tabletInProgress = tabletPreparing || tabletShipped;

    const step1Status: StepStatus = isBusinessVerified ? "complete" : "active";
    const step2Status: StepStatus = menuReady ? "complete" : menuInProgress ? "active" : isBusinessVerified ? "active" : "pending";
    const step3Status: StepStatus = tabletDelivered ? "complete" : tabletInProgress ? "active" : menuReady && isBusinessVerified ? "active" : "pending";

    const catalogLabel = labels.catalogLabel.toLowerCase();

    const step1Desc = isBusinessVerified
      ? "Business info reviewed and confirmed by our compliance team. No action required."
      : "Our team is reviewing your business documents. This usually takes 1–2 business days.";

    const step2Desc = menuReady
      ? `Your ${catalogLabel} has been prepared and is ready to go live.`
      : `Our team is building your catalog. Typically 2 business days. You'll be notified by email.`;

    const step3Desc = tabletDelivered
      ? "Your POS tablet has been delivered and is ready to use."
      : tabletShipped
        ? "We'll keep you updated on its status."
        : tabletPreparing
          ? "Your POS tablet is being packaged for shipment. Tracking info provided within 1 business day."
          : "Your tablet will ship once business verification and catalog preparation are complete.";

    const step2Extra =
      menuReady && !restaurant?.header_image_url && onNavigateToSettings ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Add a store header</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
              Stores with a header image get up to 50% more monthly sales.
            </div>
            <button
              type="button"
              onClick={() => onNavigateToSettings("store")}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Add a header image
            </button>
          </div>
        </div>
      ) : undefined;

    const hasTracking = progress?.tablet_tracking_number && (tabletShipped || tabletDelivered);
    const step3Extra = hasTracking ? (
      <div style={{ marginTop: 12 }}>
        <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tracking Information</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
            <span style={{ color: "#9ca3af" }}>Carrier:</span> {progress?.tablet_shipping_carrier || "USPS"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
            <span style={{ color: "#9ca3af" }}>Tracking #:</span> {progress?.tablet_tracking_number}
          </div>
          {progress?.tablet_shipped_at && (
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
              <span style={{ color: "#9ca3af" }}>Shipped:</span> {format(new Date(progress.tablet_shipped_at), "PPP")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {progress?.tablet_shipping_label_url && (
              <button
                type="button"
                onClick={() => window.open(progress!.tablet_shipping_label_url!, "_blank")}
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                View Shipping Label
              </button>
            )}
            {tabletShipped && (
              <button
                type="button"
                onClick={() => {
                  const carrier = progress?.tablet_shipping_carrier || "USPS";
                  const tn = progress?.tablet_tracking_number;
                  const url =
                    carrier === "USPS"
                      ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
                      : carrier === "UPS"
                        ? `https://www.ups.com/track?tracknum=${tn}`
                        : carrier === "FedEx"
                          ? `https://www.fedex.com/fedextrack/?trknbr=${tn}`
                          : `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`;
                  window.open(url, "_blank");
                }}
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #ea580c",
                  background: "#fff7ed",
                  color: "#ea580c",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Track Package
              </button>
            )}
          </div>
        </div>
      </div>
    ) : undefined;

    return [
      {
        id: 1,
        step: "01",
        title: "Business Verification",
        description: step1Desc,
        status: step1Status,
        tag: isBusinessVerified ? "Verified" : "Not Started",
        icon: <ShieldIcon />,
      },
      {
        id: 2,
        step: "02",
        title: labels.catalogPrepLabel,
        description: step2Desc,
        status: step2Status,
        tag: menuReady ? "Complete" : menuInProgress ? "In Progress" : "Not Started",
        icon: <ListIcon />,
        extraContent: step2Extra,
      },
      {
        id: 3,
        step: "03",
        title: "Hardware Fulfillment",
        description: step3Desc,
        status: step3Status,
        tag: tabletDelivered ? "Delivered" : tabletShipped ? "In Transit" : tabletPreparing ? "In Progress" : "Not Started",
        icon: <TruckIcon />,
        extraContent: step3Extra,
      },
    ];
  }, [progress, restaurant, labels, onNavigateToSettings]);

  const completed = steps.filter((s) => s.status === "complete").length;
  const pct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .store-activation-step-row { transition: background 0.15s ease; }
        .store-activation-step-row:hover { background: #fffaf7 !important; }
        @keyframes store-activation-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .store-activation-progress-fill {
          background: linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%);
          background-size: 200% auto;
          animation: store-activation-shimmer 2.2s linear infinite;
        }
        @keyframes store-activation-fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .store-activation-step-row:nth-child(1) { animation: store-activation-fadeUp 0.3s ease 0.05s both; }
        .store-activation-step-row:nth-child(2) { animation: store-activation-fadeUp 0.3s ease 0.11s both; }
        .store-activation-step-row:nth-child(3) { animation: store-activation-fadeUp 0.3s ease 0.17s both; }
      `}</style>

      <div
        style={{
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          padding: "28px 32px",
          maxWidth: 860,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: 3, height: 15, background: "#ea580c", borderRadius: 2 }} />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Merchant Portal
              </span>
            </div>
            <h2 style={{ margin: "0 0 3px", fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.4px" }}>
              Store Activation
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Complete all steps before your store goes live.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Progress
              </span>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#ea580c",
                  fontFamily: "'IBM Plex Mono', monospace",
                  lineHeight: 1,
                }}
              >
                {pct}
                <span style={{ fontSize: 12, color: "#d1d5db", fontWeight: 400 }}>%</span>
              </span>
            </div>
            <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
              <div
                className="store-activation-progress-fill"
                style={{ height: "100%", width: `${pct}%`, borderRadius: 99 }}
              />
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {completed} of {steps.length} complete &nbsp;·&nbsp;
              <span style={{ color: "#ea580c", fontWeight: 600 }}>{steps.length - completed} remaining</span>
            </span>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((step, i) => {
            const s = STATUS_STYLES[step.status];
            const isComplete = step.status === "complete";

            return (
              <div
                key={step.id}
                className="store-activation-step-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 34px 1fr auto",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: `1px solid ${s.rowBorder}`,
                  borderLeft: `3px solid ${s.leftBar}`,
                  background: s.rowBg,
                  boxShadow: step.status === "active" ? "0 1px 6px rgba(234,88,12,0.06)" : "none",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: s.num.bg,
                    color: s.num.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', monospace",
                    flexShrink: 0,
                  }}
                >
                  {isComplete ? <CheckIcon /> : i + 1}
                </div>

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 7,
                    background: s.icon.bg,
                    border: `1px solid ${s.icon.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: s.icon.color,
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: s.titleColor,
                        letterSpacing: "-0.1px",
                      }}
                    >
                      {step.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: s.tag.bg,
                        color: s.tag.text,
                        border: `1px solid ${s.tag.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.55 }}>{step.description}</p>
                  {step.extraContent}
                </div>

                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#d1d5db",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  STEP {step.step}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            Steps are processed automatically. Questions?{" "}
            <span
              role="button"
              tabIndex={0}
              onClick={onContactSupport}
              onKeyDown={(e) => e.key === "Enter" && onContactSupport?.()}
              style={{ color: "#ea580c", fontWeight: 500, cursor: "pointer" }}
            >
              Contact support
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
