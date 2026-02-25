import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@root/components/ErrorBoundary";
import { ThemeProvider } from "@root/components/ThemeProvider";
import { TooltipProvider } from "@root/components/ui/tooltip";
import { Toaster } from "@root/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import RestaurantAuth from "@root/pages/RestaurantAuth";

// Lazy-load heavy screens so auth loads first and much faster
const MerchantPortal = lazy(() => import("@root/pages/MerchantPortal"));
const RestaurantRegister = lazy(() => import("@root/pages/RestaurantRegister"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #e5e7eb",
            borderTopColor: "#ea580c",
            borderRadius: "50%",
            animation: "merchant-spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <div style={{ fontSize: 14, color: "#6b7280" }}>Loading…</div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  useEffect(() => {
    const lockOrientation = () => {
      try {
        const anyScreen: any = window.screen;
        if (anyScreen?.orientation?.lock) {
          anyScreen.orientation.lock("landscape").catch(() => {});
        }
      } catch {}
    };
    lockOrientation();
    const orientationHandler = () => setTimeout(lockOrientation, 100);
    const resizeHandler = () => setTimeout(lockOrientation, 100);
    window.addEventListener("orientationchange", orientationHandler);
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("orientationchange", orientationHandler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
              <Route path="/restaurant/auth" element={<RestaurantAuth />} />
              <Route path="/auth" element={<Navigate to="/restaurant/auth" replace />} />
              <Route path="/merchant-portal/delete-account" element={<Navigate to="/merchant-portal?tab=settings&section=delete-account" replace />} />
              <Route
                path="/merchant-portal"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <MerchantPortal />
                  </Suspense>
                }
              />
              <Route
                path="/restaurant/register"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <RestaurantRegister />
                  </Suspense>
                }
              />
              <Route path="/" element={<Navigate to="/restaurant/auth" replace />} />
              <Route path="*" element={<Navigate to="/restaurant/auth" replace />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
