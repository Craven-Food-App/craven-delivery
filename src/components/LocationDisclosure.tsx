import React, { useState } from "react";
import type { CSSProperties } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { LOCATION_DISCLOSURE_KEY } from "@/utils/locationDisclosure";

type Props = {
  onDone: (enabled: boolean) => void;
  privacyPolicyUrl?: string;
  /** Feeder/driver copy: emphasize delivery, navigation, and tracking. */
  variant?: "customer" | "feeder";
};

const LocationPinIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
    <path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      fill="white"
      stroke="rgba(0,0,0,0.08)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9" r="2.5" fill="#e64a0c" />
  </svg>
);

export default function LocationDisclosure({
  onDone,
  privacyPolicyUrl = "https://cravenusa.com/privacy",
  variant = "customer",
}: Props) {
  const [busy, setBusy] = useState(false);

  const persistSeen = () => {
    try {
      localStorage.setItem(LOCATION_DISCLOSURE_KEY, "true");
    } catch {
      // ignore storage failures; we still proceed
    }
  };

  const handleContinue = async () => {
    setBusy(true);
    try {
      persistSeen();

      // Request permissions only after disclosure + explicit user action
      const perms = await Geolocation.requestPermissions();

      const granted =
        // Capacitor v5+ (location)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (perms as any)?.location === "granted" ||
        // Older Android WebView / coarse location key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (perms as any)?.coarseLocation === "granted";

      onDone(!!granted);
    } catch {
      // If anything fails, treat as not enabled but still proceed.
      onDone(false);
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = () => {
    persistSeen();
    onDone(false);
  };

  const isFeeder = variant === "feeder";

  return (
    <>
      <style>{`
        .loc-disclosure-wrap { min-height: 100vh; }
        .loc-disclosure-card { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04); }
        .loc-disclosure-card:active { transform: scale(0.998); }
        .loc-disclosure-icon-wrap { animation: loc-pulse 2.5s ease-in-out infinite; }
        @keyframes loc-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.02); } }
        .loc-disclosure-primary-btn:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(230,74,12,0.4); }
        .loc-disclosure-primary-btn:active:not(:disabled) { transform: translateY(1px); }
        .loc-disclosure-secondary-btn:hover:not(:disabled) { background: rgba(0,0,0,0.04); }
        .loc-disclosure-link:hover { color: #c2410c; }
      `}</style>
      <div style={styles.wrap} className="loc-disclosure-wrap">
        <div style={styles.card} className="loc-disclosure-card">
          <div style={styles.iconWrap} className="loc-disclosure-icon-wrap">
            <LocationPinIcon />
          </div>
          <h1 style={styles.title}>Enable location</h1>
          <p style={styles.sub}>
            {isFeeder ? "Required for receiving and completing deliveries." : "This helps Crave'n work properly."}
          </p>

          <div style={styles.body}>
            {isFeeder ? (
              <ul style={styles.list}>
                <li style={styles.listItem}>See nearby delivery offers and keep your status accurate</li>
                <li style={styles.listItem}>Navigate to pickup and drop-off, and let customers track their order</li>
              </ul>
            ) : (
              <ul style={styles.list}>
                <li style={styles.listItem}>Find restaurants and stores near you</li>
                <li style={styles.listItem}>Calculate distance and support delivery tracking</li>
              </ul>
            )}
            <p style={styles.pMuted}>
              Location is only used while you're using the app.
            </p>
            <a className="loc-disclosure-link" style={styles.link} href={privacyPolicyUrl} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          </div>

          <div style={styles.actions}>
            <button
              className="loc-disclosure-secondary-btn"
              style={styles.secondaryBtn}
              onClick={handleNotNow}
              disabled={busy}
              type="button"
            >
              Not now
            </button>
            <button
              className="loc-disclosure-primary-btn"
              style={styles.primaryBtn}
              onClick={handleContinue}
              disabled={busy}
              type="button"
            >
              {busy ? "Requesting…" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    width: "100%",
    minHeight: "100vh",
    background: "linear-gradient(165deg, #fff5f0 0%, #ffede0 35%, #ffd4b8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    borderRadius: 24,
    padding: 28,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    background: "linear-gradient(135deg, #ff9a66 0%, #ff6a2e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    boxShadow: "0 8px 24px rgba(255, 106, 46, 0.35)",
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a1a",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  sub: {
    margin: "6px 0 0 0",
    fontSize: 15,
    color: "#5c5c5c",
    lineHeight: 1.4,
  },
  body: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid #f0eae6",
  },
  list: {
    margin: "0 0 12px 0",
    paddingLeft: 20,
  },
  listItem: {
    marginBottom: 10,
    fontSize: 15,
    color: "#2d2d2d",
    lineHeight: 1.45,
  },
  pMuted: {
    margin: "16px 0 14px 0",
    fontSize: 13,
    color: "#737373",
    lineHeight: 1.45,
  },
  link: {
    fontSize: 14,
    color: "#e64a0c",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 0.15s ease",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 24,
  },
  primaryBtn: {
    flex: 1,
    border: "none",
    background: "linear-gradient(135deg, #ff6a2e 0%, #e64a0c 100%)",
    color: "#ffffff",
    borderRadius: 14,
    padding: "14px 20px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "filter 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease",
  },
  secondaryBtn: {
    flex: 1,
    border: "1px solid #e5e0db",
    background: "#ffffff",
    color: "#4a4a4a",
    borderRadius: 14,
    padding: "14px 20px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
};
