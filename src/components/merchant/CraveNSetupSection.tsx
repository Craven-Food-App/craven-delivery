import type { MerchantLabels } from "@/utils/merchantCategoryLabels";

const StoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5"/>
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
    <path d="M5 9v11h14V9"/>
    <rect x="9" y="14" width="6" height="6" rx="1"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

interface CraveNSetupSectionProps {
  labels: MerchantLabels;
  onAddStoreOrBusiness: () => void;
}

export default function CraveNSetupSection({ labels, onAddStoreOrBusiness }: CraveNSetupSectionProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        .craven-setup-cta-btn {
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
          cursor: pointer;
        }
        .craven-setup-cta-btn:hover {
          background: #c2410c !important;
          box-shadow: 0 4px 14px rgba(234,88,12,0.28) !important;
          transform: translateY(-1px);
        }
        .craven-setup-cta-btn:active { transform: translateY(0); }
      `}</style>

      <div
        style={{
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          padding: "20px 24px",
          maxWidth: 860,
          margin: "0 auto 24px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <div style={{ width: 3, height: 13, background: "#ea580c", borderRadius: 2 }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#9ca3af",
              }}
            >
              Merchant Portal
            </span>
          </div>
          <h2
            style={{
              margin: "0 0 3px",
              fontSize: 17,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.3px",
            }}
          >
            Continue your Crave'N setup
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>
            While our team prepares your {labels.entityLabel}, continue your setup to maximize sales.
          </p>
        </div>

        {/* Card: inline layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid #f3f4f6",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
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

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: 13.5,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: "-0.1px",
              }}
            >
              Add another store or a new business
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              Continue setting up your business on Crave'N by adding another store or business now.
            </p>
          </div>

          <button
            type="button"
            className="craven-setup-cta-btn"
            onClick={onAddStoreOrBusiness}
            style={{
              flexShrink: 0,
              padding: "9px 18px",
              borderRadius: 7,
              border: "none",
              background: "#ea580c",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(234,88,12,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <PlusIcon />
            Add store or business
          </button>
        </div>
      </div>
    </>
  );
}
