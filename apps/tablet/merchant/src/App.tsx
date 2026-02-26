import React, { useEffect, Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@root/components/ErrorBoundary";
import { ThemeProvider } from "@root/components/ThemeProvider";

// Merchant auth is app-specific (white bg, logo, email + merchant ID + password)
const MerchantAuth = lazy(() => import("@tablet/MerchantAuth"));
const MerchantPortal = lazy(() => import("@root/pages/MerchantPortal"));
const RestaurantRegister = lazy(() => import("@root/pages/RestaurantRegister"));

const RouteFallback = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
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
          animation: "merchant-spin .8s linear infinite",
          margin: "0 auto 12px",
        }}
      />
      <div style={{ fontSize: 14, color: "#6b7280" }}>Loading…</div>
    </div>
    <style>{`@keyframes merchant-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
    // FIX 1: HashRouter is now the OUTERMOST wrapper so useNavigate() always
    // has router context, even inside lazy-loaded chunks loaded via Suspense.
    // FIX 2: ErrorBoundary moved INSIDE HashRouter so it can use router hooks
    // if needed, and router context is guaranteed before any child renders.
    // FIX 3: QueryClientProvider sits between ErrorBoundary and ThemeProvider
    // so React Query hooks always have a client regardless of render order.
    <HashRouter>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/restaurant/auth" element={<MerchantAuth />} />
                <Route
                  path="/auth"
                  element={<Navigate to="/restaurant/auth" replace />}
                />
                <Route
                  path="/merchant-portal/delete-account"
                  element={
                    <Navigate
                      to="/merchant-portal?tab=settings&section=delete-account"
                      replace
                    />
                  }
                />
                <Route path="/merchant-portal" element={<MerchantPortal />} />
                <Route
                  path="/restaurant/register"
                  element={<RestaurantRegister />}
                />
                <Route
                  path="/"
                  element={<Navigate to="/restaurant/auth" replace />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/restaurant/auth" replace />}
                />
              </Routes>
            </Suspense>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
