import React, { useState } from "react";

export type POSProvider = "square" | "toast" | "clover";

const INSTRUCTIONS: Record<
  POSProvider,
  { title: string; steps: string[]; helpUrl: string; note?: string }
> = {
  square: {
    title: "Connect Square POS",
    helpUrl: "https://developer.squareup.com/help",
    steps: [
      "Make sure you have a Square account and use Square for in-store or online sales.",
      "Click the **Connect** button below. You will be taken to Square’s secure login page.",
      "Sign in to your Square account if you are not already signed in.",
      "Review the permissions (menu, orders, inventory) and click **Allow** or **Authorize** to connect Crave'n to your Square account.",
      "You will be redirected back here. The integration will show as **Connected** when done.",
    ],
    note: "Your menu and inventory can be synced with Crave'n so online orders stay in sync with your POS.",
  },
  toast: {
    title: "Connect Toast POS",
    helpUrl: "https://pos.toasttab.com/developers",
    steps: [
      "Ensure your restaurant uses Toast as your point-of-sale system.",
      "Click the **Connect** button below. You will be taken to Toast’s authorization page.",
      "Sign in to your Toast account if prompted.",
      "Approve access so Crave'n can sync with your Toast menu and orders.",
      "You will be redirected back to the Merchant Portal. The integration will show as **Connected** when complete.",
    ],
    note: "Once connected, Crave'n can sync menu and order data with your Toast system.",
  },
  clover: {
    title: "Connect Clover POS",
    helpUrl: "https://docs.clover.com",
    steps: [
      "Ensure your business uses Clover as your point-of-sale system.",
      "Click the **Connect** button below. You will be taken to Clover’s secure authorization page.",
      "Sign in to your Clover account if you are not already signed in.",
      "Grant Crave'n permission to access your menu and order data.",
      "You will be redirected back here. The integration will show as **Connected** when done.",
    ],
    note: "After connecting, Crave'n can keep menu and inventory in sync with your Clover POS.",
  },
};

interface POSIntegrationInstructionsProps {
  provider: POSProvider;
  isConnected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectLabel?: string;
  disconnectLabel?: string;
  compact?: boolean;
  connectDisabled?: boolean;
}

export function POSIntegrationInstructions({
  provider,
  isConnected,
  onConnect,
  onDisconnect,
  connectLabel = "Connect",
  disconnectLabel = "Disconnect",
  compact = false,
  connectDisabled = false,
}: POSIntegrationInstructionsProps) {
  const [expanded, setExpanded] = useState(false);
  const info = INSTRUCTIONS[provider];

  return (
    <div
      style={{
        marginTop: 8,
        padding: compact ? 10 : 14,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: 0,
          border: "none",
          background: "none",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          cursor: "pointer",
        }}
      >
        <span>
          {expanded ? "Hide" : "Show"} setup instructions
        </span>
        <span style={{ transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            {info.title}
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#4b5563", lineHeight: 1.7 }}>
            {info.steps.map((step, i) => {
              const parts = step.split(/(\*\*.*?\*\*)/g).map((s, j) =>
                s.startsWith("**") && s.endsWith("**") ? (
                  <strong key={j}>{s.slice(2, -2)}</strong>
                ) : (
                  <React.Fragment key={j}>{s}</React.Fragment>
                )
              );
              return (
                <li key={i} style={{ marginBottom: 4 }}>
                  {parts}
                </li>
              );
            })}
          </ol>
          {info.note && (
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 10, fontStyle: "italic" }}>
              {info.note}
            </p>
          )}
          <a
            href={info.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#ea580c", marginTop: 6, display: "inline-block" }}
          >
            Learn more at provider’s help site →
          </a>
        </div>
      )}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!isConnected && onConnect && (
          <button
            type="button"
            onClick={onConnect}
            disabled={connectDisabled}
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#ea580c",
              cursor: connectDisabled ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: connectDisabled ? 0.7 : 1,
            }}
          >
            {connectLabel}
          </button>
        )}
        {isConnected && onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#6b7280",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {disconnectLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default POSIntegrationInstructions;
