# Crave'N Express — Production Build Plan

Six ordered phases. Each phase is shippable on its own so the build stays smooth and we can verify before moving on.

---

## Phase 1 — Courier-branch of the Merchant Portal
Same `/merchant-portal` route, but when `restaurants.business_type = 'courier_service'` the portal renders a dispatch-style UI instead of restaurant tools.

- New `src/components/merchant/CourierPortalView.tsx` with tabs: **Dashboard**, **Post Job**, **Active Jobs**, **Route Builder**, **Driver Pool**, **Invoices**, **Settings**.
- Reuse existing `CXPostJobForm` and `CXJobList`; add `CXRouteBuilder` (multi-stop) and `CXDriverPool` (verified + opted-in Feeders, read-only).
- `MerchantPortal.tsx` detects business type on load and branches: courier → `CourierPortalView`, everything else → existing portal.
- Shared chrome (header, sidebar, account menu) stays identical so billing/settings work the same.

## Phase 2 — Billing for CX Merchants
Stripe subscription tier specifically for courier merchants (separate from restaurant commission model).

- Use Lovable's built-in Stripe payments. Add a `cx_subscription_plans` table (name, monthly_price_cents, included_jobs, overage_cents, stripe_price_id).
- New columns on `restaurants` (courier subset): `cx_stripe_customer_id`, `cx_stripe_subscription_id`, `cx_subscription_status`, `cx_plan_id`.
- Edge functions: `cx-create-checkout`, `cx-customer-portal`, `cx-stripe-webhook` (subscription created/updated/canceled, invoice paid/failed).
- Settings tab in the courier portal shows current plan, usage this cycle, "Manage Billing" → Stripe customer portal.
- Block `cx-post-job` server-side when `cx_subscription_status` is not `active` or `trialing`.

## Phase 3 — Driver-Facing CX Queue (Feeder app)
- Drop `CXDriverOptInCard` into `FeederAccountPage` → Preferences.
- Add a **CX** tab to the Feeder home next to Food: lists incoming/available CX jobs from `cx_jobs` filtered by tier + opt-in, realtime.
- `CXJobOfferModal`: shows pickup, dropoff(s), distance, driver payout, accept/decline (calls `cx-accept-job`).
- Active CX job → status flow buttons (En route to pickup → Picked up → En route → Delivered) calling `cx-update-status`.
- Tip + payout flows through the existing earnings/tips bucket we already built (no Crave'N cut on the courier's offer).

## Phase 4 — Dispatch Fallback Timer
Re-broadcast unaccepted jobs from verified tier → general opted-in pool.

- Add `dispatch_round`, `next_broadcast_at`, `expires_at` columns to `cx_jobs`.
- `cx-dispatch-job` writes `next_broadcast_at = now() + fallback_seconds` (from `cx_pricing_config`).
- New scheduled edge function `cx-dispatch-tick` (pg_cron every 30s) that finds jobs past `next_broadcast_at` still unassigned and bumps the round / widens the candidate pool. After max rounds → mark `dispatch_failed`, notify courier.
- Realtime push to drivers on each round.

## Phase 5 — Courier Onboarding Docs
Insurance + DOT + business license uploads during courier merchant signup.

- New step in `MerchantLandingPage` flow when `businessType === 'Courier Service'`: upload commercial auto insurance certificate (PDF/JPG), DOT number (optional), business license, W-9.
- Store in existing `business-documents` bucket under `courier/{merchant_id}/...`.
- Rows in `business_documents` with `doc_type` in (`courier_insurance`, `dot_authority`, `business_license`, `w9`) + `expires_at`.
- Courier portal Settings → Documents tab shows status, expiry warnings (30/14/0 days), re-upload.
- Admin review gate: `cx_subscription_status` cannot move to `active` until insurance is `approved` and unexpired.

## Phase 6 — Server-Side Pricing Floors + `cx-post-job`
Lock down pricing math so couriers can't underpay drivers.

- New edge function `cx-post-job` (replaces direct insert from `CXPostJobForm`).
- Validates with zod, computes distance via Google Maps Distance Matrix, enforces floor from `cx_pricing_config` (`min_payout_cents`, `min_per_mile_cents`, `min_per_stop_cents`).
- Adds `platform_base_cents` from config so customer total = courier offer + platform base + tax.
- Rejects with clear errors if subscription inactive, doc requirements unmet, or offer below floor.
- `CXPostJobForm` switches to invoking this function and shows live "minimum payout" hint as the operator types.

---

## Technical Notes

- All new tables follow the GRANT → RLS → POLICY order. Service role granted for edge functions; authenticated grants scoped by `auth.uid()` against the courier's `restaurants.owner_id` or the driver's id.
- Realtime publication added for `cx_jobs` (already done) and any new status columns picked up automatically.
- All edge functions use `corsHeaders` and zod validation per project conventions.
- Mobile-first: courier portal collapses to single column at 440px; Feeder CX UI matches the existing Feeder layout (80px bottom nav, max 140px sticky map).
- No mock data; everything reads/writes live tables.

## Build Order & Checkpoints
1. Phase 1 → verify courier signup → portal shows dispatch UI.
2. Phase 2 → run a test checkout; verify webhook updates `cx_subscription_status`.
3. Phase 3 → on Feeder web replica at 440px, accept a test job end-to-end.
4. Phase 4 → seed a stale job, watch tick re-broadcast.
5. Phase 5 → upload insurance, confirm gate blocks/unblocks billing activation.
6. Phase 6 → attempt a sub-floor offer, see rejection; valid offer goes through and bills the customer correctly.

After all six, run `supabase--linter` and fix any RLS warnings before declaring CX production-ready.
