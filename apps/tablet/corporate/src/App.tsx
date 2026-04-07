import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@root/components/ErrorBoundary";
import BusinessAuth from "@root/pages/BusinessAuth";
import MainHub from "@root/pages/MainHub";
import InternalCommsPortal from "@root/portals/internal-comms/InternalCommsPortal";
import ExecutiveAuthGuard from "./components/ExecutiveAuthGuard";

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/auth" element={<BusinessAuth />} />
            <Route
              path="/hub/internal-comms"
              element={
                <ExecutiveAuthGuard>
                  <InternalCommsPortal />
                </ExecutiveAuthGuard>
              }
            />
            <Route
              path="/hub"
              element={
                <ExecutiveAuthGuard>
                  <MainHub />
                </ExecutiveAuthGuard>
              }
            />
            <Route path="/" element={<Navigate to="/auth?hq=true&redirect=/hub" replace />} />
            <Route path="*" element={<Navigate to="/auth?hq=true&redirect=/hub" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
