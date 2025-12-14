import React, { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Navigate, HashRouter, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import GlobalMobileBottomNav from "@/components/mobile/GlobalMobileBottomNav";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Favorites from "./pages/Favorites";
import OrderHistory from "./pages/OrderHistory";
import DriverAuth from "./pages/DriverAuth";
import FeederHub from "./pages/FeederHub";
import IndependentContractorAgreement from "./pages/IndependentContractorAgreement";
import FeederPrivacyPolicy from "./pages/FeederPrivacyPolicy";
import CustomerDashboard from "./pages/CustomerDashboard";
import { MobileDriverDashboard } from "./components/mobile/MobileDriverDashboard";
import MobileBackgroundCheckStatus from "./components/mobile/MobileBackgroundCheckStatus";
import { MobilePasswordReset } from "./components/mobile/MobilePasswordReset";
import AccessGuard from "./components/AccessGuard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MerchantOperationsPortal from "./pages/MerchantOperationsPortal";
import DriverOperationsPortal from "./pages/DriverOperationsPortal";
import CustomerSuccessPortal from "./pages/CustomerSuccessPortal";
import SupportOperationsPortal from "./pages/SupportOperationsPortal";
import TestingPortal from "./pages/TestingPortal";
import RestaurantRegister from "./pages/RestaurantRegister";
import MerchantPortal from "./pages/MerchantPortal";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import RestaurantAuth from "./pages/RestaurantAuth";
import RequestDelivery from "./pages/RequestDelivery";
import SolutionsCenter from "./pages/SolutionsCenter";
import MostLovedProgram from "./pages/MostLovedProgram";
import RestaurantDetail from "./pages/RestaurantDetail";
import RestaurantMenuPage from "./components/restaurant/RestaurantMenuPage";
import Checkout from "./pages/Checkout";
import TrackOrder from "./pages/TrackOrder";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import NotFound from "./pages/NotFound";
import Restaurants from "./pages/Restaurants";
import HelpCenter from "./pages/HelpCenter";
import Safety from "./pages/Safety";
import ContactUs from "./pages/ContactUs";
import PartnerWithUs from "./pages/PartnerWithUs";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import InternshipProgram from "./pages/InternshipProgram";
import Testing from "./pages/Testing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import CraveMore from "./pages/CraveMore";
import CraveMoreAccount from "./pages/CraveMoreAccount";
import CraveMoreSuccess from "./pages/CraveMoreSuccess";
import ExecutiveSignature from "./pages/ExecutiveSignature";
import { ExecutiveDocumentPortal } from "./pages/ExecutiveDocumentPortal";
import ThankYou from "./pages/ThankYou";
import ChatButton from "./components/chat/ChatButton";
import { ThemeProvider } from "./components/ThemeProvider";
import SuspenseLoader from "./components/SuspenseLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { environment, validateEnvironmentConfig } from "./config/environment";
import { DownloadApp } from "./pages/DownloadApp";
import { InstallAppBanner } from "./components/InstallAppBanner";
import { EnhancedDriverOnboarding } from "./pages/EnhancedDriverOnboarding";
import { AdminDriverWaitlist } from "./pages/AdminDriverWaitlist";
import { ProfileCompletionForm } from "./components/onboarding/ProfileCompletionForm";
import { VehiclePhotosUpload } from "./components/onboarding/VehiclePhotosUpload";
import { PayoutSetup } from "./components/onboarding/PayoutSetup";
import { SafetyQuiz } from "./components/onboarding/SafetyQuiz";
import { DriverReferralPage } from "./components/onboarding/DriverReferralPage";
import BoardPortal from "./pages/BoardPortal";
import CFOPortal from "./pages/CFOPortal";
import CEOPortal from "./pages/CEOPortal";
import ExecutiveAccountability from "./pages/ExecutiveAccountability";
import COOPortal from "./pages/COOPortal";
import CTOPortal from "./pages/CTOPortal";
import CXOPortal from "./pages/CXOPortal";
import EnterpriseFinancePortal from "./pages/EnterpriseFinancePortal";
import DriverCompensationPortal from "./pages/DriverCompensationPortal";
import MarketingPortal from "./pages/MarketingPortal";
import HRPortal from "./pages/HRPortal";
import MainHub from "./pages/MainHub";
import DepartmentHub from "./pages/DepartmentHub";
import DeveloperPortal from "./pages/DeveloperPortal";
import BusinessAuth from "./pages/BusinessAuth";
import BusinessAuthWrapper from "./components/BusinessAuthWrapper";
import BusinessAuthGuard from "./components/BusinessAuthGuard";
import { DriverApplicationWizard } from "./pages/driverOnboarding/DriverApplicationWizard";
import { PostWaitlistOnboarding } from "./pages/driverOnboarding/PostWaitlistOnboarding";
import ExecutiveDocumentSign from "./pages/ExecutiveDocumentSign";
import ExecutiveSigningPortal from "./pages/ExecutiveSigningPortal";
import ExecutiveProfile from "./pages/ExecutiveProfile";
import ExecutiveResetPassword from "./pages/ExecutiveResetPassword";
import CompanyPortalLayout from "./portals/company/index";
import CompanyDashboard from "./portals/company/dashboard/CompanyDashboard";
import GovernanceAdminDashboard from "./portals/company/governance-admin/GovernanceAdminDashboard";
import AppointmentList from "./portals/company/governance-admin/AppointmentList";
import NewAppointmentForm from "./portals/company/governance-admin/NewAppointmentForm";
import ResolutionList from "./portals/company/governance-admin/ResolutionList";
import OfficerLedger from "./portals/company/governance-admin/OfficerLedger";
import GovernanceLogList from "./portals/company/governance-admin/GovernanceLogList";
import BoardDashboard from "./portals/company/board/BoardDashboard";
import BoardResolutionDetail from "./portals/company/board/BoardResolutionDetail";
import ExecutiveDashboard from "./portals/company/executives/ExecutiveDashboard";
import MyAppointment from "./portals/company/executives/MyAppointment";
import OfficerDirectoryInternal from "./portals/company/executives/OfficerDirectoryInternal";
import LeadershipPublicPage from "./portals/company/leadership-public/LeadershipPublicPage";
import { TemplateManager } from "./components/board/TemplateManager";

// Lazy load guide pages
const AdminGuide = lazy(() => import("./pages/AdminGuide"));
const RestaurantGuide = lazy(() => import("./pages/RestaurantGuide"));
const DriverGuide = lazy(() => import("./pages/DriverGuide"));

const queryClient = new QueryClient();

// Wrapper component to conditionally render MobileBottomNav based on route
const ConditionalMobileBottomNav = ({ user }: { user: any }) => {
  const location = useLocation();
  
  // Check if route is driver-related or restaurants page
  const isDriverRoute = location.pathname.startsWith('/mobile') || 
                        location.pathname.startsWith('/driver') || 
                        location.pathname.startsWith('/enhanced-onboarding');
  
  if (isDriverRoute || location.pathname === '/restaurants') {
    return null;
  }
  
  return <MobileBottomNav user={user} />;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isHQSubdomain, setIsHQSubdomain] = useState(false);

  // Check and update subdomain status on every URL change
  useEffect(() => {
    const checkSubdomain = () => {
      if (typeof window === 'undefined') return false;
      
      const pathname = window.location.pathname;
      const hostname = window.location.hostname;
      const search = window.location.search;
      
      return (
        pathname === '/hub' ||
        pathname === '/main-hub' ||
        pathname.startsWith('/hub/') ||
        pathname.startsWith('/finance/') ||
        pathname.startsWith('/technology/') ||
        (pathname === '/auth' && search.includes('hq=true')) ||
        hostname === 'hq.cravenusa.com' ||
        (hostname === 'localhost' && 
          (search.includes('hq=true') || 
           pathname.includes('/admin') ||
           pathname.includes('/marketing-portal') ||
           pathname.includes('/hr-portal') ||
           pathname.includes('/ceo') ||
           pathname.includes('/cfo') ||
           pathname.includes('/coo') ||
           pathname.includes('/cto') ||
           pathname.includes('/cxo') ||
           pathname.includes('/finance') ||
           pathname.includes('/board') ||
           pathname.includes('/technology'))) ||
        (hostname === '127.0.0.1' && 
          (search.includes('hq=true') || 
           pathname.includes('/admin') ||
           pathname.includes('/marketing-portal') ||
           pathname.includes('/hr-portal') ||
           pathname.includes('/ceo') ||
           pathname.includes('/cfo') ||
           pathname.includes('/coo') ||
           pathname.includes('/cto') ||
           pathname.includes('/cxo') ||
           pathname.includes('/finance') ||
           pathname.includes('/board') ||
           pathname.includes('/technology'))) ||
        search.includes('hq=true')
      );
    };
    
    // Initial check
    setIsHQSubdomain(checkSubdomain());
    
    // Monitor URL changes via interval (covers all navigation types)
    const intervalId = setInterval(() => {
      const newValue = checkSubdomain();
      setIsHQSubdomain(prev => prev !== newValue ? newValue : prev);
    }, 100);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Check if on feeder subdomain
  const isFeederSubdomain = typeof window !== 'undefined' && 
    (window.location.hostname === 'feeder.cravenusa.com' || 
     window.location.hostname === 'feed.cravenusa.com');

  // Check if on merchant subdomain
  const isMerchantSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'merchant.cravenusa.com';

  // Check if on board subdomain
  const isBoardSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'board.cravenusa.com';

  // Check if on CEO subdomain
  const isCEOSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'ceo.cravenusa.com';
  // Check if on CFO subdomain
  const isCFOSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'cfo.cravenusa.com';
  
  // Check if on COO subdomain
  const isCOOSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'coo.cravenusa.com';
  
  // Check if on CTO subdomain
  const isCTOSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'cto.cravenusa.com';

  useEffect(() => {
    // Validate environment configuration
    if (!validateEnvironmentConfig()) {
      console.error('Environment configuration validation failed');
    }

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hash, pathname, search, origin } = window.location;
    if (hash && hash.includes('type=recovery') && pathname !== '/executive/reset-password') {
      const params = new URLSearchParams(search);
      params.set('reset', 'true');
      const searchSuffix = params.toString();
      const target = `${origin}/executive/reset-password${searchSuffix ? `?${searchSuffix}` : ''}${hash}`;
      window.location.replace(target);
    }
  }, []);

  // Helper to check if current route is driver-related
  const isDriverRoute = (path: string) => {
    return path.startsWith('/mobile') || 
           path.startsWith('/driver') || 
           path.startsWith('/enhanced-onboarding');
  };

  // Check if running on native mobile (iOS/Android)
  const isNative = Capacitor.isNativePlatform();

  // If running on native platform, show only mobile dashboard
  if (isNative) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <Routes>
                <Route path="/mobile" element={
                  <AccessGuard fallback={
                      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="text-center max-w-md">
                          <div className="mb-6 text-6xl">
                            🚗
                          </div>
                          <h1 className="text-2xl font-bold mb-4">Feeder Access Required</h1>
                          <p className="text-muted-foreground text-center mb-6">
                            You need an approved Feeder application to access the mobile portal.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Please log in or apply to become a Feeder driver.
                          </p>
                        </div>
                      </div>
                  }>
                    <MobileDriverDashboard />
                  </AccessGuard>
                } />
                <Route path="/mobile/reset-password" element={<MobilePasswordReset />} />
                <Route path="/driver/post-waitlist-onboarding" element={<PostWaitlistOnboarding />} />
                <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
                <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
                <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
                <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
                <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />
                <Route path="/enhanced-onboarding/referral" element={<DriverReferralPage />} />
                <Route path="*" element={<Navigate to="/mobile" replace />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on HQ/business subdomain, show only business routes
  console.log('🔍 isHQSubdomain:', isHQSubdomain, 'current path:', window.location.pathname);
  if (isHQSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<BusinessAuth />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />
                  <Route path="/hub/department/:departmentName" element={<BusinessAuthGuard><DepartmentHub /></BusinessAuthGuard>} />
                  <Route path="/technology/developer-portal" element={<BusinessAuthGuard><DeveloperPortal /></BusinessAuthGuard>} />
                  <Route path="/main-hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/merchant-operations" element={<MerchantOperationsPortal />} />
                  <Route path="/driver-operations" element={<DriverOperationsPortal />} />
                  <Route path="/customer-success" element={<CustomerSuccessPortal />} />
                  <Route path="/support-operations" element={<SupportOperationsPortal />} />
                  <Route path="/testing" element={<TestingPortal />} />
                    <Route path="/marketing-portal" element={<MarketingPortal />} />
                    <Route path="/hr-portal" element={<BusinessAuthGuard><HRPortal /></BusinessAuthGuard>} />
                    <Route path="/board" element={<BoardPortal />} />
                  <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
                  <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
                  <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
                  <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
                  <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />
                  <Route path="/ceo" element={<BusinessAuthGuard><CEOPortal /></BusinessAuthGuard>} />
                  <Route path="/cfo" element={<BusinessAuthGuard><CFOPortal /></BusinessAuthGuard>} />
                  <Route path="/coo" element={<BusinessAuthGuard><COOPortal /></BusinessAuthGuard>} />
                  <Route path="/cto/*" element={<BusinessAuthGuard><CTOPortal /></BusinessAuthGuard>} />
                  <Route path="/cxo/*" element={<BusinessAuthGuard><CXOPortal /></BusinessAuthGuard>} />
                  <Route path="/finance/*" element={<BusinessAuthGuard><EnterpriseFinancePortal /></BusinessAuthGuard>} />
                  <Route path="/driver-compensation-portal/*" element={<BusinessAuthGuard><DriverCompensationPortal /></BusinessAuthGuard>} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="/company/*" element={<CompanyPortalLayout />}>
                    <Route index element={<CompanyDashboard />} />
                    <Route path="governance-admin" element={<GovernanceAdminDashboard />} />
                    <Route path="governance-admin/appointments" element={<AppointmentList />} />
                    <Route path="governance-admin/appointments/new" element={<NewAppointmentForm />} />
                    <Route path="governance-admin/resolutions" element={<ResolutionList />} />
                    <Route path="governance-admin/officers" element={<OfficerLedger />} />
                    <Route path="governance-admin/logs" element={<GovernanceLogList />} />
                    <Route path="board" element={<BoardDashboard />} />
                    <Route path="board/resolution/:id" element={<BoardResolutionDetail />} />
                    <Route path="executives" element={<ExecutiveDashboard />} />
                    <Route path="executives/my-appointment" element={<MyAppointment />} />
                    <Route path="executives/directory" element={<OfficerDirectoryInternal />} />
                    <Route path="leadership-public" element={<LeadershipPublicPage />} />
                    <Route path="leadership/templates" element={<TemplateManager />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on feeder subdomain, show only feeder-related routes
  if (isFeederSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<FeederHub />} />
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on merchant subdomain, show only merchant-related routes
  if (isMerchantSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<PartnerWithUs />} />
                  <Route path="/register" element={<RestaurantRegister />} />
                  <Route path="/auth" element={<RestaurantAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/dashboard" element={<RestaurantDashboard />} />
                  <Route path="/portal" element={<MerchantPortal />} />
                  <Route path="/solutions" element={<SolutionsCenter />} />
                  <Route path="/most-loved" element={<MostLovedProgram />} />
                  <Route path="/request-delivery" element={<RequestDelivery />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on board subdomain, show only executive board portal
  if (isBoardSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<BoardPortal />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on CFO subdomain, show only CFO portal
  if (isCFOSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<CFOPortal />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on CEO subdomain, show only CEO Command Center
  if (isCEOSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<CEOPortal />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on COO subdomain, show only COO Operations Portal
  if (isCOOSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<COOPortal />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // If on CTO subdomain, show only CTO Technology Portal
  if (isCTOSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<CTOPortal />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // Web version with full routing
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <CartProvider>
            {/* iOS PWA Install Banner */}
            <InstallAppBanner />
            
            <Routes>
              <Route path="/auth" element={<BusinessAuthWrapper />} />
              <Route path="/business-auth" element={<BusinessAuthWrapper />} />
              <Route path="/" element={<Index />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/crave-more" element={<CraveMore />} />
          <Route path="/cravemore" element={<CraveMore />} />
          <Route path="/cravemore/success" element={<CraveMoreSuccess />} />
          <Route path="/account/cravemore" element={<CraveMoreAccount />} />
          <Route path="/driver/auth" element={<DriverAuth />} />
          <Route path="/feeder" element={<FeederHub />} />
          <Route path="/independent-contractor-agreement" element={<IndependentContractorAgreement />} />
          <Route path="/feeder-privacy-policy" element={<FeederPrivacyPolicy />} />
          
          {/* New Driver Application Wizard (Full Page Flow) */}
          <Route path="/driver-onboarding/apply" element={<DriverApplicationWizard />} />
          <Route path="/driver/post-waitlist-onboarding" element={<PostWaitlistOnboarding />} />
          
          {/* Legacy Enhanced Onboarding */}
          <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
          <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
          <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
          <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
          <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />
          <Route path="/enhanced-onboarding/referral" element={<DriverReferralPage />} />
          <Route path="/admin/waitlist" element={<AdminDriverWaitlist />} />
          <Route path="/customer-dashboard" element={<Navigate to="/order-history" replace />} />
          <Route path="/account" element={<CustomerDashboard />} />
          <Route path="/mobile" element={<MobileDriverDashboard />} />
          <Route path="/mobile/background-check-status" element={<MobileBackgroundCheckStatus />} />
          <Route path="/mobile/reset-password" element={<MobilePasswordReset />} />
          <Route path="/restaurant/auth" element={<RestaurantAuth />} />
          <Route path="/restaurant/register" element={<RestaurantRegister />} />
          <Route path="/merchant-portal" element={<MerchantPortal />} />
          <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
          <Route path="/restaurant/:id" element={<RestaurantDetail />} />
          <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
          <Route path="/restaurant/request-delivery" element={<RequestDelivery />} />
          <Route path="/restaurant/solutions" element={<SolutionsCenter />} />
          <Route path="/restaurant/most-loved" element={<MostLovedProgram />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/merchant-operations" element={<MerchantOperationsPortal />} />
          <Route path="/driver-operations" element={<DriverOperationsPortal />} />
          <Route path="/customer-success" element={<CustomerSuccessPortal />} />
          <Route path="/support-operations" element={<SupportOperationsPortal />} />
          <Route path="/testing" element={<TestingPortal />} />
          <Route path="/hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />
          <Route path="/hub/department/:departmentName" element={<BusinessAuthGuard><DepartmentHub /></BusinessAuthGuard>} />
          <Route path="/technology/developer-portal" element={<BusinessAuthGuard><DeveloperPortal /></BusinessAuthGuard>} />
          <Route path="/main-hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />
          <Route path="/hr-portal" element={<BusinessAuthGuard><HRPortal /></BusinessAuthGuard>} />
          <Route path="/board" element={<BusinessAuthGuard><BoardPortal /></BusinessAuthGuard>} />
          <Route path="/cfo" element={<BusinessAuthGuard><CFOPortal /></BusinessAuthGuard>} />
          <Route path="/ceo" element={<BusinessAuthGuard><CEOPortal /></BusinessAuthGuard>} />
          <Route path="/coo" element={<BusinessAuthGuard><COOPortal /></BusinessAuthGuard>} />
                  <Route path="/cto/*" element={<BusinessAuthGuard><CTOPortal /></BusinessAuthGuard>} />
          <Route path="/cxo/*" element={<BusinessAuthGuard><CXOPortal /></BusinessAuthGuard>} />
          <Route path="/finance/*" element={<BusinessAuthGuard><EnterpriseFinancePortal /></BusinessAuthGuard>} />
          <Route path="/driver-compensation-portal/*" element={<BusinessAuthGuard><DriverCompensationPortal /></BusinessAuthGuard>} />
          <Route path="/executive/discipline" element={<BusinessAuthGuard><ExecutiveAccountability /></BusinessAuthGuard>} />
          <Route path="/company/*" element={<CompanyPortalLayout />}>
            <Route index element={<CompanyDashboard />} />
            <Route path="governance-admin" element={<GovernanceAdminDashboard />} />
            <Route path="governance-admin/appointments" element={<AppointmentList />} />
            <Route path="governance-admin/appointments/new" element={<NewAppointmentForm />} />
            <Route path="governance-admin/resolutions" element={<ResolutionList />} />
            <Route path="governance-admin/officers" element={<OfficerLedger />} />
            <Route path="governance-admin/logs" element={<GovernanceLogList />} />
            <Route path="board" element={<BoardDashboard />} />
            <Route path="board/resolution/:id" element={<BoardResolutionDetail />} />
            <Route path="executives" element={<ExecutiveDashboard />} />
            <Route path="executives/my-appointment" element={<MyAppointment />} />
            <Route path="executives/directory" element={<OfficerDirectoryInternal />} />
            <Route path="leadership-public" element={<LeadershipPublicPage />} />
            <Route path="leadership/templates" element={<TemplateManager />} />
          </Route>
          <Route path="/marketing-portal" element={<MarketingPortal />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track-order/:orderId" element={<TrackOrder />} />
          <Route path="/payment-canceled" element={<PaymentCanceled />} />
          {/* Executive signature route */}
          <Route path="/executive/sign" element={<ExecutiveSigningPortal />} />
          <Route path="/executive/profile" element={<ExecutiveProfile />} />
          <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
          <Route path="/executive-portal/documents" element={<ExecutiveDocumentPortal />} />
          <Route path="/thank-you" element={<ThankYou />} />

          {/* Footer pages */}
          <Route path="/help" element={<HelpCenter />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/admin-guide" element={
              <Suspense fallback={<SuspenseLoader message="Loading Admin Guide" />}>
                <AdminGuide />
              </Suspense>
            } />
            <Route path="/restaurant-guide" element={
              <Suspense fallback={<SuspenseLoader message="Loading Restaurant Guide" />}>
                <RestaurantGuide />
              </Suspense>
            } />
            <Route path="/driver-guide" element={
              <Suspense fallback={<SuspenseLoader message="Loading Driver Guide" />}>
                <DriverGuide />
              </Suspense>
            } />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/partner" element={<PartnerWithUs />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/careers/internship" element={<InternshipProgram />} />
          <Route path="/testing" element={<Testing />} />
          
          {/* Legal pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          
          {/* PWA Install page */}
          <Route path="/download" element={<DownloadApp />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Desktop Floating Chat Button */}
        <div className="fixed bottom-6 right-6 z-50 hidden md:block">
          <ChatButton
            type="customer_support"
            userType="customer"
            variant="default"
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
          >
            <span className="sr-only">Chat Support</span>
          </ChatButton>
        </div>

        {/* Global Mobile Bottom Navigation - Shows on all customer pages */}
        <GlobalMobileBottomNav />
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
