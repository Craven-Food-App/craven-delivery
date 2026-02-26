import React from "react";
import { createRoot } from "react-dom/client";
import { AppWithProviders } from "./AppWithProviders";

// No StrictMode in Capacitor build to avoid double-render issues in Android WebView
createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWithProviders />
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
