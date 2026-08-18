import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BusinessAuth from '@/pages/BusinessAuth';
import BusinessAuthGuard from '@/components/BusinessAuthGuard';
import SuspenseLoader from '@/components/SuspenseLoader';
import MainHub from '@/pages/MainHub';
import DepartmentHub from '@/pages/DepartmentHub';
import HubFoundationalInvites from '@/pages/HubFoundationalInvites';
import MarketDemand from '@/pages/admin/MarketDemand';
import ExecutiveProfile from '@/pages/ExecutiveProfile';
import ExecutiveResetPassword from '@/pages/ExecutiveResetPassword';
import ExecutiveSigningPortal from '@/pages/ExecutiveSigningPortal';
import { ExecutiveDocumentPortal } from '@/pages/ExecutiveDocumentPortal';
import CompanyPortalRoutes from '@/portals/company/CompanyPortalRoutes';
import SOPPortalRoutes from '@/portals/sop/SOPPortalRoutes';
import TemplatesPortalRoutes from '@/portals/templates/TemplatesPortalRoutes';

const Admin = lazy(() => import('@/pages/Admin'));
const MerchantOperationsPortal = lazy(() => import('@/pages/MerchantOperationsPortal'));
const DriverOperationsPortal = lazy(() => import('@/pages/DriverOperationsPortal'));
const CustomerSuccessPortal = lazy(() => import('@/pages/CustomerSuccessPortal'));
const SupportOperationsPortal = lazy(() => import('@/pages/SupportOperationsPortal'));
const TestingPortal = lazy(() => import('@/pages/TestingPortal'));
const MarketingPortal = lazy(() => import('@/pages/MarketingPortal'));
const HRPortal = lazy(() => import('@/pages/HRPortal'));
const CEOPortal = lazy(() => import('@/pages/CEOPortal'));
const CFOPortal = lazy(() => import('@/pages/CFOPortal'));
const COOPortal = lazy(() => import('@/pages/COOPortal'));
const CTOPortal = lazy(() => import('@/pages/CTOPortal'));
const CXOPortal = lazy(() => import('@/pages/CXOPortal'));
const CPOPortal = lazy(() => import('@/portals/cpo/CPOPortal'));
const EngineeringWorkspace = lazy(() => import('@/pages/EngineeringWorkspace'));
const PlatformInfrastructureHub = lazy(() => import('@/pages/PlatformInfrastructureHub'));
const ProductCommandCenter = lazy(() => import('@/pages/ProductCommandCenter'));
const QualityReleasePortal = lazy(() => import('@/pages/QualityReleasePortal'));
const InternalITOperations = lazy(() => import('@/pages/InternalITOperations'));
const DriverCompensationPortal = lazy(() => import('@/pages/DriverCompensationPortal'));
const DeveloperPortal = lazy(() => import('@/pages/DeveloperPortal'));
const InternalCommsPortal = lazy(() => import('@/portals/internal-comms/InternalCommsPortal'));
const MailCenterPage = lazy(() => import('@/modules/mail-center/MailCenterPage'));
const HubInvestorDemoManagement = lazy(() => import('@/pages/HubInvestorDemoManagement'));
const InvestorDemoAccess = lazy(() => import('@/pages/InvestorDemoAccess'));
const InvestorDemoPortal = lazy(() => import('@/pages/InvestorDemoPortal'));
const InvestorDemoCustomer = lazy(() => import('@/pages/InvestorDemoCustomer'));
const InvestorDemoMerchant = lazy(() => import('@/pages/InvestorDemoMerchant'));
const InvestorDemoDriver = lazy(() => import('@/pages/InvestorDemoDriver'));
const MerchantPortal = lazy(() => import('@/pages/MerchantPortal'));
const InvestorPortal = lazy(() => import('@/pages/InvestorPortal'));

const InternPortalLayout = lazy(() => import('@/portals/intern/InternPortalLayout'));
const InternDashboard = lazy(() => import('@/portals/intern/dashboard/InternDashboard'));
const InternTraining = lazy(() => import('@/portals/intern/training/InternTraining'));
const InternWork = lazy(() => import('@/portals/intern/work/InternWork'));
const InternPerformance = lazy(() => import('@/portals/intern/performance/InternPerformance'));
const InternAcademicCredit = lazy(() => import('@/portals/intern/academic/InternAcademicCredit'));
const InternConversion = lazy(() => import('@/portals/intern/conversion/InternConversion'));
const InternExit = lazy(() => import('@/portals/intern/exit/InternExit'));
const ManagerPortalLayout = lazy(() => import('@/portals/manager/ManagerPortalLayout'));
const ManagerDashboard = lazy(() => import('@/portals/manager/dashboard/ManagerDashboard'));
const ManagerInternDetail = lazy(() => import('@/portals/manager/interns/ManagerInternDetail'));
const ManagerReviews = lazy(() => import('@/portals/manager/reviews/ManagerReviews'));
const ManagerApprovals = lazy(() => import('@/portals/manager/approvals/ManagerApprovals'));
const SponsorPortalLayout = lazy(() => import('@/portals/executive-sponsor/SponsorPortalLayout'));
const SponsorPipeline = lazy(() => import('@/portals/executive-sponsor/pipeline/SponsorPipeline'));
const SponsorInternDetail = lazy(() => import('@/portals/executive-sponsor/interns/SponsorInternDetail'));
const SponsorApprovals = lazy(() => import('@/portals/executive-sponsor/approvals/SponsorApprovals'));
const AdminInternProgramLayout = lazy(() => import('@/portals/intern-program-admin/AdminInternProgramLayout'));
const InternProgramDashboard = lazy(() => import('@/portals/intern-program-admin/dashboard/InternProgramDashboard'));
const InternRolesPermissions = lazy(() => import('@/portals/intern-program-admin/roles/InternRolesPermissions'));
const InternProgramTemplates = lazy(() => import('@/portals/intern-program-admin/templates/InternProgramTemplates'));
const InternsTable = lazy(() => import('@/portals/intern-program-admin/interns/InternsTable'));
const TestModuleLibrary = lazy(() => import('@/portals/intern-program-admin/test-modules/TestModuleLibrary'));
const RoleTracksPlaylists = lazy(() => import('@/portals/intern-program-admin/role-tracks/RoleTracksPlaylists'));
const PromotionRulesEngine = lazy(() => import('@/portals/intern-program-admin/promotion-rules/PromotionRulesEngine'));
const ReviewsEnforcement = lazy(() => import('@/portals/intern-program-admin/reviews/ReviewsEnforcement'));
const AuditLog = lazy(() => import('@/portals/intern-program-admin/audit-log/AuditLog'));
const SponsorPortalLayoutV2 = lazy(() => import('@/portals/sponsor-portal/SponsorPortalLayout'));
const SponsorOverview = lazy(() => import('@/portals/sponsor-portal/overview/SponsorOverview'));
const ApprovalQueue = lazy(() => import('@/portals/sponsor-portal/approval-queue/ApprovalQueue'));
const SponsorInterns = lazy(() => import('@/portals/sponsor-portal/interns/SponsorInterns'));
const EnforcementApprovals = lazy(() => import('@/portals/sponsor-portal/enforcement/EnforcementApprovals'));
const SponsorAuditLog = lazy(() => import('@/portals/sponsor-portal/audit-log/SponsorAuditLog'));

const Protected = ({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) => (
  <BusinessAuthGuard>
    <Suspense fallback={<SuspenseLoader message={message} />}>{children}</Suspense>
  </BusinessAuthGuard>
);

const Lazy = ({ children, message = 'Loading...' }: { children: React.ReactNode; message?: string }) => (
  <Suspense fallback={<SuspenseLoader message={message} />}>{children}</Suspense>
);

/**
 * Authoritative route tree for Craven Hub and every portal launched from it.
 * It is intentionally router-agnostic so the website can use BrowserRouter
 * while the packaged Electron application uses HashRouter.
 */
export function InternalHubRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BusinessAuth />} />
      <Route path="/auth" element={<BusinessAuth />} />
      <Route path="/business-auth" element={<BusinessAuth />} />
      <Route path="/executive/profile" element={<ExecutiveProfile />} />
      <Route path="/executive/reset-password" element={<ExecutiveResetPassword />} />

      <Route path="/hub" element={<Protected message="Loading Hub"><MainHub /></Protected>} />
      <Route path="/main-hub" element={<Navigate to="/hub" replace />} />
      <Route path="/hub/department/:departmentName" element={<Protected message="Loading Department"><DepartmentHub /></Protected>} />
      <Route path="/hub/internal-comms" element={<Protected message="Loading Internal Communications"><InternalCommsPortal /></Protected>} />
      <Route path="/hub/mail" element={<Protected message="Loading Mail Center"><MailCenterPage /></Protected>} />
      <Route path="/hub/mail/:mailboxId" element={<Protected message="Loading Mail Center"><MailCenterPage /></Protected>} />
      <Route path="/hub/mail/:mailboxId/thread/:threadId" element={<Protected message="Loading Mail Center"><MailCenterPage /></Protected>} />
      <Route path="/hub/foundational/invites" element={<Protected message="Loading Foundational Invites"><HubFoundationalInvites /></Protected>} />
      <Route path="/hub/investor-demo" element={<Protected message="Loading Investor Demo Management"><HubInvestorDemoManagement /></Protected>} />
      <Route path="/hub/market-demand" element={<Protected message="Loading Market Demand"><MarketDemand /></Protected>} />

      <Route path="/admin" element={<Protected message="Loading Admin"><Admin /></Protected>} />
      <Route path="/merchant-operations" element={<Protected message="Loading Merchant Operations"><MerchantOperationsPortal /></Protected>} />
      <Route path="/driver-operations" element={<Protected message="Loading Driver Operations"><DriverOperationsPortal /></Protected>} />
      <Route path="/customer-success" element={<Protected message="Loading Customer Success"><CustomerSuccessPortal /></Protected>} />
      <Route path="/support-operations" element={<Protected message="Loading Support Operations"><SupportOperationsPortal /></Protected>} />
      <Route path="/testing" element={<Protected message="Loading Testing"><TestingPortal /></Protected>} />
      <Route path="/marketing-portal" element={<Protected message="Loading Marketing"><MarketingPortal /></Protected>} />
      <Route path="/hr-portal" element={<Protected message="Loading HR"><HRPortal /></Protected>} />

      <Route path="/ceo" element={<Protected message="Loading CEO Portal"><CEOPortal /></Protected>} />
      <Route path="/cfo" element={<Protected message="Loading CFO Portal"><CFOPortal /></Protected>} />
      <Route path="/coo" element={<Protected message="Loading COO Portal"><COOPortal /></Protected>} />
      <Route path="/cto/*" element={<Protected message="Loading CTO Portal"><CTOPortal /></Protected>} />
      <Route path="/cxo/*" element={<Protected message="Loading CXO Portal"><CXOPortal /></Protected>} />
      <Route path="/cpo-portal" element={<Protected message="Loading CPO Portal"><CPOPortal /></Protected>} />
      <Route path="/engineering-workspace" element={<Protected message="Loading Engineering Workspace"><EngineeringWorkspace /></Protected>} />
      <Route path="/platform-infrastructure" element={<Protected message="Loading Platform Infrastructure"><PlatformInfrastructureHub /></Protected>} />
      <Route path="/product-command" element={<Protected message="Loading Product Command"><ProductCommandCenter /></Protected>} />
      <Route path="/quality-release" element={<Protected message="Loading Quality & Release"><QualityReleasePortal /></Protected>} />
      <Route path="/internal-it" element={<Protected message="Loading IT Operations"><InternalITOperations /></Protected>} />
      <Route path="/technology/developer-portal" element={<Protected message="Loading Developer Portal"><DeveloperPortal /></Protected>} />
      <Route path="/driver-compensation-portal/*" element={<Protected message="Loading Driver Compensation"><DriverCompensationPortal /></Protected>} />
      <Route path="/finance" element={<Navigate to="/cfo" replace />} />
      <Route path="/finance/*" element={<Navigate to="/cfo" replace />} />

      <Route path="/company/*" element={<Protected message="Loading Company Portal"><CompanyPortalRoutes /></Protected>} />
      <Route path="/sop/*" element={<Protected message="Loading SOP Portal"><SOPPortalRoutes /></Protected>} />
      <Route path="/templates/*" element={<Protected message="Loading Templates"><TemplatesPortalRoutes /></Protected>} />
      <Route path="/executive-portal/documents" element={<Protected message="Loading Documents"><ExecutiveDocumentPortal /></Protected>} />
      <Route path="/executive/sign" element={<ExecutiveSigningPortal />} />

      <Route path="/merchant-portal/delete-account" element={<Navigate to="/merchant-portal?tab=settings&section=delete-account" replace />} />
      <Route path="/merchant-portal" element={<Protected message="Loading Merchant Portal"><MerchantPortal /></Protected>} />
      <Route path="/investors/portal" element={<Protected message="Loading Investor Portal"><InvestorPortal /></Protected>} />

      <Route path="/investor-demo-access" element={<Lazy message="Loading Demo Access"><InvestorDemoAccess /></Lazy>} />
      <Route path="/investor-demo" element={<Lazy message="Loading Demo Portal"><InvestorDemoPortal /></Lazy>} />
      <Route path="/investor-demo/customer" element={<Lazy message="Loading Customer Demo"><InvestorDemoCustomer /></Lazy>} />
      <Route path="/investor-demo/merchant" element={<Lazy message="Loading Merchant Demo"><InvestorDemoMerchant /></Lazy>} />
      <Route path="/investor-demo/driver" element={<Lazy message="Loading Driver Demo"><InvestorDemoDriver /></Lazy>} />

      <Route path="/intern/*" element={<Protected message="Loading Intern Portal"><InternPortalLayout /></Protected>}>
        <Route path="dashboard" element={<Lazy><InternDashboard /></Lazy>} />
        <Route path="training" element={<Lazy><InternTraining /></Lazy>} />
        <Route path="work" element={<Lazy><InternWork /></Lazy>} />
        <Route path="performance" element={<Lazy><InternPerformance /></Lazy>} />
        <Route path="academic" element={<Lazy><InternAcademicCredit /></Lazy>} />
        <Route path="conversion" element={<Lazy><InternConversion /></Lazy>} />
        <Route path="exit" element={<Lazy><InternExit /></Lazy>} />
      </Route>
      <Route path="/manager/*" element={<Protected message="Loading Manager Portal"><ManagerPortalLayout /></Protected>}>
        <Route path="dashboard" element={<Lazy><ManagerDashboard /></Lazy>} />
        <Route path="interns/:internId" element={<Lazy><ManagerInternDetail /></Lazy>} />
        <Route path="reviews" element={<Lazy><ManagerReviews /></Lazy>} />
        <Route path="approvals" element={<Lazy><ManagerApprovals /></Lazy>} />
      </Route>
      <Route path="/executive-sponsor/*" element={<Protected message="Loading Sponsor Portal"><SponsorPortalLayout /></Protected>}>
        <Route path="pipeline" element={<Lazy><SponsorPipeline /></Lazy>} />
        <Route path="interns/:internId" element={<Lazy><SponsorInternDetail /></Lazy>} />
        <Route path="approvals" element={<Lazy><SponsorApprovals /></Lazy>} />
      </Route>
      <Route path="/admin/intern-program/*" element={<Protected message="Loading Intern Program"><AdminInternProgramLayout /></Protected>}>
        <Route path="dashboard" element={<Lazy><InternProgramDashboard /></Lazy>} />
        <Route path="interns" element={<Lazy><InternsTable /></Lazy>} />
        <Route path="test-modules" element={<Lazy><TestModuleLibrary /></Lazy>} />
        <Route path="role-tracks" element={<Lazy><RoleTracksPlaylists /></Lazy>} />
        <Route path="promotion-rules" element={<Lazy><PromotionRulesEngine /></Lazy>} />
        <Route path="reviews" element={<Lazy><ReviewsEnforcement /></Lazy>} />
        <Route path="roles-permissions" element={<Lazy><InternRolesPermissions /></Lazy>} />
        <Route path="templates" element={<Lazy><InternProgramTemplates /></Lazy>} />
        <Route path="audit-log" element={<Lazy><AuditLog /></Lazy>} />
      </Route>
      <Route path="/sponsor/*" element={<Protected message="Loading Sponsor Portal"><SponsorPortalLayoutV2 /></Protected>}>
        <Route index element={<Lazy><SponsorOverview /></Lazy>} />
        <Route path="overview" element={<Lazy><SponsorOverview /></Lazy>} />
        <Route path="approval-queue" element={<Lazy><ApprovalQueue /></Lazy>} />
        <Route path="interns" element={<Lazy><SponsorInterns /></Lazy>} />
        <Route path="enforcement" element={<Lazy><EnforcementApprovals /></Lazy>} />
        <Route path="audit-log" element={<Lazy><SponsorAuditLog /></Lazy>} />
      </Route>

      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  );
}

export default InternalHubRoutes;
