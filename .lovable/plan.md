
# Crave'N Express (CX) — Enterprise Courier Company Application & Onboarding

You're right — the current `/cx/signup` is a 6-field intake form. That's a lead capture, not an application. For a B2B courier company being granted dispatch rights into your driver pool, this needs to look like the merchant + driver onboarding flows combined: a multi-step gated application with document uploads, verification, and a structured review workflow in the CPO portal.

## What gets built

### 1. Public multi-step CX Application (`/cx/apply`)
Replaces the current single-page form. 6 gated steps with autosave (draft persisted to DB so applicants can resume).

```text
Step 1 — Company Profile
  Legal name, DBA, EIN, business structure (LLC/Corp/Sole Prop/Partnership),
  state of incorporation, years in operation, website, business address

Step 2 — Primary Contact & Ownership
  Owner/officer name, title, email, phone, mobile, ownership %
  Secondary operations contact, dispatch contact (24/7)

Step 3 — Operations & Service Area
  Cities/zips served, daily volume capacity, hours of operation,
  vehicle mix (cars/vans/trucks/cargo bikes), fleet size,
  W-2 vs 1099 driver model, current client base / verticals

Step 4 — Compliance Documents (uploads, required)
  • Commercial Auto Insurance Certificate ($1M min liability)
  • General Liability Insurance Certificate
  • Workers' Comp Certificate (or exemption affidavit)
  • Business License (state + city)
  • Articles of Incorporation / Operating Agreement
  • W-9
  • DOT / MC Authority (if applicable, conditional)
  • EIN Verification Letter (IRS CP-575 or 147C)

Step 5 — Background & Safety Attestation
  MVR program in place (yes/no + provider), drug testing program,
  driver onboarding standards, incident reporting process,
  prior carrier references (3), claims history (last 24mo)

Step 6 — Legal & Sign
  Master Services Agreement (MSA) — full text + e-signature
  Independent Contractor / Carrier Agreement — e-sign
  Indemnification & Insurance Addendum — e-sign
  W-9 attestation, certification of truthfulness, ACH/payout intent
```

Each step validates before advancing. Step 4 uploads go to a private storage bucket. Step 6 captures typed + drawn signature with IP/timestamp.

### 2. Database
New tables (replace shoe-horning into `merchant_partnership_requests`):

- `cx_applications` — one row per company, all step data, `status` (draft / submitted / under_review / contacted / docs_pending / approved / rejected / activated), `submitted_at`, `reviewed_by`, `decision_notes`, `signed_msa_url`, `signature_payload` jsonb
- `cx_application_documents` — `application_id`, `doc_type`, `file_url`, `file_name`, `uploaded_at`, `verified` bool, `verified_by`, `expires_at` (for insurance/license)
- `cx_application_references` — carrier references from step 5
- `cx_application_events` — audit log (every status change, doc verification, note, email sent)

Private storage bucket: `cx-applications` with RLS so applicants only see their own drafts; CPO/exec roles see all.

### 3. CPO Portal — CX Applications (rebuilt)
Replaces the current single-modal review. Becomes a full review workspace:

- **List view** — filters by status, search, sortable columns, expiring-doc badges
- **Detail drawer** (full-height side panel, not a small modal) with tabs:
  - **Overview** — company snapshot, status timeline, quick approve/reject/contacted with required note
  - **Documents** — every uploaded file with inline PDF/image viewer, per-doc verify button, expiration date input, "request replacement" action
  - **Compliance** — checklist of required items (auto-ticks as docs are verified); cannot approve until all required = verified
  - **References** — reference list with "mark called" + notes per reference
  - **Signed Agreements** — MSA, carrier agreement, indemnification — view signed PDFs
  - **Activity Log** — full audit trail
  - **Notes** — internal CPO/exec notes thread
- **Approve action** = gated on: all required docs verified + MSA signed + at least 1 reference contacted. On approve → creates CX partner record, provisions CX portal access, sends activation email.

### 4. Routes & access
- `/cx/apply` — public multi-step (replaces `/cx/signup`); old route redirects
- `/cx/apply/resume?token=…` — resume draft via emailed link
- CPO Portal → CX Applications tab — already exists, gets rebuilt

### 5. Notifications (deferred per your earlier call)
Hooks left in `cx_application_events` so email/notification wiring can be added later without schema changes.

---

## Technical section

**Files added**
- `src/pages/cx/CXApplyPage.tsx` (multi-step wrapper)
- `src/pages/cx/steps/Step1Company.tsx` … `Step6Sign.tsx`
- `src/pages/cx/components/CXDocUpload.tsx`, `CXSignaturePad.tsx`, `CXProgressRail.tsx`
- `src/portals/cpo/tabs/CXApplications.tsx` (rebuilt — list)
- `src/portals/cpo/components/CXApplicationDrawer.tsx` (review workspace)
- `src/portals/cpo/components/CXDocViewer.tsx`, `CXComplianceChecklist.tsx`, `CXActivityLog.tsx`
- `src/hooks/useCXApplication.ts` (autosave + state)
- `src/lib/cx/requiredDocs.ts`, `src/lib/cx/agreements.ts` (MSA + carrier agreement HTML)

**Files modified**
- `src/pages/cx/CXSignupPage.tsx` → redirect to `/cx/apply`
- `src/App.tsx` (or router file) — new routes
- `src/portals/cpo/CPOPortal.tsx` — wire rebuilt tab

**Migration**
- `cx_applications`, `cx_application_documents`, `cx_application_references`, `cx_application_events` with GRANTs + RLS (applicant sees own draft via session token; authenticated CPO/exec roles see all via `has_permission`)
- Storage bucket `cx-applications` (private) + RLS

**Reuses existing patterns**
- Signature pad: same flow as executive onboarding
- Doc viewer: same component pattern as merchant/driver doc review
- Drawer layout: matches existing UnifiedPortalShell drawer

**Out of scope (call out)**
- Email notifications (you said skip — hooks left in place)
- Stripe subscription billing after approval (already separately scoped in CX spec)
- Driver-pool opt-in flow (separate feature)

---

Confirm and I'll build it end-to-end. If you want to trim scope (e.g., fewer steps, skip references, skip e-sign MSA on v1), say which sections to cut.
