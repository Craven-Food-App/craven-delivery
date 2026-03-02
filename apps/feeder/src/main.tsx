/**
 * Feeder app entry – dev server only. Uses root src via alias @.
 * Same routes as App.tsx feeder subdomain block. Root files left unchanged.
 */

// Capture first error so it’s visible in WebView (e.g. Android) even if React never mounts
function captureFirstError() {
  const show = (title: string, body: string) => {
    try {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = `<div style="padding:16px;font-family:system-ui;max-width:480px;margin:0 auto;"><h2 style="color:#b91c1c;">${title}</h2><pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;background:#fef2f2;padding:12px;border-radius:8px;">${body}</pre></div>`;
      }
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
import ActiveDeliveryFlow from "@/components/mobile/ActiveDeliveryFlow";

const queryClient = new QueryClient();

/** Mock order for /delivery-flow dev route – work on the flow in isolation. */
const MOCK_DELIVERY_ORDER = {
  id: "dev-order-1",
  order_id: "dev-order-1",
  order_number: "DEV-001",
  restaurant_name: "Test Restaurant",
  pickup_address: "123 Pickup St",
  dropoff_address: "456 Dropoff Ave",
  customer_name: "Test Customer",
  customer_phone: "+15551234567",
  delivery_notes: "Leave at door",
  payout_cents: 850,
  subtotal_cents: 1200,
  estimated_time: 25,
  items: [{ name: "Sample Item", quantity: 1, price_cents: 1200 }],
  isTestOrder: true,
};

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
                <Route path="/mobile" element={<MobileDriverDashboard />} />
                <Route path="/mobile/background-check-status" element={<MobileBackgroundCheckStatus />} />
                <Route path="/mobile/reset-password" element={<MobilePasswordReset />} />
                <Route
                  path="/delivery-flow"
                  element={
                    <ActiveDeliveryFlow
                      orderDetails={MOCK_DELIVERY_ORDER}
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
