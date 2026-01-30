# Driver / Feeder Application & Onboarding Guide

This document explains the full lifecycle for Crave'n Delivery drivers (Feeders), covering what applicants experience, what staff must do, and how the platform enforces progression from application to activation.

---

## 1. Purpose & Scope

- **Audience:** Operations, support, compliance, and engineering teams that manage the driver pipeline.
- **Goal:** Provide a single source of truth for how drivers apply, join the waitlist, complete onboarding requirements, and ultimately become active.
- **Systems involved:** Web app (`/driver-onboarding/*`, `/driver/post-waitlist-onboarding`, `/enhanced-onboarding`, `/mobile`), Supabase tables (`craver_applications`, `onboarding_tasks`, `regions`), edge functions (`start-onboarding`, `activate-drivers`, `auto-activate-region-drivers`, `complete-onboarding-task`).

---

## 2. Process Snapshot

| Phase | Driver Status | Driver-facing Route | Staff Tools | Key Outcome |
|-------|---------------|---------------------|-------------|-------------|
| 1. Application Submission | `waitlist` | `/driver-onboarding/apply` | — | Application & auth account created, waitlist position assigned |
| 2. Ops Review & Background Check | `waitlist` → `approved` | Driver notified by email/SMS | `AdminDriverWaitlist` (`/admin/waitlist`) + background check provider | Ops vets applicant, initiates & records background check, toggles status |
| 3. Post-Waitlist Onboarding | `approved` | `/driver/post-waitlist-onboarding` | — | Driver provides all compliance data; system blocks progress until complete |
| 4. Enhanced Onboarding Tasks | `approved` (with `onboarding_completed_at`) | `/enhanced-onboarding` | `AdminDriverWaitlist` for monitoring | Driver completes gamified tasks; system auto-completes ones satisfied by prior data |
| 5. Activation | `active` | `/mobile` | `AdminDriverWaitlist` actions or edge function auto-activation | Driver gains access to mobile dashboard and can accept deliveries |

Drivers move forward automatically when requirements are satisfied; staff actions are needed for approval and activation.

---

## 3. Phase Details

### Phase 1 – Public Application (Unauthenticated)

- **Entry Point:** Buttons labelled *Apply to Become a Feeder* (driver portal & marketing pages) route to `/driver-onboarding/apply`.
- **Component:** `DriverApplicationWizard` (multi-step React flow).
- **Steps collected:**
  1. Account setup (email, password, first/last name, phone)
  2. Address (street, city, state, zip)
  3. Vehicle basics (type, make, model, year, color), driver’s license basics
  4. Initial payout/tax info (selection of payout method)
  5. Document upload (driver’s license front/back, insurance proof)
  6. Review & submit
- **System actions:**
  - Creates Supabase auth user & session.
  - Inserts a record into `craver_applications` with `status = 'waitlist'`.
  - Triggers region assignment via the `ensure-region` logic and establishes waitlist position.
  - Stores initial documents in storage buckets (if provided).
- **Staff involvement:** None at this step; monitor the waitlist dashboard for new applicants.

### Phase 2 – Operations Review & Background Check

- **Primary dashboard:** `/admin/waitlist` → `DriverWaitlistDashboard`.
- **Tasks for operations/compliance:**
  1. **Review application:** Confirm data completeness, check document quality, verify region assignment.
  2. **Initiate background check:** Use the external provider (e.g., Checkr). When the report finishes, update `craver_applications`:
     - Set `background_check` to `true` on success.
     - Record `background_check_report_id`, `background_check_initiated_at`, and `background_check_approved_at`.
  3. **Communicate with applicant:** Send follow-up questions or clarifications as needed.
  4. **Approve or hold:** When satisfied, update `craver_applications.status` to `approved`. The UI presents this via actions in the waitlist dashboard or directly in Supabase.
- **Behind the scenes:**
  - Approved drivers receive a welcome/next steps email (ensure notification templates are configured).
  - Logging in via `/driver/auth` now directs them to Post-Waitlist onboarding until required fields are populated.

### Phase 3 – Post-Waitlist Onboarding (Compliance Lock)

- **Route:** `/driver/post-waitlist-onboarding`.
- **Component:** `PostWaitlistOnboarding`.
- **Guardrails:**
  - `DriverAuth.tsx` verifies all required fields/documents/consents before allowing access to any other driver pages.
  - Missing data sends drivers back to this flow even if they try to bypass it.
- **Steps & stored fields:**
  1. Identity & eligibility: `date_of_birth`, `street_address`, optional SSN last-four.
  2. Driver license: `drivers_license`, `license_state`, `license_expiry`, `drivers_license_front`, `drivers_license_back`.
  3. Vehicle details: `vehicle_type`, `vehicle_make`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `license_plate`.
  4. Insurance: `insurance_provider`, `insurance_policy`, `insurance_document`.
  5. Payout method: `payout_method`, plus `cash_tag` or `routing_number` + `account_number_encrypted` (with last four extracted).
  6. Consents: `background_check_consent`, `criminal_history_consent`, `facial_image_consent`, `electronic_1099_consent`.
  7. Tax form & compliance: `w9_signed` flag, `contract_signed_at` (ICA signature timestamp).
- **Completion outcome:**
  - All fields become non-null / set.
  - On success the driver is redirected to `/enhanced-onboarding`.
  - Post-completion data also auto-completes relevant enhanced tasks.

### Phase 4 – Enhanced Onboarding Tasks (Gamified Queue)

- **Route:** `/enhanced-onboarding` → `EnhancedOnboardingDashboard`.
- **Purpose:** Keep approved drivers engaged, gather optional data, surface waitlist position.
- **Key UI sections:**
  - Queue position & region stats (powered by `get_driver_queue_position` RPC).
  - Points summary (`application.points`, `priority_score`).
  - Task list with auto-completion & manual actions.
- **Task automation:**
  - `upload_documents`: Automatically marked complete when license front/back and insurance docs exist.
  - `setup_cashapp_payouts`: Automatically complete if payout method and required banking/Cash App info are stored.
  - `complete_profile`: Completed when identity + vehicle data is present.
  - Manual tasks (vehicle photos, safety quiz, download app, join community, service training, referrals) provide buttons for drivers to finish or self-report.
- **Finishing:** When all tasks are complete, the system sets `craver_applications.onboarding_completed_at`. The driver stays `approved` until capacity opens.

### Phase 5 – Activation & Mobile Dashboard

- **Activation triggers:**
  - Manual activation via `Activate Selected` in the waitlist dashboard (invokes `activate-drivers` edge function).
  - Automatic activation when a region is switched to `active` (calls `auto-activate-region-drivers` for eligible drivers).
- **Status changes:**
  - `craver_applications.status` becomes `active`.
  - Activation timestamp stored by edge function.
- **Driver experience:** Next login goes straight to `/mobile` (driver dashboard) where they can start accepting offers when deployed.

---

## 4. Roles & Responsibilities

| Role | Primary Duties |
|------|----------------|
| **Operations / Support** | Monitor `/admin/waitlist`, communicate with applicants, manage status transitions, coordinate activation. |
| **Compliance** | Run background checks, review documents, ensure consents are valid, flag any legal holds. |
| **Engineering** | Maintain guardrails (`DriverAuth.tsx`, `PostWaitlistOnboarding.tsx`, `EnhancedOnboardingDashboard.tsx`), edge functions, and database constraints. |
| **Marketing / Growth** | Ensure application funnel links to `/driver-onboarding/apply`, update copy/FAQs. |

---

## 5. Data & System Reference

### Key Tables

- `craver_applications`: Source of truth for application data, driver status, compliance fields, queue metrics.
- `onboarding_tasks`: Task definitions and completion records for each driver (`driver_id` FK).
- `regions`: Region definitions, capacity, display quotas, status toggles.
- `driver_consents` (if enabled via LegalConsent flow): Historical consent records (legacy; Post-Waitlist now stores consents on the application record).

### Critical Fields & Flags

- `status`: `waitlist`, `approved`, `active`, (others like `rejected` optional).
- `welcome_screen_shown`: Controls celebratory confetti flow for newly approved drivers.
- `onboarding_completed_at`: All enhanced tasks finished.
- `contract_signed_at`: ICA signature timestamp; required before enhanced onboarding tasks.
- `background_check_*`: Several timestamps/flags that track the background check lifecycle.
- `points` & `priority_score`: Influence queue position and activation order.

### Edge Functions

- `start-onboarding`: Assigns waitlist position based on capacity (ensure this is called post-application).
- `complete-onboarding-task`: Marks tasks complete and awards points; used by dashboard buttons and auto-completion.
- `activate-drivers`: Batch activation & notification when staff selects drivers manually.
- `auto-activate-region-drivers`: Auto-enables top drivers when a region becomes active.

---

## 6. Operational Checklists

### Daily
- Review new entries in `/admin/waitlist` (filter by `status = waitlist`).
- Initiate background checks for new applicants and update status fields.
- Follow up on outstanding documents or rejects from background checks.

### Weekly
- Audit `approved` drivers stuck without completing Post-Waitlist onboarding; reach out with reminders.
- Check `onboarding_tasks` completion counts; identify patterns or tasks causing friction.
- Evaluate region quotas vs. actual drivers (`regions.active_quota` vs. `current_active` from dashboard cards).
- Trigger manual activation for top drivers if capacity is available and auto-activation has not yet run.

### Monthly / As Needed
- Review compliance data for accuracy (spot-check Supabase rows).
- Update documentation and training based on policy changes.
- Refresh referral and incentive messaging within enhanced onboarding tasks.

---

## 7. Troubleshooting & FAQs

| Symptom | Likely Cause | Resolution |
|---------|--------------|-----------|
| Driver logs in but loops back to `/driver/auth` | `craver_applications` row missing or `status` not set | Verify application record, ensure status at least `waitlist` |
| Approved driver sees Post-Waitlist onboarding every time | Required fields/documents/consents missing | Check `DriverAuth.tsx` guard fields; update application record or re-upload missing docs |
| Enhanced task not auto-completing | Application fields not set, or task key misconfigured | Confirm `craver_applications` columns contain values; ensure task key matches (`upload_documents`, `setup_cashapp_payouts`, `complete_profile`) |
| Region shows zero waitlist despite applicants | Region assignment failed or region inactive | Confirm `region_id` is set on application; run `ensure-region` function; check `regions.status` |
| Activation button fails | Edge function error or missing Supabase env config | Inspect Supabase function logs; ensure service role key available to frontend and env vars set |

---

## 8. Change Management Tips

- Any schema changes to `craver_applications` must be mirrored in:
  - `PostWaitlistOnboarding.tsx` (form fields)
  - `DriverAuth.tsx` (redirect guard)
  - `EnhancedOnboardingDashboard.tsx` (auto-completion logic)
  - Related edge functions that serialize driver data.
- When introducing new onboarding tasks:
  - Add definition in `onboarding_tasks` seed/creation logic.
  - Update auto-complete rules if the data comes from Post-Waitlist.
  - Adjust points and refer to gamification strategy.
- Coordinate messaging with marketing: ensure emails/SMS reflect the unified flow and reference `/driver/post-waitlist-onboarding` and `/enhanced-onboarding`.

---

## 9. Quick Links

- Driver application wizard: `src/pages/driverOnboarding/DriverApplicationWizard.tsx`
- Post-waitlist onboarding: `src/pages/driverOnboarding/PostWaitlistOnboarding.tsx`
- Driver auth routing guard: `src/pages/DriverAuth.tsx`
- Enhanced onboarding dashboard: `src/components/onboarding/EnhancedOnboardingDashboard.tsx`
- Admin waitlist dashboard: `src/components/admin/DriverWaitlistDashboard.tsx`
- Supabase client wrapper: `src/integrations/supabase/client.ts`

Keep this guide in sync with system changes. If you update code, migrations, or policies, revise the relevant sections so operations and engineering stay aligned on the driver onboarding pipeline.








