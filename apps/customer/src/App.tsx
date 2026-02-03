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
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import CraveMoreTermsPage from "@/pages/CraveMoreTermsPage";
import Notifications from "@/pages/Notifications";
import NotificationSettings from "@/pages/NotificationSettings";
import MyCredits from "@/pages/MyCredits";
import InviteFriends from "@/pages/InviteFriends";
import CuisineResults from "@/pages/CuisineResults";
import PromoManagement from "@/pages/admin/PromoManagement";
import NotFound from "@/pages/NotFound";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { useTesterCreditIssuance } from "@/hooks/useTesterCreditIssuance.tsx";
import { useTesterActivityTracking } from "@/hooks/useTesterActivityTracking";
import { useTesterActivation } from "@/hooks/useTesterActivation";
import { useTesterFeedbackPrompts } from "@/hooks/useTesterFeedbackPrompts.tsx";
import TesterHub from "@/components/TesterHub";
import TesterReferMerchant from "@/pages/TesterReferMerchant";
import TesterDriverInterest from "@/pages/TesterDriverInterest";
import TesterInviteFriends from "@/pages/TesterInviteFriends";
import { SafeAreaProvider } from "@/components/SafeAreaProvider";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import GlobalMobileBottomNav from "@/components/mobile/GlobalMobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
  // Auto-issue tester credits when user signs up with enrolled email
  const rewardModal = useTesterCreditIssuance();
  // Track activity on app launch
  useTesterActivityTracking();
  // Activate enrollment when account is created
  useTesterActivation();
  // Auto-trigger feedback prompts
  const feedbackPrompts = useTesterFeedbackPrompts();

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
                    {/* Public Routes - Guest browsing allowed */}
                    <Route path="/" element={<Navigate to="/restaurants" replace />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/restaurants/cuisine/:cuisine" element={<CuisineResults />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
                    <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/legal/terms" element={<TermsOfServicePage />} />
                    <Route path="/legal/cravemore" element={<CraveMoreTermsPage />} />
                    <Route path="/promotion-details" element={<PromotionDetails />} />
                    
                    {/* Protected Routes - Require authentication */}
                    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                    <Route path="/track-order/:orderId" element={<ProtectedRoute><TrackOrder /></ProtectedRoute>} />
                    <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                    <Route path="/payment-canceled" element={<ProtectedRoute><PaymentCanceled /></ProtectedRoute>} />
                    <Route path="/order-history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                    <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                    
                    {/* Account & Settings - Protected */}
                    <Route path="/account" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
                    <Route path="/account/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                    <Route path="/account/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
                    <Route path="/account/delivery-addresses" element={<ProtectedRoute><DeliveryAddresses /></ProtectedRoute>} />
                    <Route path="/account/my-credits" element={<ProtectedRoute><MyCredits /></ProtectedRoute>} />
                    <Route path="/my-credits" element={<ProtectedRoute><MyCredits /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                    
                    {/* Tester Program - Protected */}
                    <Route path="/account/tester-hub" element={<ProtectedRoute><TesterHub /></ProtectedRoute>} />
                    <Route path="/tester-hub" element={<ProtectedRoute><TesterHub /></ProtectedRoute>} />
                    <Route path="/tester/refer-merchant" element={<ProtectedRoute><TesterReferMerchant /></ProtectedRoute>} />
                    <Route path="/tester/driver-interest" element={<ProtectedRoute><TesterDriverInterest /></ProtectedRoute>} />
                    <Route path="/tester/invite-friends" element={<ProtectedRoute><TesterInviteFriends /></ProtectedRoute>} />
                    <Route path="/invite-friends" element={<ProtectedRoute><InviteFriends /></ProtectedRoute>} />
                    
                    {/* Crave More Subscription - Protected */}
                    <Route path="/crave-more" element={<ProtectedRoute><CraveMore /></ProtectedRoute>} />
                    <Route path="/crave-more-subscription" element={<ProtectedRoute><CraveMoreSubscription /></ProtectedRoute>} />
                    <Route path="/cravemore" element={<ProtectedRoute><CraveMore /></ProtectedRoute>} />
                    <Route path="/cravemore/success" element={<ProtectedRoute><CraveMoreSuccess /></ProtectedRoute>} />
                    <Route path="/account/cravemore" element={<ProtectedRoute><CraveMoreAccount /></ProtectedRoute>} />
                    
                    {/* Support & Admin - Protected */}
                    <Route path="/customer-support" element={<ProtectedRoute><CustomerSupportChat /></ProtectedRoute>} />
                    <Route path="/admin/promo" element={<ProtectedRoute><PromoManagement /></ProtectedRoute>} />
                    
                    {/* Redirects & Fallback */}
                    <Route path="/customer-dashboard" element={<Navigate to="/restaurants" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                    </MobileLayout>
                    {rewardModal}
                    {feedbackPrompts}
                    
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