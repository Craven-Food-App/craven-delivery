import React, { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
  PermissionStatus,
} from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

import { supabase } from "@/integrations/supabase/client";
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

import Auth from "./pages/Auth";
const Admin = lazy(() => import("./pages/Admin"));

// Operations portals - lazy loaded
const MerchantOperationsPortal = lazy(() => import("./pages/MerchantOperationsPortal"));
const DriverOperationsPortal = lazy(() => import("./pages/DriverOperationsPortal"));
const CustomerSuccessPortal = lazy(() => import("./pages/CustomerSuccessPortal"));
const SupportOperationsPortal = lazy(() => import("./pages/SupportOperationsPortal"));
const TestingPortal = lazy(() => import("./pages/TestingPortal"));

import RestaurantRegister from "./pages/RestaurantRegister";
import MerchantLandingPage from "./components/merchant/MerchantLandingPage";
const MerchantPortal = lazy(() => import("./pages/MerchantPortal"));

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
import AndroidTesterEnrollment from "./pages/AndroidTesterEnrollment";

// Import customer app pages
import CuisineResults from "./pages/CuisineResults";
import EditProfile from "./pages/EditProfile";
import PaymentMethods from "./pages/PaymentMethods";
import DeliveryAddresses from "./pages/DeliveryAddresses";
import MyCredits from "./pages/MyCredits";
import TesterHub from "./components/TesterHub";
import TesterReferMerchant from "./pages/TesterReferMerchant";
import TesterDriverInterest from "./pages/TesterDriverInterest";
import TesterInviteFriends from "./pages/TesterInviteFriends";
import CustomerSupportChat from "./pages/CustomerSupportChat";
import PromotionDetails from "./pages/PromotionDetails";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import PromoManagement from "./pages/admin/PromoManagement";
import CraveMoreSubscription from "./pages/CraveMoreSubscription";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import CraveMoreTermsPage from "./pages/CraveMoreTermsPage";

// Tester enrollment hooks
import { useTesterCreditIssuance } from "./hooks/useTesterCreditIssuance";
import { useTesterActivityTracking } from "./hooks/useTesterActivityTracking";
import { useTesterActivation } from "./hooks/useTesterActivation";
import { useTesterFeedbackPrompts } from "./hooks/useTesterFeedbackPrompts";

import HelpCenter from "./pages/HelpCenter";
import Safety from "./pages/Safety";
import ContactUs from "./pages/ContactUs";
import PartnerWithUs from "./pages/PartnerWithUs";
import AboutUs from "./pages/AboutUs";
import PitchDeck from "./pages/PitchDeck";
import InvestorsLanding from "./pages/InvestorsLanding";
import InvestorAccess from "./pages/legacy/InvestorAccess";
import InvestorLogin from "./pages/InvestorLogin";
import InvestorOverview from "./pages/InvestorOverview";
import InvestorInterest from "./pages/InvestorInterest";
import InvestorOpportunities from "./pages/InvestorOpportunities";
import InvestorPortal from "./pages/InvestorPortal";
import InvestorRequestStatus from "./pages/InvestorRequestStatus";
import PitchDeckPresentation from "./pages/PitchDeckPresentation";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import FinancialProjections from "./pages/FinancialProjections";
import UseOfFunds from "./pages/UseOfFunds";
import Careers from "./pages/Careers";
import InternshipProgram from "./pages/InternshipProgram";
import Testing from "./pages/Testing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DriveOnDemandMerchantTerms from "./pages/DriveOnDemandMerchantTerms";
import CookiePolicy from "./pages/CookiePolicy";
import CraveMore from "./pages/CraveMore";
import CraveMoreAccount from "./pages/CraveMoreAccount";
import CraveMoreSuccess from "./pages/CraveMoreSuccess";
import Support from "./pages/Support";
import Access from "./pages/Access";
import Allocate from "./pages/Allocate";
import Success from "./pages/Success";
import HubFoundationalInvites from "./pages/HubFoundationalInvites";

const HubInvestorDemoManagement = lazy(() => import("./pages/HubInvestorDemoManagement"));
const InvestorDemoAccess = lazy(() => import("./pages/InvestorDemoAccess"));
const InvestorDemoPortal = lazy(() => import("./pages/InvestorDemoPortal"));
const InvestorDemoCustomer = lazy(() => import("./pages/InvestorDemoCustomer"));
const InvestorDemoMerchant = lazy(() => import("./pages/InvestorDemoMerchant"));
const InvestorDemoDriver = lazy(() => import("./pages/InvestorDemoDriver"));

import ExecutiveSignature from "./pages/ExecutiveSignature";
import { ExecutiveDocumentPortal } from "./pages/ExecutiveDocumentPortal";
import ThankYou from "./pages/ThankYou";
import ChatButton from "./components/chat/ChatButton";
import { ThemeProvider } from "./components/ThemeProvider";
import SuspenseLoader from "./components/SuspenseLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { validateEnvironmentConfig } from "./config/environment";
import { DownloadApp } from "./pages/DownloadApp";
import { InstallAppBanner } from "./components/InstallAppBanner";
import { EnhancedDriverOnboarding } from "./pages/EnhancedDriverOnboarding";
import { AdminDriverWaitlist } from "./pages/AdminDriverWaitlist";
import { ProfileCompletionForm } from "./components/onboarding/ProfileCompletionForm";
import { VehiclePhotosUpload } from "./components/onboarding/VehiclePhotosUpload";
import { PayoutSetup } from "./components/onboarding/PayoutSetup";
import { SafetyQuiz } from "./components/onboarding/SafetyQuiz";
import { DriverReferralPage } from "./components/onboarding/DriverReferralPage";

// Heavy portals - lazy loaded for performance
const CFOPortal = lazy(() => import("./pages/CFOPortal"));
const CEOPortal = lazy(() => import("./pages/CEOPortal"));
const ExecutiveAccountability = lazy(() => import("./pages/ExecutiveAccountability"));
const COOPortal = lazy(() => import("./pages/COOPortal"));
const CTOPortal = lazy(() => import("./pages/CTOPortal"));
const CXOPortal = lazy(() => import("./pages/CXOPortal"));
const EngineeringWorkspace = lazy(() => import("./pages/EngineeringWorkspace"));
const PlatformInfrastructureHub = lazy(() => import("./pages/PlatformInfrastructureHub"));
const ProductCommandCenter = lazy(() => import("./pages/ProductCommandCenter"));
const QualityReleasePortal = lazy(() => import("./pages/QualityReleasePortal"));
const InternalITOperations = lazy(() => import("./pages/InternalITOperations"));
const DriverCompensationPortal = lazy(() => import("./pages/DriverCompensationPortal"));
const MarketingPortal = lazy(() => import("./pages/MarketingPortal"));
const HRPortal = lazy(() => import("./pages/HRPortal"));

import MainHub from "./pages/MainHub";
import DepartmentHub from "./pages/DepartmentHub";
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal"));

import BusinessAuth from "./pages/BusinessAuth";
import BusinessAuthWrapper from "./components/BusinessAuthWrapper";
import BusinessAuthGuard from "./components/BusinessAuthGuard";

import { DriverApplicationWizard } from "./pages/driverOnboarding/DriverApplicationWizard";
import { PostWaitlistOnboarding } from "./pages/driverOnboarding/PostWaitlistOnboarding";
import ExecutiveSigningPortal from "./pages/ExecutiveSigningPortal";
import ExecutiveProfile from "./pages/ExecutiveProfile";
import ExecutiveResetPassword from "./pages/ExecutiveResetPassword";

// Company Portal - New Structure
import CompanyPortalRoutes from "./portals/company/CompanyPortalRoutes";
// SOP Portal - Standalone
import SOPPortalRoutes from "./portals/sop/SOPPortalRoutes";
// Templates Portal - Standalone
import TemplatesPortalRoutes from "./portals/templates/TemplatesPortalRoutes";

// Intern & Manager Portals - lazy loaded
const InternPortalLayout = lazy(() => import("./portals/intern/InternPortalLayout"));
const InternDashboard = lazy(() => import("./portals/intern/dashboard/InternDashboard"));
const InternTraining = lazy(() => import("./portals/intern/training/InternTraining"));
const InternWork = lazy(() => import("./portals/intern/work/InternWork"));
const InternPerformance = lazy(() => import("./portals/intern/performance/InternPerformance"));
const InternAcademicCredit = lazy(() => import("./portals/intern/academic/InternAcademicCredit"));
const InternConversion = lazy(() => import("./portals/intern/conversion/InternConversion"));
const InternExit = lazy(() => import("./portals/intern/exit/InternExit"));

const ManagerPortalLayout = lazy(() => import("./portals/manager/ManagerPortalLayout"));
const ManagerDashboard = lazy(() => import("./portals/manager/dashboard/ManagerDashboard"));
const ManagerInternDetail = lazy(() => import("./portals/manager/interns/ManagerInternDetail"));
const ManagerReviews = lazy(() => import("./portals/manager/reviews/ManagerReviews"));
const ManagerApprovals = lazy(() => import("./portals/manager/approvals/ManagerApprovals"));

const SponsorPortalLayout = lazy(() => import("./portals/executive-sponsor/SponsorPortalLayout"));
const SponsorPipeline = lazy(() => import("./portals/executive-sponsor/pipeline/SponsorPipeline"));
const SponsorInternDetail = lazy(() => import("./portals/executive-sponsor/interns/SponsorInternDetail"));
const SponsorApprovals = lazy(() => import("./portals/executive-sponsor/approvals/SponsorApprovals"));

const AdminInternProgramLayout = lazy(() => import("./portals/intern-program-admin/AdminInternProgramLayout"));
const InternProgramDashboard = lazy(() => import("./portals/intern-program-admin/dashboard/InternProgramDashboard"));
const InternRolesPermissions = lazy(() => import("./portals/intern-program-admin/roles/InternRolesPermissions"));
const InternProgramTemplates = lazy(() => import("./portals/intern-program-admin/templates/InternProgramTemplates"));
const InternsTable = lazy(() => import("./portals/intern-program-admin/interns/InternsTable"));
const TestModuleLibrary = lazy(() => import("./portals/intern-program-admin/test-modules/TestModuleLibrary"));
const RoleTracksPlaylists = lazy(() => import("./portals/intern-program-admin/role-tracks/RoleTracksPlaylists"));
const PromotionRulesEngine = lazy(() => import("./portals/intern-program-admin/promotion-rules/PromotionRulesEngine"));
const ReviewsEnforcement = lazy(() => import("./portals/intern-program-admin/reviews/ReviewsEnforcement"));
const AuditLog = lazy(() => import("./portals/intern-program-admin/audit-log/AuditLog"));

const SponsorPortalLayoutV2 = lazy(() => import("./portals/sponsor-portal/SponsorPortalLayout"));
const SponsorOverview = lazy(() => import("./portals/sponsor-portal/overview/SponsorOverview"));
const ApprovalQueue = lazy(() => import("./portals/sponsor-portal/approval-queue/ApprovalQueue"));
const SponsorInterns = lazy(() => import("./portals/sponsor-portal/interns/SponsorInterns"));
const EnforcementApprovals = lazy(() => import("./portals/sponsor-portal/enforcement/EnforcementApprovals"));
const SponsorAuditLog = lazy(() => import("./portals/sponsor-portal/audit-log/SponsorAuditLog"));

// Lazy load guide pages
const AdminGuide = lazy(() => import("./pages/AdminGuide"));
const RestaurantGuide = lazy(() => import("./pages/RestaurantGuide"));
const DriverGuide = lazy(() => import("./pages/DriverGuide"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));

const queryClient = new QueryClient();

// Wrapper component for tester enrollment hooks
const TesterHooksWrapper = () => {
  const rewardModal = useTesterCreditIssuance();
  useTesterActivityTracking();
  useTesterActivation();
  const feedbackPrompts = useTesterFeedbackPrompts();

  return (
    <>
      {rewardModal}
      {feedbackPrompts}
    </>
  );
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [isHQSubdomain, setIsHQSubdomain] = useState(false);

  // Native platform detection
  const isNative = Capacitor.isNativePlatform();

  /**
   * PUSH NOTIFICATIONS INIT (NATIVE ONLY)
   * - Requests runtime permission (Android 13+)
   * - Registers for FCM/APNS
   * - Logs token to console (Logcat will show it)
   * - Creates an Android channel so sound can work
   */
  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    const initPush = async () => {
      try {
        // 1) Create Android notification channel (this is where sound/importance live)
        // IMPORTANT: Your FCM payload should specify this channel_id, or Android will use a default channel with no sound.
        try {
          await LocalNotifications.createChannel({
            id: "orders",
            name: "Orders",
            description: "Order updates and dispatch alerts",
            importance: 5, // Max importance
            visibility: 1, // Public on lock screen
            sound: "default",
            vibration: true,
            lights: true,
          });
          console.log("[Push] Android channel created: orders");
        } catch (e) {
          // createChannel is Android-only; safe to ignore if it throws elsewhere
          console.log("[Push] createChannel skipped/failed:", e);
        }

        // 2) Request notification permission
        const permStatus: PermissionStatus = await PushNotifications.requestPermissions();
        console.log("[Push] Permission status:", permStatus);

        if (permStatus.receive !== "granted") {
          console.log("[Push] Permission not granted. No push token will be issued.");
          return;
        }

        // 3) Register with FCM/APNS
        await PushNotifications.register();

        // 4) Token / errors / receive / tap handlers
        PushNotifications.addListener("registration", (token: Token) => {
          if (cancelled) return;
          console.log("FCM TOKEN:", token.value);
          // If you want: send token to Supabase here
        });

        PushNotifications.addListener("registrationError", (err: any) => {
          if (cancelled) return;
          console.log("FCM REG ERROR:", JSON.stringify(err));
        });

        PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
          if (cancelled) return;
          console.log("[Push] Received:", notification);

          // Optional: show a local notification to force foreground presentation + sound
          // (FCM sometimes won’t “notify” if app is foreground)
          const title = notification.title || "Crave'n";
          const body = notification.body || "New update";
          void LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),
                title,
                body,
                schedule: { at: new Date(Date.now() + 200) },
                sound: "default",
                channelId: "orders",
              },
            ],
          });
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
          if (cancelled) return;
          console.log("[Push] Action performed:", action);
          // action.notification?.data has payload if you send it
        });
      } catch (e) {
        console.log("[Push] initPush failed:", e);
      }
    };

    void initPush();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  // Check and update subdomain status on URL change
  useEffect(() => {
    const checkSubdomain = () => {
      if (typeof window === "undefined") return false;

      const pathname = window.location.pathname;
      const hostname = window.location.hostname;
      const search = window.location.search;

      return (
        pathname === "/hub" ||
        pathname === "/main-hub" ||
        pathname.startsWith("/hub/") ||
        pathname.startsWith("/finance/") ||
        pathname.startsWith("/technology/") ||
        (pathname === "/auth" && search.includes("hq=true")) ||
        hostname === "hq.cravenusa.com" ||
        (hostname === "localhost" &&
          (search.includes("hq=true") ||
            pathname.includes("/admin") ||
            pathname.includes("/marketing-portal") ||
            pathname.includes("/hr-portal") ||
            pathname.includes("/ceo") ||
            pathname.includes("/cfo") ||
            pathname.includes("/coo") ||
            pathname.includes("/cto") ||
            pathname.includes("/cxo") ||
            pathname.includes("/finance") ||
            pathname.includes("/board") ||
            pathname.includes("/technology"))) ||
        (hostname === "127.0.0.1" &&
          (search.includes("hq=true") ||
            pathname.includes("/admin") ||
            pathname.includes("/marketing-portal") ||
            pathname.includes("/hr-portal") ||
            pathname.includes("/ceo") ||
            pathname.includes("/cfo") ||
            pathname.includes("/coo") ||
            pathname.includes("/cto") ||
            pathname.includes("/cxo") ||
            pathname.includes("/finance") ||
            pathname.includes("/board") ||
            pathname.includes("/technology"))) ||
        search.includes("hq=true")
      );
    };

    setIsHQSubdomain(checkSubdomain());

    const handleNavigation = () => {
      const newValue = checkSubdomain();
      setIsHQSubdomain((prev) => (prev !== newValue ? newValue : prev));
    };

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  // Subdomain checks
  const isFeederSubdomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "feeder.cravenusa.com" || window.location.hostname === "feed.cravenusa.com");

  const isMerchantSubdomain = typeof window !== "undefined" && window.location.hostname === "merchant.cravenusa.com";
  const isBoardSubdomain = typeof window !== "undefined" && window.location.hostname === "board.cravenusa.com";
  const isCEOSubdomain = typeof window !== "undefined" && window.location.hostname === "ceo.cravenusa.com";
  const isCFOSubdomain = typeof window !== "undefined" && window.location.hostname === "cfo.cravenusa.com";
  const isCOOSubdomain = typeof window !== "undefined" && window.location.hostname === "coo.cravenusa.com";
  const isCTOSubdomain = typeof window !== "undefined" && window.location.hostname === "cto.cravenusa.com";

  useEffect(() => {
    if (!validateEnvironmentConfig()) {
      console.error("Environment configuration validation failed");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Recovery hash redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hash, pathname, search, origin } = window.location;

    if (hash && hash.includes("type=recovery") && pathname !== "/executive/reset-password") {
      const params = new URLSearchParams(search);
      params.set("reset", "true");
      const searchSuffix = params.toString();
      const target = `${origin}/executive/reset-password${searchSuffix ? `?${searchSuffix}` : ""}${hash}`;
      window.location.replace(target);
    }
  }, []);

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
                <Route path="/mobile" element={<MobileDriverDashboard />} />
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

  // HQ routes
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

                  <Route
                    path="/hub"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Hub" />}>
                          <MainHub />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/hub/foundational/invites"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Foundational Invites" />}>
                          <HubFoundationalInvites />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/hub/investor-demo"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Investor Demo Management" />}>
                          <HubInvestorDemoManagement />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/investor-demo-access"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Demo Access" />}>
                        <InvestorDemoAccess />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/investor-demo"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Demo Portal" />}>
                        <InvestorDemoPortal />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/investor-demo/customer"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Customer Demo" />}>
                        <InvestorDemoCustomer />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/investor-demo/merchant"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Merchant Demo" />}>
                        <InvestorDemoMerchant />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/investor-demo/driver"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Driver Demo" />}>
                        <InvestorDemoDriver />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/hub/department/:departmentName"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Department" />}>
                          <DepartmentHub />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/technology/developer-portal"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Developer Portal" />}>
                          <DeveloperPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route path="/main-hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />

                  <Route
                    path="/admin"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Admin" />}>
                          <Admin />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/merchant-operations"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <MerchantOperationsPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/driver-operations"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <DriverOperationsPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/customer-success"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <CustomerSuccessPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/support-operations"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <SupportOperationsPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/testing"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <TestingPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/marketing-portal"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <MarketingPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/hr-portal"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading HR Portal" />}>
                          <HRPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
                  <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
                  <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
                  <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
                  <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />

                  <Route
                    path="/ceo"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading CEO Portal" />}>
                          <CEOPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/cfo"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading CFO Portal" />}>
                          <CFOPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/coo"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading COO Portal" />}>
                          <COOPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/cto/*"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading CTO Portal" />}>
                          <CTOPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/cxo/*"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading CXO Portal" />}>
                          <CXOPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/engineering-workspace"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Engineering Workspace" />}>
                          <EngineeringWorkspace />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/platform-infrastructure"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Platform Hub" />}>
                          <PlatformInfrastructureHub />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/product-command"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Product Command" />}>
                          <ProductCommandCenter />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/quality-release"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Quality Portal" />}>
                          <QualityReleasePortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route
                    path="/internal-it"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading IT Operations" />}>
                          <InternalITOperations />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route path="/finance" element={<Navigate to="/cfo" replace />} />
                  <Route path="/finance/*" element={<Navigate to="/cfo" replace />} />

                  <Route
                    path="/driver-compensation-portal/*"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Portal" />}>
                          <DriverCompensationPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />

                  <Route path="/company/*" element={<CompanyPortalRoutes />} />
                  <Route path="/sop/*" element={<SOPPortalRoutes />} />
                  <Route path="/templates/*" element={<TemplatesPortalRoutes />} />

                  <Route
                    path="/intern/*"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Intern Portal" />}>
                        <InternPortalLayout />
                      </Suspense>
                    }
                  >
                    <Route path="dashboard" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternDashboard /></Suspense>} />
                    <Route path="training" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternTraining /></Suspense>} />
                    <Route path="work" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternWork /></Suspense>} />
                    <Route path="performance" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternPerformance /></Suspense>} />
                    <Route path="academic" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternAcademicCredit /></Suspense>} />
                    <Route path="conversion" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternConversion /></Suspense>} />
                    <Route path="exit" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternExit /></Suspense>} />
                  </Route>

                  <Route
                    path="/manager/*"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Manager Portal" />}>
                        <ManagerPortalLayout />
                      </Suspense>
                    }
                  >
                    <Route path="dashboard" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ManagerDashboard /></Suspense>} />
                    <Route path="interns/:internId" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ManagerInternDetail /></Suspense>} />
                    <Route path="reviews" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ManagerReviews /></Suspense>} />
                    <Route path="approvals" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ManagerApprovals /></Suspense>} />
                  </Route>

                  <Route
                    path="/executive-sponsor/*"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Sponsor Portal" />}>
                        <SponsorPortalLayout />
                      </Suspense>
                    }
                  >
                    <Route path="pipeline" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorPipeline /></Suspense>} />
                    <Route path="interns/:internId" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorInternDetail /></Suspense>} />
                    <Route path="approvals" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorApprovals /></Suspense>} />
                  </Route>

                  <Route
                    path="/admin/intern-program/*"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Admin Portal" />}>
                        <AdminInternProgramLayout />
                      </Suspense>
                    }
                  >
                    <Route path="dashboard" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternProgramDashboard /></Suspense>} />
                    <Route path="interns" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternsTable /></Suspense>} />
                    <Route path="test-modules" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><TestModuleLibrary /></Suspense>} />
                    <Route path="role-tracks" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><RoleTracksPlaylists /></Suspense>} />
                    <Route path="promotion-rules" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><PromotionRulesEngine /></Suspense>} />
                    <Route path="reviews" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ReviewsEnforcement /></Suspense>} />
                    <Route path="roles-permissions" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternRolesPermissions /></Suspense>} />
                    <Route path="templates" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><InternProgramTemplates /></Suspense>} />
                    <Route path="audit-log" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><AuditLog /></Suspense>} />
                  </Route>

                  <Route
                    path="/sponsor/*"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Sponsor Portal" />}>
                        <SponsorPortalLayoutV2 />
                      </Suspense>
                    }
                  >
                    <Route index element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorOverview /></Suspense>} />
                    <Route path="overview" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorOverview /></Suspense>} />
                    <Route path="approval-queue" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><ApprovalQueue /></Suspense>} />
                    <Route path="interns" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorInterns /></Suspense>} />
                    <Route path="enforcement" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><EnforcementApprovals /></Suspense>} />
                    <Route path="audit-log" element={<Suspense fallback={<SuspenseLoader message="Loading..." />}><SponsorAuditLog /></Suspense>} />
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

  // Feeder-only
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

  // Merchant-only
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
                  <Route
                    path="/dashboard"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Dashboard" />}>
                        <RestaurantDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/portal"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading Merchant Portal" />}>
                        <MerchantPortal />
                      </Suspense>
                    }
                  />
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

  // Board-only
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
                  <Route path="/" element={<Navigate to="/company/board" replace />} />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route path="*" element={<Navigate to="/company/board" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // CFO-only
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
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading CFO Portal" />}>
                        <CFOPortal />
                      </Suspense>
                    }
                  />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // CEO-only
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
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading CEO Portal" />}>
                        <CEOPortal />
                      </Suspense>
                    }
                  />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // COO-only
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
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading COO Portal" />}>
                        <COOPortal />
                      </Suspense>
                    }
                  />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // CTO-only
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
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<SuspenseLoader message="Loading CTO Portal" />}>
                        <CTOPortal />
                      </Suspense>
                    }
                  />
                  <Route path="/auth" element={<BusinessAuth />} />
                  <Route path="/business-auth" element={<BusinessAuth />} />
                  <Route path="/executive/profile" element={<ExecutiveProfile />} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route
                    path="/executive-portal/documents"
                    element={
                      <BusinessAuthGuard>
                        <Suspense fallback={<SuspenseLoader message="Loading Documents" />}>
                          <ExecutiveDocumentPortal />
                        </Suspense>
                      </BusinessAuthGuard>
                    }
                  />
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
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <CartProvider>
                <InstallAppBanner />
                <TesterHooksWrapper />

                <Routes>
                  <Route path="/auth" element={<BusinessAuthWrapper />} />
                  <Route path="/business-auth" element={<BusinessAuthWrapper />} />
                  <Route path="/" element={<Index />} />

                  <Route path="/restaurants" element={<Restaurants />} />
                  <Route path="/restaurants/cuisine/:cuisine" element={<CuisineResults />} />
                  <Route path="/android-tester-enrollment" element={<AndroidTesterEnrollment />} />
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

                  <Route path="/driver-onboarding/apply" element={<DriverApplicationWizard />} />
                  <Route path="/driver/post-waitlist-onboarding" element={<PostWaitlistOnboarding />} />

                  <Route path="/enhanced-onboarding" element={<EnhancedDriverOnboarding />} />
                  <Route path="/enhanced-onboarding/profile" element={<ProfileCompletionForm />} />
                  <Route path="/enhanced-onboarding/vehicle-photos" element={<VehiclePhotosUpload />} />
                  <Route path="/enhanced-onboarding/payout" element={<PayoutSetup />} />
                  <Route path="/enhanced-onboarding/safety-quiz" element={<SafetyQuiz />} />
                  <Route path="/enhanced-onboarding/referral" element={<DriverReferralPage />} />

                  <Route path="/admin/waitlist" element={<BusinessAuthGuard><AdminDriverWaitlist /></BusinessAuthGuard>} />

                  <Route path="/customer-dashboard" element={<Navigate to="/restaurants" replace />} />
                  <Route path="/account" element={<CustomerDashboard />} />
                  <Route path="/account/edit-profile" element={<EditProfile />} />
                  <Route path="/account/payment-methods" element={<PaymentMethods />} />
                  <Route path="/account/delivery-addresses" element={<DeliveryAddresses />} />
                  <Route path="/account/my-credits" element={<MyCredits />} />
                  <Route path="/my-credits" element={<MyCredits />} />

                  <Route path="/account/tester-hub" element={<TesterHub />} />
                  <Route path="/tester-hub" element={<TesterHub />} />
                  <Route path="/tester/refer-merchant" element={<TesterReferMerchant />} />
                  <Route path="/tester/driver-interest" element={<TesterDriverInterest />} />
                  <Route path="/tester/invite-friends" element={<TesterInviteFriends />} />
                  <Route path="/invite-friends" element={<Suspense fallback={<SuspenseLoader message="Loading Invite Friends" />}><InviteFriends /></Suspense>} />

                  <Route path="/customer-support" element={<CustomerSupportChat />} />
                  <Route path="/promotion-details" element={<PromotionDetails />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/notification-settings" element={<NotificationSettings />} />
                  <Route path="/admin/promo" element={<BusinessAuthGuard><PromoManagement /></BusinessAuthGuard>} />

                  <Route path="/crave-more-subscription" element={<CraveMoreSubscription />} />
                  <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/legal/terms" element={<TermsOfServicePage />} />
                  <Route path="/legal/cravemore" element={<CraveMoreTermsPage />} />

                  <Route path="/mobile" element={<MobileDriverDashboard />} />
                  <Route path="/mobile/background-check-status" element={<MobileBackgroundCheckStatus />} />
                  <Route path="/mobile/reset-password" element={<MobilePasswordReset />} />

                  <Route path="/restaurant/auth" element={<RestaurantAuth />} />
                  <Route path="/merchant/signup" element={<MerchantLandingPage />} />
                  <Route path="/restaurant/register" element={<RestaurantRegister />} />
                  <Route path="/merchant-portal" element={<Suspense fallback={<SuspenseLoader message="Loading Merchant Portal" />}><MerchantPortal /></Suspense>} />
                  <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
                  <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                  <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
                  <Route path="/restaurant/request-delivery" element={<RequestDelivery />} />
                  <Route path="/restaurant/solutions" element={<SolutionsCenter />} />
                  <Route path="/restaurant/most-loved" element={<MostLovedProgram />} />

                  <Route path="/admin" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Admin" />}><Admin /></Suspense></BusinessAuthGuard>} />
                  <Route path="/merchant-operations" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><MerchantOperationsPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/driver-operations" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><DriverOperationsPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/customer-success" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><CustomerSuccessPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/support-operations" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><SupportOperationsPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/testing" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><TestingPortal /></Suspense></BusinessAuthGuard>} />

                  <Route path="/hub" element={<BusinessAuthGuard><MainHub /></BusinessAuthGuard>} />
                  <Route path="/hub/foundational/invites" element={<BusinessAuthGuard><HubFoundationalInvites /></BusinessAuthGuard>} />
                  <Route path="/hub/department/:departmentName" element={<BusinessAuthGuard><DepartmentHub /></BusinessAuthGuard>} />

                  <Route path="/technology/developer-portal" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Developer Portal" />}><DeveloperPortal /></Suspense></BusinessAuthGuard>} />

                  <Route path="/hr-portal" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading HR Portal" />}><HRPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/marketing-portal" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><MarketingPortal /></Suspense></BusinessAuthGuard>} />

                  <Route path="/cfo" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading CFO Portal" />}><CFOPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/ceo" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading CEO Portal" />}><CEOPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/coo" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading COO Portal" />}><COOPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/cto/*" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading CTO Portal" />}><CTOPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/cxo/*" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading CXO Portal" />}><CXOPortal /></Suspense></BusinessAuthGuard>} />

                  <Route path="/engineering-workspace" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Engineering Workspace" />}><EngineeringWorkspace /></Suspense></BusinessAuthGuard>} />
                  <Route path="/platform-infrastructure" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Platform Hub" />}><PlatformInfrastructureHub /></Suspense></BusinessAuthGuard>} />
                  <Route path="/product-command" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Product Command" />}><ProductCommandCenter /></Suspense></BusinessAuthGuard>} />
                  <Route path="/quality-release" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Quality Portal" />}><QualityReleasePortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/internal-it" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading IT Operations" />}><InternalITOperations /></Suspense></BusinessAuthGuard>} />

                  <Route path="/finance" element={<Navigate to="/cfo" replace />} />
                  <Route path="/finance/*" element={<Navigate to="/cfo" replace />} />

                  <Route path="/driver-compensation-portal/*" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><DriverCompensationPortal /></Suspense></BusinessAuthGuard>} />
                  <Route path="/executive/discipline" element={<BusinessAuthGuard><Suspense fallback={<SuspenseLoader message="Loading Portal" />}><ExecutiveAccountability /></Suspense></BusinessAuthGuard>} />

                  <Route path="/company/*" element={<BusinessAuthGuard><CompanyPortalRoutes /></BusinessAuthGuard>} />
                  <Route path="/sop/*" element={<BusinessAuthGuard><SOPPortalRoutes /></BusinessAuthGuard>} />
                  <Route path="/templates/*" element={<BusinessAuthGuard><TemplatesPortalRoutes /></BusinessAuthGuard>} />

                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/track-order/:orderId" element={<TrackOrder />} />
                  <Route path="/payment-canceled" element={<PaymentCanceled />} />

                  <Route path="/support" element={<Support />} />
                  <Route path="/access" element={<Access />} />
                  <Route path="/allocate" element={<Allocate />} />
                  <Route path="/success" element={<Success />} />

                  <Route path="/investor-demo-access" element={<Suspense fallback={<SuspenseLoader message="Loading Demo Access" />}><InvestorDemoAccess /></Suspense>} />
                  <Route path="/investor-demo" element={<Suspense fallback={<SuspenseLoader message="Loading Demo Portal" />}><InvestorDemoPortal /></Suspense>} />
                  <Route path="/investor-demo/customer" element={<Suspense fallback={<SuspenseLoader message="Loading Customer Demo" />}><InvestorDemoCustomer /></Suspense>} />
                  <Route path="/investor-demo/merchant" element={<Suspense fallback={<SuspenseLoader message="Loading Merchant Demo" />}><InvestorDemoMerchant /></Suspense>} />
                  <Route path="/investor-demo/driver" element={<Suspense fallback={<SuspenseLoader message="Loading Driver Demo" />}><InvestorDemoDriver /></Suspense>} />

                  <Route path="/executive/sign" element={<BusinessAuthGuard><ExecutiveSigningPortal /></BusinessAuthGuard>} />
                  <Route path="/executive/profile" element={<BusinessAuthGuard><ExecutiveProfile /></BusinessAuthGuard>} />
                  <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />
                  <Route path="/executive-portal/documents" element={<BusinessAuthGuard><ExecutiveDocumentPortal /></BusinessAuthGuard>} />

                  <Route path="/thank-you" element={<ThankYou />} />

                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/admin-guide" element={<Suspense fallback={<SuspenseLoader message="Loading Admin Guide" />}><AdminGuide /></Suspense>} />
                  <Route path="/restaurant-guide" element={<Suspense fallback={<SuspenseLoader message="Loading Restaurant Guide" />}><RestaurantGuide /></Suspense>} />
                  <Route path="/driver-guide" element={<Suspense fallback={<SuspenseLoader message="Loading Driver Guide" />}><DriverGuide /></Suspense>} />

                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/partner" element={<PartnerWithUs />} />
                  <Route path="/about" element={<AboutUs />} />

                  <Route path="/pitch-deck/:id" element={<PitchDeck />} />
                  <Route path="/investors" element={<InvestorsLanding />} />
                  <Route path="/investors/login" element={<InvestorLogin />} />
                  <Route path="/investors/access" element={<InvestorAccess />} />
                  <Route path="/investors/interest" element={<InvestorInterest />} />
                  <Route path="/investors/status" element={<InvestorRequestStatus />} />
                  <Route path="/investors/overview" element={<InvestorOverview />} />
                  <Route path="/investors/opportunities" element={<InvestorOpportunities />} />
                  <Route path="/investors/portal" element={<InvestorPortal />} />
                  <Route path="/investors/presentation" element={<PitchDeckPresentation />} />
                  <Route path="/investors/executive-summary" element={<ExecutiveSummary />} />
                  <Route path="/investors/financial-projections" element={<FinancialProjections />} />
                  <Route path="/investors/use-of-funds" element={<UseOfFunds />} />

                  <Route path="/careers" element={<Careers />} />
                  <Route path="/careers/internship" element={<InternshipProgram />} />
                  <Route path="/testing" element={<Testing />} />

                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/drive-on-demand-merchant-terms" element={<DriveOnDemandMerchantTerms />} />

                  <Route path="/download" element={<DownloadApp />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>

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
              </CartProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
