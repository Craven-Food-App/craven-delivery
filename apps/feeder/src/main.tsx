/**
 * Feeder app entry – dev server only. Uses root src via alias @.
 * Same routes as App.tsx feeder subdomain block. Root files left unchanged.
 */

// Capture first error so it’s visible in WebView (e.g. Android) even if React never mounts
function captureFirstError() {
  const show = (title: string, body: string) => {
    const globalShow = (window as any).__showFeederErrorOverlay as
      | ((t: string, b: string) => void)
      | undefined;
    if (globalShow) {
      globalShow(title, body);
      return;
    }
    try {
      const root = document.getElementById("root");
      if (root) root.style.display = "none";
      let overlay = document.getElementById("feeder-error-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "feeder-error-overlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;overflow:auto;";
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = `<div style="padding:16px;font-family:system-ui;max-width:480px;margin:0 auto;"><h2 style="color:#b91c1c;margin-bottom:8px;">${title}</h2><pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;background:#fef2f2;padding:12px;border-radius:8px;">${String(
        body
      ).replace(/</g, "&lt;")}</pre></div>`;
    } catch {}
  };
  window.onerror = (msg, url, line, col, err) => {
    const body = [err?.message ?? msg, err?.stack, `at ${url}:${line}:${col}`].filter(Boolean).join("\n\n");
    show("Feeder load error", body);
    console.error("Feeder load error:", msg, url, line, col, err);
    return false;
  };
  window.onunhandledrejection = (e) => {
    const body = (e.reason?.message ?? String(e.reason)) + (e.reason?.stack ? "\n\n" + e.reason.stack : "");
    show("Feeder unhandled rejection", body);
    console.error("Feeder unhandled rejection:", e.reason);
  };
}
captureFirstError();

// Lock to portrait when supported (Capacitor WebView, PWA standalone)
try {
  const screen = (window as any).screen;
  if (screen?.orientation?.lock) {
    screen.orientation.lock('portrait').catch(() => {});
  }
} catch (_) {}

import "barcode-detector/polyfill";
import "@/index.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { initSentry } from "@/integrations/sentry";
import React from "react";

try {
  initSentry();
} catch (e) {
  console.warn("Sentry init failed:", e);
}
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CartProvider } from "@/contexts/CartContext";

const mantineTheme = createTheme({
  primaryColor: "orange",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  defaultRadius: "md",
});

import FeederHub from "@/pages/FeederHub";
import DriverAuth from "@/pages/DriverAuth";
import { MobileDriverDashboard } from "@/components/mobile/MobileDriverDashboard";
import MobileBackgroundCheckStatus from "@/components/mobile/MobileBackgroundCheckStatus";
import { MobilePasswordReset } from "@/components/mobile/MobilePasswordReset";
import { EnhancedDriverOnboarding } from "@/pages/EnhancedDriverOnboarding";
import { ProfileCompletionForm } from "@/components/onboarding/ProfileCompletionForm";
import { VehiclePhotosUpload } from "@/components/onboarding/VehiclePhotosUpload";
import { PayoutSetup } from "@/components/onboarding/PayoutSetup";
import { SafetyQuiz } from "@/components/onboarding/SafetyQuiz";
import { DriverReferralPage } from "@/components/onboarding/DriverReferralPage";
import { PostWaitlistOnboarding } from "@/pages/driverOnboarding/PostWaitlistOnboarding";
import ExecutiveProfile from "@/pages/ExecutiveProfile";
import ExecutiveResetPassword from "@/pages/ExecutiveResetPassword";
import DeliveryFlowWithRealData from "@/components/mobile/DeliveryFlowWithRealData";

const queryClient = new QueryClient();

function FeederApp() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={mantineTheme}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <ThemeProvider defaultTheme="light">
              <CartProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      {/* Main feeder driver dashboard */}
                      <Route path="/" element={<MobileDriverDashboard />} />
                      <Route path="/mobile" element={<MobileDriverDashboard />} />
                      <Route path="/feeder" element={<FeederHub />} />
                      <Route path="/driver/auth" element={<DriverAuth />} />
                      <Route path="/driver/post-waitlist-onboarding" element={<PostWaitlistOnboarding />} />
                      <Route path="/executive/profile" element={<ExecutiveProfile />} />
                      <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                      <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
                      <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
                      <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
                      <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
                      <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />
                      <Route path="/enhanced-onboarding/referral" element={<DriverReferralPage />} />
                      <Route path="/mobile/background-check-status" element={<MobileBackgroundCheckStatus />} />
                      <Route path="/mobile/reset-password" element={<MobilePasswordReset />} />
                      {/* New delivery flow preview route – uses real data from database */}
                      <Route
                        path="/delivery-flow"
                        element={
                          <DeliveryFlowWithRealData
                            onCompleteDelivery={() => console.log("Delivery complete (dev)")}
                          />
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </CartProvider>
            </ThemeProvider>
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FeederApp />
  </React.StrictMode>
);
