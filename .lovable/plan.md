## Goal
Update all customer-facing wording, metadata, and marketing copy across the Crave'N ecosystem so it no longer reads as a food-delivery-only brand. New positioning:

**Crave'N — Food. Grocery. Retail. Convenience. Courier (CX).**
One app. One network. Powered by Feeders.

No business logic, routes, schemas, or features change — copy/SEO only.

## Scope (presentation layer only)

### 1. Sitewide metadata & SEO
- `index.html` (root) + `apps/customer/index.html`
  - `<title>`, `meta description`, `meta keywords`
  - `og:title`, `og:description`, `twitter:title`, `twitter:description`
  - JSON-LD: change `@type` from `FoodEstablishment` → `Organization` with `LocalBusiness`/department-style description listing all verticals
- `public/manifest.json` — name/description
- `public/robots.txt` / `sitemap.xml` — no copy changes needed (verify)

### 2. Homepage & hero
- `src/pages/Index.tsx` + `apps/customer/src/pages/Index.tsx` — Helmet title/description
- `src/components/Hero.tsx` + `apps/customer/src/components/Hero.tsx` — headline + subhead reflect all 5 verticals
- Add a compact "Divisions" strip (Food · Grocery · Retail · Convenience · CX) under the hero CTA

### 3. Marketing & info pages
- `AboutUs.tsx`, `Careers.tsx`, `PartnerWithUs.tsx`, `Support.tsx`, `Success.tsx`, `DownloadApp.tsx`, `InviteFriends.tsx`, `TermsOfService.tsx` (intro paragraph only — legal clauses untouched), `Restaurants.tsx` (page intro/SEO copy, not the listings)
- Mirror updates in `apps/customer/src/pages/*` equivalents

### 4. Shared UI copy
- `Footer.tsx` — tagline/strapline if present (link labels already cover divisions)
- `AndroidEnrollmentPopup.tsx` — install copy
- `LiveMerchantTesting.tsx` — only user-visible strings

### 5. Investor / board / pitch surfaces
- `ExecutiveSummary.tsx`, `PitchDeckPresentation.tsx`, `PitchDeckManager.tsx`, `ArticlesOfIncorporationGenerator.tsx` — update business description blurbs to the multi-vertical positioning (Articles legal "purpose" clause stays generic — just broaden wording)

### 6. Support / AI / templates
- `supabase/functions/ai-chat-support/index.ts` — system prompt company description
- `src/utils/seedTemplatesFromCode.ts` + customer mirror — template intro strings
- `src/portals/intern/training/ModuleViewer.tsx` — onboarding copy
- `src/config/appStore.ts` — store listing description

### 7. CX-specific surfaces (already exist, just align tone)
- `CXIntroSection.tsx`, `CXLandingPage.tsx` — keep, but tighten so CX is framed as the 5th division, not a bolt-on. Reaffirm 15% cap and that consumers + businesses both request CX through the consumer app.

## Out of scope
- No route/file renames
- No DB / schema / RLS / edge-function logic changes
- No changes to executive/governance/legal binding documents already signed
- Driver, merchant, admin internal portals — only update obvious public-facing strings; leave operational terminology alone

## New canonical copy blocks (reusable)

**Short tagline:** "Food, grocery, retail, convenience, and courier — on demand."

**One-liner:** "Crave'N is the on-demand network for food, grocery, retail, convenience, and same-day courier (CX) — one app, one Feeder fleet, one platform."

**Meta description:** "Order food, groceries, retail, and convenience items — or send a package with Crave'N Express (CX). One app, same-day delivery, powered by local Feeders."

**Divisions list (always in this order):** Crave'N Food · Crave'N Grocery · Crave'N Retail · Crave'N Convenience · Crave'N Express (CX)

## Execution
~25 files edited in two batched passes (root `src/` and mirrored `apps/customer/src/`). After edits: visual spot-check homepage on mobile viewport, confirm no broken Helmet tags.

Estimated change: copy strings only, ~200–400 line diffs total, zero behavior change.
