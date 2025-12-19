# Crave'n Delivery - Complete System Map & Architecture
## Deep Dive Analysis - December 18, 2025

**Status:** Active System Audit  
**Purpose:** Map every route, portal, workflow, and identify legacy/unused code

---

## Executive Summary

This document provides a **complete end-to-end map** of the Crave'n Delivery platform based on actual routing, navigation, and component analysis. This is NOT based on documentation—this is based on **actual code inspection**.

**Key Findings:**
- **BoardPortal EXISTS and is ACTIVE** (contrary to initial assessment)
- Multiple subdomain routing strategies in place
- Complex multi-portal architecture with 7+ distinct user experiences
- Some routes exist but may be orphaned or legacy

---

## Table of Contents

1. [Subdomain Architecture](#subdomain-architecture)
2. [Customer-Facing Routes](#customer-facing-routes)
3. [Driver/Feeder Routes](#driverfeeder-routes)
4. [Restaurant/Merchant Routes](#restaurantmerchant-routes)
5. [Executive/Business Portals](#executivebusiness-portals)
6. [Admin & Operations Portals](#admin--operations-portals)
7. [Intern & HR System](#intern--hr-system)
8. [Mobile Navigation](#mobile-navigation)
9. [Legacy & Unused Routes](#legacy--unused-routes)
10. [Complete Route Inventory](#complete-route-inventory)

---

## 1. Subdomain Architecture

The platform uses **subdomain-based routing** to separate different user experiences:

### Active Subdomains

| Subdomain | Purpose | Routes To |
|-----------|---------|-----------|
| **cravenusa.com** (main) | Customer ordering platform | Full customer experience |
| **feeder.cravenusa.com** | Driver signup & mobile app | Driver onboarding + mobile dashboard |
| **feed.cravenusa.com** | Alias for feeder | Same as feeder subdomain |
| **merchant.cravenusa.com** | Restaurant partner portal | Restaurant registration + dashboard |
| **board.cravenusa.com** | Board of Directors portal | BoardPortal (executive governance) |
| **ceo.cravenusa.com** | CEO Command Center | CEOPortal only |
| **cfo.cravenusa.com** | CFO Financial Portal | CFOPortal only |
| **coo.cravenusa.com** | COO Operations Portal | COOPortal only |
| **cto.cravenusa.com** | CTO Technology Portal | CTOPortal only |
| **hq.cravenusa.com** | Business HQ (all internal) | All business portals + admin |

### Subdomain Routing Logic

```typescript
// From App.tsx lines 186-276
- Native mobile (Capacitor) → Always routes to /mobile
- HQ subdomain → Business routes only (no customer features)
- Feeder subdomain → Driver routes only
- Merchant subdomain → Restaurant routes only
- Board subdomain → BoardPortal only
- CEO/CFO/COO/CTO subdomains → Single portal each
- Main domain → Full customer + all features
```

---

## 2. Customer-Facing Routes

### Main Website (cravenusa.com)

#### Homepage & Core
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/` | Index | Homepage with hero + restaurant grid | ✅ Active |
| `/restaurants` | Restaurants | Browse all restaurants | ✅ Active |
| `/restaurant/:id` | RestaurantDetail | Individual restaurant page | ✅ Active |
| `/restaurant/:id/menu` | RestaurantMenuPage | Restaurant menu view | ✅ Active |
| `/favorites` | Favorites | Saved restaurants | ✅ Active |
| `/checkout` | Checkout | Cart checkout flow | ✅ Active |
| `/payment-success` | PaymentSuccess | Order confirmation | ✅ Active |
| `/payment-canceled` | PaymentCanceled | Payment failure | ✅ Active |

#### Order Management
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/order-history` | OrderHistory | Past orders + reorder | ✅ Active |
| `/track-order/:orderId` | TrackOrder | Live order tracking with map | ✅ Active |
| `/account` | CustomerDashboard | Customer account settings | ✅ Active |
| `/customer-dashboard` | → Redirects to `/order-history` | Legacy redirect | ⚠️ Redirect |

#### CraveMore Subscription
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/crave-more` | CraveMore | Subscription landing page | ✅ Active |
| `/cravemore` | CraveMore | Alias for above | ✅ Active |
| `/cravemore/success` | CraveMoreSuccess | Subscription confirmation | ✅ Active |
| `/account/cravemore` | CraveMoreAccount | Manage subscription | ✅ Active |

#### Footer Pages
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/help` | HelpCenter | Help & support | ✅ Active |
| `/safety` | Safety | Safety information | ✅ Active |
| `/contact` | ContactUs | Contact form | ✅ Active |
| `/about` | AboutUs | About company | ✅ Active |
| `/partner` | PartnerWithUs | Restaurant partnership | ✅ Active |
| `/privacy-policy` | PrivacyPolicy | Privacy policy | ✅ Active |
| `/terms-of-service` | TermsOfService | Terms of service | ✅ Active |
| `/cookie-policy` | CookiePolicy | Cookie policy | ✅ Active |

#### Investor & Careers
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/investors` | InvestorsLanding | Investor landing page | ✅ Active |
| `/investors/access` | InvestorAccess | Legacy investor access | ⚠️ Legacy |
| `/investors/interest` | InvestorInterest | Express interest form | ✅ Active |
| `/investors/status` | InvestorRequestStatus | Check request status | ✅ Active |
| `/investors/overview` | InvestorOverview | Investor overview | ✅ Active |
| `/investors/portal` | InvestorPortal | Investor portal | ✅ Active |
| `/pitch-deck/:id` | PitchDeck | View pitch deck | ✅ Active |
| `/careers` | Careers | Careers page | ✅ Active |
| `/careers/internship` | InternshipProgram | Internship program | ✅ Active |

#### Mobile App
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/download` | DownloadApp | PWA install page | ✅ Active |

### Customer Mobile Bottom Nav

**Active on mobile devices (< 768px):**

| Tab | Route | Icon | Purpose |
|-----|-------|------|---------|
| Home | `/restaurants` | Home | Browse restaurants |
| Favorites | `/favorites` | Heart | Saved restaurants |
| Orders | `/order-history` | Package | Order history |
| Account | `/account` or `/auth` | User | Account settings |
| Cart | `/checkout` | Cart | Shopping cart |

**Component:** `GlobalMobileBottomNav.tsx`  
**Hidden on:** Driver routes, restaurant dashboard, merchant pages

---

## 3. Driver/Feeder Routes

### Feeder Subdomain (feeder.cravenusa.com)

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/` | FeederHub | Driver signup landing | ✅ Active |
| `/driver/auth` | DriverAuth | Driver login | ✅ Active |
| `/mobile` | MobileDriverDashboard | Main driver dashboard | ✅ Active |
| `/mobile/background-check-status` | MobileBackgroundCheckStatus | Check status | ✅ Active |
| `/mobile/reset-password` | MobilePasswordReset | Password reset | ✅ Active |

### Driver Onboarding Flow

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/driver-onboarding/apply` | DriverApplicationWizard | Full application wizard | ✅ Active |
| `/driver/post-waitlist-onboarding` | PostWaitlistOnboarding | Post-approval onboarding | ✅ Active |
| `/enhanced-onboarding` | EnhancedDriverOnboarding | Enhanced onboarding flow | ✅ Active |
| `/enhanced-onboarding/profile` | ProfileCompletionForm | Complete profile | ✅ Active |
| `/enhanced-onboarding/vehicle-photos` | VehiclePhotosUpload | Upload vehicle photos | ✅ Active |
| `/enhanced-onboarding/payout` | PayoutSetup | Setup payout method | ✅ Active |
| `/enhanced-onboarding/safety-quiz` | SafetyQuiz | Safety quiz | ✅ Active |
| `/enhanced-onboarding/referral` | DriverReferralPage | Referral program | ✅ Active |

### Driver Documents

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/independent-contractor-agreement` | IndependentContractorAgreement | ICA document | ✅ Active |
| `/feeder-privacy-policy` | FeederPrivacyPolicy | Privacy policy | ✅ Active |

### Main Site Driver Routes

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/feeder` | FeederHub | Driver signup (main site) | ✅ Active |
| `/admin/waitlist` | AdminDriverWaitlist | Admin waitlist management | ✅ Active |

### Mobile Driver Dashboard Tabs

**Component:** `MobileDriverDashboard.tsx`

| Tab | Purpose | Features |
|-----|---------|----------|
| **Home** | Active delivery + earnings | Order acceptance, active delivery flow |
| **Schedule** | Availability management | Set working hours, view schedule |
| **Earnings** | Financial dashboard | Daily/weekly/monthly earnings, instant cashout |
| **Account** | Profile & settings | Profile, vehicle, documents, preferences |

**Navigation:** `DriverBottomNav.tsx` (separate from customer nav)

---

## 4. Restaurant/Merchant Routes

### Merchant Subdomain (merchant.cravenusa.com)

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/` | PartnerWithUs | Partnership landing | ✅ Active |
| `/register` | RestaurantRegister | Restaurant registration | ✅ Active |
| `/auth` | RestaurantAuth | Restaurant login | ✅ Active |
| `/dashboard` | RestaurantDashboard | Main restaurant dashboard | ✅ Active |
| `/portal` | MerchantPortal | Merchant portal | ✅ Active |
| `/solutions` | SolutionsCenter | Solutions center | ✅ Active |
| `/most-loved` | MostLovedProgram | Most loved program | ✅ Active |
| `/request-delivery` | RequestDelivery | Request delivery service | ✅ Active |

### Main Site Restaurant Routes

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/restaurant/auth` | RestaurantAuth | Restaurant login | ✅ Active |
| `/restaurant/register` | RestaurantRegister | Registration | ✅ Active |
| `/merchant-portal` | MerchantPortal | Merchant portal | ✅ Active |
| `/restaurant/dashboard` | RestaurantDashboard | Dashboard | ✅ Active |
| `/restaurant/request-delivery` | RequestDelivery | Request delivery | ✅ Active |
| `/restaurant/solutions` | SolutionsCenter | Solutions | ✅ Active |
| `/restaurant/most-loved` | MostLovedProgram | Most loved | ✅ Active |

### Restaurant Dashboard Features

**Component:** `RestaurantDashboard.tsx`

- Order management (real-time)
- Menu management
- Store hours
- Analytics
- Notifications (sound + push)

---

## 5. Executive/Business Portals

### Board Portal (board.cravenusa.com OR /board)

**Component:** `BoardPortal.tsx`  
**Status:** ✅ **ACTIVE AND FULLY FUNCTIONAL**

#### Board Portal Tabs

| Tab | Component/Feature | Purpose |
|-----|-------------------|---------|
| **Communications** | ExecutiveCommunicationsCenter | Messages, meetings |
| **Directory** | ExecutiveDirectory | Executive directory |
| **Officer Management** | OfficerAppointmentWorkflow | Appoint officers, convert to employees |
| **Personnel** | PersonnelManager | Manage employees |
| **Document Vault** | DocumentVault | Corporate documents |
| **Word Processor** | ExecutiveWordProcessor | Draft documents |
| **Articles Generator** | ArticlesOfIncorporationGenerator | Generate articles |
| **IBOE Sender** | IBOESender + IBOETemplateManager | Send IBOE documents |
| **Equity & Governance** | CapTableView, EquityDashboard, EquityGrantForm | Cap table, equity grants |
| **Financial Approvals** | FinancialApprovals | Approve budgets |
| **Templates & Settings** | TemplateManager, CompanySettingsManager | Manage templates |

**Access:** Board members + C-suite executives  
**Auth:** PIN-based executive authentication

---

### CEO Portal (ceo.cravenusa.com OR /ceo)

**Component:** `CEOPortal.tsx`  
**Status:** ✅ Active

#### CEO Portal Tabs

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Command Center** | Dashboard | Overview metrics |
| **Executive Evaluations** | CfoEvaluationGatePanel, CtoEvaluationGatePanel | Evaluate CFO/CTO |
| **Manage People** | PersonnelManager | Employee management |
| **Approve Spend** | FinancialApprovals | Budget approvals |
| **Code Changes** | CodeChangeQueue | Approve code changes |
| **Review Equity** | EquityDashboard | Equity grants |
| **Drive Strategy** | StrategicPlanning | Strategic planning |
| **Map Decisions** | StrategicMindMap | Mind mapping |
| **Run Emergency Playbooks** | EmergencyControls | Emergency controls |
| **Audit Activity** | AuditTrail | Audit logs |
| **Sign Documents** | CEOSignatureManager | Document signing |
| **Direct Communications** | ExecutiveCommunicationsCenter | Messages |
| **Draft Briefings** | ExecutiveWordProcessor | Word processor |
| **Active Users** | ActiveUsersMonitor | Monitor active users |
| **Executive Accountability** | Link to `/executive/discipline` | Accountability |
| **Interns & Pathway** | InternsManagement | Intern management |

---

### CFO Portal (cfo.cravenusa.com OR /cfo)

**Component:** `CFOPortal.tsx`  
**Status:** ✅ Active

#### CFO Portal Tabs (Extensive)

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Dashboard** | EnhancedCFODashboard | Financial overview |
| **Treasury** | AdvancedTreasuryManagement | Cash management |
| **FP&A** | EnhancedFPandA | Financial planning & analysis |
| **Payroll** | EnhancedPayroll | Payroll management |
| **Tax Planning** | EnhancedTaxPlanning | Tax strategy |
| **Financial Controls** | EnhancedFinancialControls | Internal controls |
| **Board Reporting** | EnhancedBoardReporting | Board reports |
| **Investor Relations** | EnhancedInvestorRelations | Investor communications |
| **Risk Management** | EnhancedRiskManagement | Risk assessment |
| **Capital Structure** | EnhancedCapitalStructure | Capital planning |
| **Scenario Planning** | EnhancedScenarioPlanning | Financial scenarios |
| **General Ledger** | CorporateGeneralLedger | GL management |
| **Accounts Payable** | CorporateAccountsPayable | AP management |
| **Accounts Receivable** | CorporateAccountsReceivable | AR management |
| **Financial Reports** | FinancialReportsDashboard | Report generation |
| **Budget Management** | BudgetManagement | Budget tracking |
| **Finance Audit** | FinanceAuditComponent | Audit trails |
| **Driver Compensation** | DriverCompensationDashboard | Driver pay analysis |
| **Knowledge Base** | CFOKnowledgeBase | CFO resources |
| **Onboarding** | CFOOnboardingGovernance | CFO onboarding |
| **Evaluation Gate** | CfoEvaluationGatePanel | Performance evaluation |
| **Email** | BusinessEmailSystem | Email management |
| **Word Processor** | ExecutiveWordProcessor | Document drafting |

**Note:** CFO Portal is the most feature-rich executive portal

---

### COO Portal (coo.cravenusa.com OR /coo)

**Component:** `COOPortal.tsx`  
**Status:** ✅ Active

#### COO Portal Features

- Operations metrics dashboard
- Fleet management
- Vendor management
- Compliance monitoring
- Operations analytics

---

### CTO Portal (cto.cravenusa.com OR /cto)

**Component:** `CTOPortal.tsx`  
**Status:** ✅ Active

#### CTO Portal Features

- Infrastructure health monitoring
- Incident management
- Security audits
- IT asset management
- Tech cost monitoring
- GitHub integration
- Compensation engine (sub-routes)

**Sub-routes:**
- `/cto/compensation-engine` - Compensation formulas
- `/cto/compensation-engine/diagnostics` - Diagnostics
- `/cto/compensation-engine/formulas` - Formula management

---

### CXO Portal (/cxo)

**Component:** `CXOPortal.tsx`  
**Status:** ✅ Active

Purpose: Cross-executive portal (shared executive features)

---

### Company Portal (/company/*)

**Component:** `CompanyPortalLayout.tsx`  
**Status:** ✅ Active

#### Company Portal Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/company` | CompanyDashboard | Company overview |
| `/company/governance-admin` | GovernanceAdminDashboard | Governance admin |
| `/company/governance-admin/appointments` | AppointmentList | Appointments list |
| `/company/governance-admin/appointments/new` | NewAppointmentForm | New appointment |
| `/company/governance-admin/resolutions` | ResolutionList | Resolutions |
| `/company/governance-admin/officers` | OfficerLedger | Officer ledger |
| `/company/governance-admin/logs` | GovernanceLogList | Governance logs |
| `/company/board` | BoardDashboard | Board dashboard |
| `/company/board/resolution/:id` | BoardResolutionDetail | Resolution detail |
| `/company/executives` | ExecutiveDashboard | Executive dashboard |
| `/company/executives/my-appointment` | MyAppointment | My appointment |
| `/company/executives/directory` | OfficerDirectoryInternal | Officer directory |
| `/company/leadership-public` | LeadershipPublicPage | Public leadership page |
| `/company/leadership/templates` | TemplateManager | Template manager |
| `/company/sop` | SOPWrapper | SOP management |

---

### Executive Shared Routes

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/executive/sign` | ExecutiveSigningPortal | Document signing | ✅ Active |
| `/executive/profile` | ExecutiveProfile | Executive profile | ✅ Active |
| `/executive/reset-password` | ExecutiveResetPassword | Password reset | ✅ Active |
| `/executive-portal/documents` | ExecutiveDocumentPortal | Document portal | ✅ Active |
| `/executive/discipline` | ExecutiveAccountability | Accountability system | ✅ Active |

---

## 6. Admin & Operations Portals

### Main Admin Portal (/admin)

**Component:** `Admin.tsx`  
**Status:** ✅ Active

#### Admin Portal Tabs

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Dashboard** | LiveDashboard | Live metrics |
| **Analytics** | AnalyticsDashboard | Analytics |
| **Notifications** | NotificationSettingsManager | Notification settings |
| **Feature Toggles** | FeatureToggleManager | Feature flags |
| **Delivery Zones** | DeliveryZoneManager | Zone management |
| **Investor Intake** | InvestorIntakeManager | Investor requests |

### Operations Portals

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/merchant-operations` | MerchantOperationsPortal | Merchant ops | ✅ Active |
| `/driver-operations` | DriverOperationsPortal | Driver ops | ✅ Active |
| `/customer-success` | CustomerSuccessPortal | Customer success | ✅ Active |
| `/support-operations` | SupportOperationsPortal | Support ops | ✅ Active |
| `/testing` | TestingPortal | Testing portal | ✅ Active |

### Other Business Portals

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/hub` | MainHub | Main business hub | ✅ Active |
| `/main-hub` | MainHub | Alias for hub | ✅ Active |
| `/hub/department/:departmentName` | DepartmentHub | Department hub | ✅ Active |
| `/hr-portal` | HRPortal | HR portal | ✅ Active |
| `/marketing-portal` | MarketingPortal | Marketing portal | ✅ Active |
| `/driver-compensation-portal/*` | DriverCompensationPortal | Driver compensation | ✅ Active |
| `/technology/developer-portal` | DeveloperPortal | Developer portal | ✅ Active |

---

## 7. Intern & HR System

### Intern Portal (/intern/*)

**Component:** `InternPortalLayout.tsx`  
**Status:** ✅ Active

| Route | Component | Purpose |
|-------|-----------|---------|
| `/intern/dashboard` | InternDashboard | Intern dashboard |
| `/intern/training` | InternTraining | Training modules |
| `/intern/work` | InternWork | Work assignments |
| `/intern/performance` | InternPerformance | Performance reviews |
| `/intern/academic` | InternAcademicCredit | Academic credit |
| `/intern/conversion` | InternConversion | Conversion to employee |
| `/intern/exit` | InternExit | Exit process |

### Manager Portal (/manager/*)

**Component:** `ManagerPortalLayout.tsx`  
**Status:** ✅ Active

| Route | Component | Purpose |
|-------|-----------|---------|
| `/manager/dashboard` | ManagerDashboard | Manager dashboard |
| `/manager/interns/:internId` | ManagerInternDetail | Intern detail |
| `/manager/reviews` | ManagerReviews | Review interns |
| `/manager/approvals` | ManagerApprovals | Approve requests |

### Executive Sponsor Portal (/executive-sponsor/*)

**Component:** `SponsorPortalLayout.tsx`  
**Status:** ✅ Active

| Route | Component | Purpose |
|-------|-----------|---------|
| `/executive-sponsor/pipeline` | SponsorPipeline | Intern pipeline |
| `/executive-sponsor/interns/:internId` | SponsorInternDetail | Intern detail |
| `/executive-sponsor/approvals` | SponsorApprovals | Approvals |

### Sponsor Portal V2 (/sponsor/*)

**Component:** `SponsorPortalLayoutV2.tsx`  
**Status:** ✅ Active (newer version)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/sponsor` | SponsorOverview | Overview |
| `/sponsor/overview` | SponsorOverview | Overview |
| `/sponsor/approval-queue` | ApprovalQueue | Approval queue |
| `/sponsor/interns` | SponsorInterns | Interns list |
| `/sponsor/enforcement` | EnforcementApprovals | Enforcement |
| `/sponsor/audit-log` | SponsorAuditLog | Audit log |

### Admin Intern Program Portal (/admin/intern-program/*)

**Component:** `AdminInternProgramLayout.tsx`  
**Status:** ✅ Active

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/intern-program/dashboard` | InternProgramDashboard | Program dashboard |
| `/admin/intern-program/interns` | InternsTable | Interns table |
| `/admin/intern-program/test-modules` | TestModuleLibrary | Test modules |
| `/admin/intern-program/role-tracks` | RoleTracksPlaylists | Role tracks |
| `/admin/intern-program/promotion-rules` | PromotionRulesEngine | Promotion rules |
| `/admin/intern-program/reviews` | ReviewsEnforcement | Reviews |
| `/admin/intern-program/roles-permissions` | InternRolesPermissions | Roles & permissions |
| `/admin/intern-program/templates` | InternProgramTemplates | Templates |
| `/admin/intern-program/audit-log` | AuditLog | Audit log |

---

## 8. Mobile Navigation

### Customer Mobile Bottom Nav

**Component:** `GlobalMobileBottomNav.tsx`  
**Visibility:** Shows on mobile (< 768px) for customer routes  
**Hidden on:** Driver routes, restaurant dashboard, merchant pages

| Item | Route | Icon | Badge |
|------|-------|------|-------|
| Home | `/restaurants` | Home | - |
| Favorites | `/favorites` | Heart | - |
| Orders | `/order-history` | Package | - |
| Account | `/account` or `/auth` | User | - |
| Cart | `/checkout` | Cart | Cart count |

### Driver Mobile Bottom Nav

**Component:** `DriverBottomNav.tsx`  
**Visibility:** Shows only on driver routes

| Item | Purpose | Icon |
|------|---------|------|
| Home | Active delivery | Home |
| Schedule | Availability | Calendar |
| Earnings | Financial | Dollar |
| Account | Profile | User |

---

## 9. Legacy & Unused Routes

### Potentially Legacy Routes

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/investors/access` | InvestorAccess | ⚠️ Legacy | Marked as legacy in code |
| `/customer-dashboard` | Redirect | ⚠️ Redirect | Redirects to `/order-history` |
| `/finance` | Redirect | ⚠️ Redirect | Redirects to `/cfo` |
| `/finance/*` | Redirect | ⚠️ Redirect | Redirects to `/cfo` |

### Guide Pages (Lazy Loaded)

| Route | Component | Status |
|-------|-----------|--------|
| `/admin-guide` | AdminGuide | ✅ Active |
| `/restaurant-guide` | RestaurantGuide | ✅ Active |
| `/driver-guide` | DriverGuide | ✅ Active |

### Testing Routes

| Route | Component | Status |
|-------|-----------|--------|
| `/testing` | Testing | ✅ Active |
| `/testing` (HQ) | TestingPortal | ✅ Active |

---

## 10. Complete Route Inventory

### Total Route Count: 150+ Routes

#### By Category

| Category | Count | Status |
|----------|-------|--------|
| Customer Routes | 30+ | ✅ Active |
| Driver Routes | 15+ | ✅ Active |
| Restaurant Routes | 10+ | ✅ Active |
| Executive Portals | 50+ | ✅ Active |
| Admin/Operations | 15+ | ✅ Active |
| Intern/HR System | 25+ | ✅ Active |
| Shared/Auth | 10+ | ✅ Active |
| Legacy/Redirects | 5+ | ⚠️ Legacy |

---

## 11. Authentication & Access Control

### Authentication Types

1. **Customer Auth** - Supabase Auth (email/password)
2. **Driver Auth** - Supabase Auth + application status check
3. **Restaurant Auth** - Supabase Auth + merchant verification
4. **Executive Auth** - PIN-based authentication (`useExecAuth`)
5. **Business Auth** - PIN-based authentication (`BusinessAuthGuard`)
6. **Admin Auth** - Admin role check (`AdminAccessGuard`)

### Access Guards

| Guard | Component | Purpose |
|-------|-----------|---------|
| `AccessGuard` | Generic access control | Check user status |
| `AdminAccessGuard` | Admin portal protection | Admin only |
| `BusinessAuthGuard` | Business portal protection | Executive/business users |
| `useExecAuth` | Executive authentication hook | CEO/CFO/CTO/etc |

---

## 12. Navigation Components

### Header Navigation

**Component:** `Header.tsx`

**Desktop Menu:**
- Restaurants (if feature flag enabled)
- Become a Feeder
- Business Dropdown:
  - Hub
  - HR Portal
  - Board Portal
  - CEO Portal
  - CFO Portal
  - COO Portal
  - CTO Portal
- Admin (link)
- User Dropdown (if logged in):
  - My Orders
  - Rewards
  - Merchant Portal (if merchant)
  - Sign Out

**Mobile Menu:**
- Same as desktop but in hamburger menu

---

## 13. Key Workflows

### Customer Ordering Workflow

```
1. Browse restaurants (/restaurants)
2. Select restaurant (/restaurant/:id)
3. View menu (/restaurant/:id/menu)
4. Add to cart (cart context)
5. Checkout (/checkout)
6. Payment (Moov.io)
7. Success (/payment-success)
8. Track order (/track-order/:orderId)
9. View history (/order-history)
```

### Driver Onboarding Workflow

```
1. Sign up (feeder.cravenusa.com or /feeder)
2. Apply (/driver-onboarding/apply)
3. Wait for approval (waitlist)
4. Admin approves (/admin/waitlist)
5. Post-waitlist onboarding (/driver/post-waitlist-onboarding)
6. Enhanced onboarding steps:
   - Profile (/enhanced-onboarding/profile)
   - Vehicle photos (/enhanced-onboarding/vehicle-photos)
   - Payout setup (/enhanced-onboarding/payout)
   - Safety quiz (/enhanced-onboarding/safety-quiz)
   - Referral (/enhanced-onboarding/referral)
7. Access mobile dashboard (/mobile)
```

### Restaurant Onboarding Workflow

```
1. Partner landing (merchant.cravenusa.com or /partner)
2. Register (/restaurant/register)
3. Login (/restaurant/auth)
4. Dashboard (/restaurant/dashboard)
5. Setup menu, hours, etc.
```

### Executive Document Signing Workflow

```
1. Receive email with signing link
2. Click link → /executive/sign
3. Enter PIN
4. Review documents (/executive-portal/documents)
5. Sign documents
6. Documents stored in vault
```

---

## 14. Subdomain-Specific Behaviors

### HQ Subdomain (hq.cravenusa.com)

**Behavior:** Shows ONLY business routes, no customer features

**Available Routes:**
- `/auth` - Business auth
- `/hub` - Main hub
- `/admin` - Admin portal
- All executive portals (CEO, CFO, COO, CTO, CXO)
- All operations portals
- All intern/HR portals
- Company portal
- Marketing portal
- HR portal
- Developer portal

**NOT Available:**
- Customer ordering
- Restaurant browsing
- Public pages

### Native Mobile App (Capacitor)

**Behavior:** Routes ONLY to driver mobile dashboard

**Available Routes:**
- `/mobile` - Driver dashboard
- `/mobile/reset-password`
- `/driver/post-waitlist-onboarding`
- `/enhanced-onboarding/*` - All onboarding steps

**Redirect:** All other routes redirect to `/mobile`

---

## 15. Feature Flags

**Component:** `useFeatureFlag` hook

**Known Flags:**
- `feature_restaurants_visible` - Show/hide restaurants in navigation

---

## 16. Real-Time Features

### Live Data Updates

**Portals with real-time subscriptions:**

1. **BoardPortal** - Orders, employees, financial approvals (60s refresh)
2. **CEOPortal** - Metrics, approvals, code changes
3. **CFOPortal** - Financial data
4. **RestaurantDashboard** - Orders (real-time)
5. **MobileDriverDashboard** - Orders, earnings

**Technology:** Supabase real-time subscriptions

---

## 17. PWA Features

**Install Banner:** `InstallAppBanner.tsx`  
**Service Worker:** `/sw.js`  
**Manifest:** `/manifest.json`

**Auto-redirect Logic:**
- If PWA installed + user is approved driver → redirect to `/mobile`
- Cached in localStorage: `user_is_driver`

---

## 18. Critical Findings

### ✅ Confirmed Active

1. **BoardPortal** - Fully functional, NOT legacy
2. **All Executive Portals** - CEO, CFO, COO, CTO, CXO all active
3. **Intern System** - Complete 4-portal system (intern, manager, sponsor, admin)
4. **Company Portal** - Governance system active
5. **Mobile Apps** - Android built, iOS ready

### ⚠️ Needs Review

1. **InvestorAccess** - Marked as legacy in imports
2. **Multiple redirect routes** - `/customer-dashboard`, `/finance`
3. **Dual sponsor portals** - `/executive-sponsor` vs `/sponsor` (V2)

### ❌ Not Found / Unused

Based on this analysis, no major routes appear to be completely unused. Most routes are either:
- Active and functional
- Redirects to updated routes
- Legacy but still accessible

---

## 19. Recommendations

### Immediate Actions

1. **Remove or update legacy routes:**
   - `/investors/access` - Update or remove
   - Consolidate sponsor portals (V1 vs V2)

2. **Document subdomain strategy:**
   - Create DNS records for all subdomains
   - Document which subdomain serves which purpose

3. **Audit feature flags:**
   - Document all feature flags
   - Remove unused flags

### Future Improvements

1. **Route consolidation:**
   - Merge duplicate routes
   - Standardize naming conventions

2. **Navigation improvements:**
   - Breadcrumbs for complex portals
   - Back button consistency

3. **Mobile optimization:**
   - Ensure all portals work on mobile
   - Test PWA on iOS

---

## 20. Conclusion

**System Status:** ✅ **HIGHLY FUNCTIONAL**

The Crave'n Delivery platform is a **massive, multi-portal system** with:
- **150+ active routes**
- **7+ distinct user experiences**
- **Subdomain-based architecture**
- **Complex role-based access control**
- **Real-time data synchronization**
- **Mobile-first driver experience**
- **Enterprise-grade executive portals**

**Key Takeaway:** The BoardPortal and all executive portals are **ACTIVE and FUNCTIONAL**. The system is far more complete than initially assessed.

---

## Document Information

**Version:** 1.0  
**Created:** December 18, 2025  
**Author:** Invero (Deep System Analysis)  
**Classification:** Internal Technical Documentation  
**File:** `COMPLETE_SYSTEM_MAP.md`

---

*End of Complete System Map*

