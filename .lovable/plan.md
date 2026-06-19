
# Crave'N Express (CX)

A courier-style delivery branch blended into the existing Crave'N merchant and Feeder ecosystems. Courier companies sign up as a new merchant type, post pickup→dropoff jobs (on-demand, scheduled, or multi-stop), and our Feeder drivers fulfill them through the same dispatch, payout, rating, and tier systems already in production. Couriers set the driver payout they're willing to pay, and Crave'N stacks a platform base fee on top.

## Branding

- Name: **Crave'N Express** (display), **CX** (short).
- Same Crave'N orange palette, with a secondary "express" accent (deep navy `#0F172A`) and a CX wordmark to distinguish from food.
- Route: `/cx` (public landing) and `/cx/portal` (authenticated courier portal). Reuse `UnifiedPortalShell`.
- Menu entry added to the main site header and merchant portal: **"Switch to Courier Service"** / **"Find a Courier"** → routes to `/cx`.

## User flows

### Courier company (merchant side)
1. Lands on `/cx`, clicks "Sign up as a courier service".
2. Goes through the existing merchant onboarding (`merchant_partnership_requests` → `restaurant_onboarding_progress`) with `business_type = 'courier_service'`. The flow skips menu / POS / hours and adds: company info, service area, vehicle types accepted, insurance + DOT docs, billing.
3. Once approved, they get the CX portal: post a job, see active jobs, history, drivers assigned, invoices, ratings, fleet of recurring drop locations.

### Job types
- **On-demand** — single pickup→dropoff, dispatched immediately.
- **Scheduled** — same as on-demand but with a future `pickup_at` window.
- **Bulk route** — courier uploads/enters multiple stops; system optimizes via Google Maps Routes API and assigns to one driver.

### Driver (Feeder) side
- Driver preferences gain two toggles:
  - `cx_opt_in` (boolean) — any Feeder can opt in to receive CX requests.
  - `cx_tier_verified` (boolean, set by admin) — passed extra courier verification (insurance, vehicle, ID).
- Dedicated-tier drivers still control acceptance with `cx_opt_in`. A CX job is offered to verified-and-opted-in drivers first, then falls back to general opted-in Feeders if no one accepts within N seconds (configurable, default 60s).
- In the Feeder app, CX jobs appear in the same queue with a clear "CX" pill, payout breakdown (courier offer + Crave'N base), and stop count.

### Pricing
- Courier sets `driver_payout_offer_cents` per job (with a configured minimum floor by distance/stop count).
- Crave'N adds `platform_base_cents` (configurable per region / job type).
- Customer (courier) invoice = courier offer + platform base + taxes.
- Driver earnings = courier offer + tips. (No Crave'N cut from the courier's offer to the driver — that's the model the user described.)

## Database changes

New enums + tables (full migration in technical section):
- `cx_job_type` enum: `on_demand | scheduled | bulk_route`.
- `cx_job_status` enum: `draft | posted | offered | accepted | en_route_pickup | picked_up | en_route_dropoff | delivered | cancelled | failed`.
- `cx_jobs` — one row per job (links to courier merchant + assigned driver + price fields + window times).
- `cx_job_stops` — ordered stops for bulk routes (single jobs use 2: pickup + dropoff).
- `cx_job_events` — status timeline / audit trail.
- `cx_pricing_config` — base fees, minimum payout floors, fallback timing, by region.
- `cx_driver_verification` — courier-tier qualification: insurance docs, vehicle class, expiry dates, status.

Extend existing tables:
- `restaurants`: add `business_type text` (`restaurant | grocery | retail | courier_service`).
- `driver_preferences`: add `cx_opt_in boolean`, `cx_tier_verified boolean`.

All new public tables get explicit `GRANT`s (authenticated + service_role), RLS enabled, and policies scoped by:
- Couriers see only their own jobs (`courier_user_id = auth.uid()` via `restaurant_users`).
- Drivers see jobs offered to them or in their queue.
- Admins / dispatch / `exec_users` see all.

## Edge functions

- `cx-post-job` — validates, prices, creates `cx_jobs` row, kicks off dispatch.
- `cx-dispatch-job` — picks eligible drivers (verified+opted-in → opted-in fallback), writes offers, fires notifications, handles timeout escalation.
- `cx-accept-job` / `cx-update-status` — driver actions.
- `cx-optimize-route` — calls Google Maps Routes API for bulk-route ordering + ETAs (uses existing google_maps connector).
- `cx-invoice-job` — on delivery, generates courier invoice line item.

## Frontend modules

New:
- `src/pages/cx/CXLandingPage.tsx` — public CX marketing/landing.
- `src/pages/cx/CXSignupPage.tsx` — courier signup entry (routes into existing merchant onboarding with `business_type=courier_service`).
- `src/portals/cx/CXPortalLayout.tsx` + routes.
- `src/portals/cx/modules/` — Dashboard, PostJob (with map picker), ActiveJobs, JobHistory, BulkRouteBuilder, Invoices, Drivers (read-only roster of who fulfilled jobs), Settings.
- `src/components/cx/CXJobCard.tsx`, `CXBranding.tsx`, `CXPriceBreakdown.tsx`, `CXStopList.tsx`.
- Feeder app: extend `EarningsDashboard` and the active-orders queue with a CX section + opt-in toggle in driver settings.

Edits:
- Main site header + merchant portal sidebar: add "Crave'N Express / Find a Courier" link.
- `MerchantOperationsPortal` filters: include `business_type=courier_service`.
- Driver settings page: add the two CX toggles.

## Production readiness

- RLS policies + GRANTs on every new table; admin/exec bypass via existing `has_permission`.
- Strict input validation with zod in edge functions; service_role only inside functions.
- Audit trail via `cx_job_events`.
- Realtime subscription on `cx_jobs` for courier dashboard and driver queue.
- Pricing floors enforced server-side, not just UI.
- Insurance/DOT docs stored in existing `business_documents` bucket with the same RLS pattern as merchant docs.
- All UI mobile-first, orange primary, CX navy accent, tabular numbers per the enterprise compact standard.

## Build order (so nothing ships half-wired)

1. Migration: enums, tables, GRANTs, RLS, `business_type` + driver pref columns, `cx_pricing_config` seed row.
2. Edge functions (post, dispatch, status, optimize, invoice).
3. CX public landing + signup wiring into existing merchant onboarding.
4. CX courier portal modules (post job → active → history → bulk → invoices).
5. Feeder integration: CX queue card, opt-in toggle, accept/update flows.
6. Admin: CX dashboard tab in support/ops for monitoring jobs + verifying courier-tier drivers.
7. QA pass on mobile (440px), realtime, and pricing math.

## Technical details

```sql
-- enums
CREATE TYPE cx_job_type AS ENUM ('on_demand','scheduled','bulk_route');
CREATE TYPE cx_job_status AS ENUM (
  'draft','posted','offered','accepted',
  'en_route_pickup','picked_up','en_route_dropoff',
  'delivered','cancelled','failed'
);

-- jobs
CREATE TABLE public.cx_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,                 -- auth.uid()
  job_type cx_job_type NOT NULL,
  status cx_job_status NOT NULL DEFAULT 'draft',
  pickup_at timestamptz,                    -- null for on-demand "now"
  driver_payout_offer_cents int NOT NULL,
  platform_base_cents int NOT NULL,
  total_charge_cents int GENERATED ALWAYS AS (driver_payout_offer_cents + platform_base_cents) STORED,
  assigned_driver_id uuid,
  region_id uuid,
  notes text,
  optimized_polyline text,
  estimated_distance_meters int,
  estimated_duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cx_job_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.cx_jobs(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  stop_type text NOT NULL CHECK (stop_type IN ('pickup','dropoff')),
  address text NOT NULL,
  latitude numeric, longitude numeric,
  contact_name text, contact_phone text,
  package_description text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cx_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.cx_jobs(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cx_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid,
  job_type cx_job_type NOT NULL,
  platform_base_cents int NOT NULL,
  minimum_driver_payout_cents int NOT NULL,
  per_mile_floor_cents int NOT NULL DEFAULT 0,
  per_stop_floor_cents int NOT NULL DEFAULT 0,
  dispatch_timeout_seconds int NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cx_driver_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  insurance_doc_url text,
  insurance_expires_on date,
  vehicle_class text,
  max_package_size text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|expired
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTs (every table)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_jobs, public.cx_job_stops,
  public.cx_job_events, public.cx_driver_verification TO authenticated;
GRANT SELECT ON public.cx_pricing_config TO authenticated;
GRANT ALL ON public.cx_jobs, public.cx_job_stops, public.cx_job_events,
  public.cx_pricing_config, public.cx_driver_verification TO service_role;

-- RLS + policies (full set in migration)

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'restaurant';

ALTER TABLE public.driver_preferences
  ADD COLUMN IF NOT EXISTS cx_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cx_tier_verified boolean NOT NULL DEFAULT false;
```

Dispatch logic (in `cx-dispatch-job`): query `driver_profiles` where `is_available = true` AND `status = 'online'`, join `driver_preferences` where `cx_opt_in = true`, prefer `cx_tier_verified = true` within geofence; offer to top N by tier weight; on timeout, broaden to all opted-in drivers; on final timeout, mark `failed` and notify courier with refund option.

Pricing validation in `cx-post-job`: reject if `driver_payout_offer_cents < minimum_driver_payout_cents + per_mile_floor_cents * miles + per_stop_floor_cents * stops`.

Route optimization uses Google Maps Routes API via the existing `google_maps` connector gateway (`routes/directions/v2:computeRoutes` for single, `routeoptimization/` for bulk).

