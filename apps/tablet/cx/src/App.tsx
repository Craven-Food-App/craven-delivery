import React, { Suspense, lazy, useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@root/components/ErrorBoundary";

const CXAuth = lazy(() => import("@tablet/CXAuth"));
const CXOpsWorkspace = lazy(() => import("@tablet/CXOpsWorkspace"));
const MerchantPortal = lazy(() => import("@root/pages/MerchantPortal"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      color: "#94a3b8",
    }}
  >
    Loading…
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    document.body.classList.add("cx-tablet-app");
    const lockOrientation = () => {
      try {
        const anyScreen = window.screen as unknown as {
          orientation?: { lock?: (v: string) => Promise<void> };
        };
        anyScreen?.orientation?.lock?.("landscape").catch(() => {});
      } catch {
        /* ignore */
      }
    };
    lockOrientation();
    const resizeHandler = () => setTimeout(lockOrientation, 100);
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("orientationchange", resizeHandler);
    return () => {
      document.body.classList.remove("cx-tablet-app");
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("orientationchange", resizeHandler);
    };
  }, []);

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/restaurant/auth" element={<CXAuth />} />
              <Route path="/cx-ops" element={<CXOpsWorkspace />} />
              <Route path="/merchant-portal" element={<MerchantPortal />} />
              <Route path="/auth" element={<Navigate to="/restaurant/auth" replace />} />
              <Route path="/" element={<Navigate to="/restaurant/auth" replace />} />
              <Route path="*" element={<Navigate to="/restaurant/auth" replace />} />
            </Routes>
          </Suspense>
        </QueryClientProvider>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
