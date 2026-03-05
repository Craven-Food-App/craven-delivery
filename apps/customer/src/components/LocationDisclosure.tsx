import React, { useState } from "react";
import type { CSSProperties } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { LOCATION_DISCLOSURE_KEY } from "@/utils/locationDisclosure";

type Props = {
  onDone: (enabled: boolean) => void;
  privacyPolicyUrl?: string;
};

export default function LocationDisclosure({
  onDone,
  privacyPolicyUrl = "https://cravenusa.com/privacy",
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

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandDot} />
          <div>
            <div style={styles.title}>Enable location</div>
            <div style={styles.sub}>This helps Crave’n work properly.</div>
          </div>
        </div>

        <div style={styles.body}>
          <p style={styles.p}>
            Crave’n uses your location to show restaurants and stores near you.
          </p>
          <p style={styles.p}>
            For delivery, it’s used to calculate distance and support driver
            navigation/tracking.
          </p>
          <p style={styles.pMuted}>
            Location is only used while you’re using the app.
          </p>

          <a
            style={styles.link}
            href={privacyPolicyUrl}
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryBtn}
            onClick={handleNotNow}
            disabled={busy}
            type="button"
          >
            Not now
          </button>
          <button
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
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    height: "100vh",
    width: "100vw",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  },
  header: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  brandDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "#f97316",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
  },
  sub: {
    marginTop: 4,
    fontSize: 13,
    color: "#374151",
  },
  body: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  p: {
    margin: "10px 0",
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.5,
  },
  pMuted: {
    margin: "10px 0 12px",
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  link: {
    fontSize: 13,
    color: "#111827",
    textDecoration: "underline",
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 10,
  },
  primaryBtn: {
    border: "1px solid #111827",
    background: "#111827",
    color: "#ffffff",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #111827",
    background: "#ffffff",
    color: "#111827",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};

