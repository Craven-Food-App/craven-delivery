import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";

const LOAD_TIMEOUT_MS = 20000;

const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #e5e7eb",
  borderTopColor: "#ea580c",
  borderRadius: "50%",
  animation: "merchant-spin 0.8s linear infinite",
  margin: "0 auto 12px",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "100vh",
  background: "#fff",
};

function Bootstrap() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const loadApp = useCallback(() => {
    setError(null);
    setTimedOut(false);
    setAppComponent(null);

    const timeoutId = setTimeout(() => {
      setTimedOut(true);
    }, LOAD_TIMEOUT_MS);

    import("./AppWithProviders")
      .then((mod) => {
        clearTimeout(timeoutId);
        setAppComponent(() => mod.AppWithProviders);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        setError(err?.message || "Failed to load");
      });
  }, []);

  useEffect(() => {
    loadApp();
  }, [loadApp, retryKey]); // retryKey forces re-run when user clicks Try again

  if (AppComponent) {
    return <AppComponent />;
  }

  if (error || timedOut) {
    return (
      <div style={{ ...containerStyle, flexDirection: "column", padding: 24 }}>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16, textAlign: "center" }}>
          {timedOut ? "Taking longer than usual…" : "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            background: "#ea580c",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: "center" }}>
        <div style={spinnerStyle} />
        <div style={{ fontSize: 14, color: "#6b7280" }}>Loading…</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>
);

// Orientation lock after first paint (non-blocking)
const lockOrientation = () => {
  try {
    const s = (window as unknown as { screen?: { orientation?: { lock?: (o: string) => Promise<unknown> } } }).screen;
    s?.orientation?.lock?.("landscape")?.catch(() => {});
  } catch {}
};
setTimeout(lockOrientation, 100);
if (typeof window !== "undefined") {
  window.addEventListener("orientationchange", () => setTimeout(lockOrientation, 100));
  window.addEventListener("resize", () => setTimeout(lockOrientation, 100));
}
