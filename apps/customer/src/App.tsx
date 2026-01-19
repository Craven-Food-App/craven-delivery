import React from "react";
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
import Notifications from "@/pages/Notifications";
import CuisineResults from "@/pages/CuisineResults";
import PromoManagement from "@/pages/admin/PromoManagement";
import NotFound from "@/pages/NotFound";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { SafeAreaProvider } from "@/components/SafeAreaProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
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
                    <Route path="/customer-support" element={<CustomerSupportChat />} />
                    <Route path="/promotion-details" element={<PromotionDetails />} />
                    <Route path="/customer-dashboard" element={<Navigate to="/restaurants" replace />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/admin/promo" element={<PromoManagement />} />
                    <Route path="/crave-more" element={<CraveMore />} />
                    <Route path="/cravemore" element={<CraveMore />} />
                    <Route path="/cravemore/success" element={<CraveMoreSuccess />} />
                    <Route path="/account/cravemore" element={<CraveMoreAccount />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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