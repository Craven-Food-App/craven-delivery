import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@root/components/ErrorBoundary";
import { ThemeProvider } from "@root/components/ThemeProvider";
import { TooltipProvider } from "@root/components/ui/tooltip";
import { Toaster } from "@root/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import RestaurantAuth from "@root/pages/RestaurantAuth";
import MerchantPortal from "@root/pages/MerchantPortal";
import RestaurantRegister from "@root/pages/RestaurantRegister";

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
            <Route path="/merchant-portal" element={<MerchantPortal />} />
            <Route path="/restaurant/register" element={<RestaurantRegister />} />
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
