import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import SuspenseLoader from "@/components/SuspenseLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MantineProvider } from '@mantine/core'; // ADD THIS
import '@mantine/core/styles.css'; // ADD THIS
import '@mantine/notifications/styles.css'; // ADD THIS
import LoadingScreen from "@/components/LoadingScreen";

// Customer-only pages
import Index from "@/pages/Index";
import Restaurants from "@/pages/Restaurants";
import Favorites from "@/pages/Favorites";
import OrderHistory from "@/pages/OrderHistory";
import CustomerDashboard from "@/pages/CustomerDashboard";
import RestaurantDetail from "@/pages/RestaurantDetail";
import RestaurantMenuPage from "@/components/restaurant/RestaurantMenuPage";
import Checkout from "@/pages/Checkout";
import TrackOrder from "@/pages/TrackOrder";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCanceled from "@/pages/PaymentCanceled";
import Auth from "@/pages/Auth";
import EditProfile from "@/pages/EditProfile";
import PaymentMethods from "@/pages/PaymentMethods";
import DeliveryAddresses from "@/pages/DeliveryAddresses";
import CustomerSupportChat from "@/pages/CustomerSupportChat";
import PromotionDetails from "@/pages/PromotionDetails";
import CraveMore from "@/pages/CraveMore";
import CraveMoreSuccess from "@/pages/CraveMoreSuccess";
import CraveMoreAccount from "@/pages/CraveMoreAccount";
import CraveMoreSubscription from "@/pages/CraveMoreSubscription";
import Notifications from "@/pages/Notifications";
import NotificationSettings from "@/pages/NotificationSettings";
import MyCredits from "@/pages/MyCredits";
import InviteFriends from "@/pages/InviteFriends";
import CuisineResults from "@/pages/CuisineResults";
import PromoManagement from "@/pages/admin/PromoManagement";
import NotFound from "@/pages/NotFound";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { SafeAreaProvider } from "@/components/SafeAreaProvider";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import GlobalMobileBottomNav from "@/components/mobile/GlobalMobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Wait for isMobile to be determined
    if (isMobile === undefined) return;

    // Only show loading screen on mobile devices
    // If isMobile is false (desktop), skip loading screen immediately
    if (isMobile === false) {
      setShowLoadingScreen(false);
      return;
    }

    // Only proceed if we're on mobile (isMobile === true)
    if (isMobile !== true) return;

    // Show loading screen for minimum 6 seconds to allow full animation cycles
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, [isMobile]);

  // Show loading screen first, before anything else (only on mobile)
  // Wait for isMobile to be determined before showing
  if (showLoadingScreen && isMobile === true) {
    return (
      <MantineProvider>
        <LoadingScreen />
      </MantineProvider>
    );
  }

  // Show nothing while determining if mobile (prevents flash of content)
  if (isMobile === undefined && showLoadingScreen) {
    return (
      <MantineProvider>
        <LoadingScreen />
      </MantineProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider> {/* ADD THIS */}
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
                <CartProvider>
                  <SafeAreaProvider>
                    <InstallAppBanner />
                    
                    <MobileLayout>
                    <Routes>
                    <Route path="/" element={<Navigate to="/restaurants" replace />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/restaurants/cuisine/:cuisine" element={<CuisineResults />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/track-order/:orderId" element={<TrackOrder />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-canceled" element={<PaymentCanceled />} />
                    <Route path="/order-history" element={<OrderHistory />} />
                    <Route path="/account" element={<CustomerDashboard />} />
                    <Route path="/account/edit-profile" element={<EditProfile />} />
                    <Route path="/account/payment-methods" element={<PaymentMethods />} />
                    <Route path="/account/delivery-addresses" element={<DeliveryAddresses />} />
                    <Route path="/account/my-credits" element={<MyCredits />} />
                    <Route path="/my-credits" element={<MyCredits />} />
                    <Route path="/invite-friends" element={<InviteFriends />} />
                    <Route path="/customer-support" element={<CustomerSupportChat />} />
                    <Route path="/promotion-details" element={<PromotionDetails />} />
                    <Route path="/customer-dashboard" element={<Navigate to="/restaurants" replace />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/notification-settings" element={<NotificationSettings />} />
                    <Route path="/admin/promo" element={<PromoManagement />} />
                    <Route path="/crave-more" element={<CraveMore />} />
                    <Route path="/crave-more-subscription" element={<CraveMoreSubscription />} />
                    <Route path="/cravemore" element={<CraveMore />} />
                    <Route path="/cravemore/success" element={<CraveMoreSuccess />} />
                    <Route path="/account/cravemore" element={<CraveMoreAccount />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                    </MobileLayout>
                    
                    {/* Global bottom navigation */}
                    <GlobalMobileBottomNav />
                  </SafeAreaProvider>
                </CartProvider>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </MantineProvider> {/* ADD THIS */}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;