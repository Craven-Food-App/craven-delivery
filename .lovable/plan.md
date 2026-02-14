

# Crave'N Feeder Tier System -- Full Implementation

This is a large, multi-layered feature covering database schema, backend evaluation logic, frontend UI, and dispatch integration. Below is the full breakdown.

---

## Phase 1: Database Schema

### 1A. New Enum Type: `feeder_tier`

Create an enum with values: `Feeder`, `Gold`, `Platinum`, `Diamond`, `Ultimate`

### 1B. Alter `driver_profiles` Table

Add new columns:
- `tier_status` (feeder_tier, default 'Feeder')
- `tier_last_updated` (timestamptz)
- `rolling_rating` (numeric)
- `rolling_completion_rate` (numeric)
- `rolling_on_time_rate` (numeric)
- `rolling_cancel_rate` (numeric)
- `rolling_deliveries` (integer) -- deliveries in rolling 60-day window
- `fraud_flag` (boolean, default false)
- `customer_complaints_count` (integer, default 0)
- `tier_review_required` (boolean, default false) -- for Ultimate manual approval
- `tier_grace_period_start` (timestamptz) -- tracks 7-day grace before demotion
- `dispatch_weight` (integer, default 0)

Update existing `rating_tier` column to stay for backward compatibility but mark as deprecated (the new `tier_status` becomes the source of truth).

### 1C. New Table: `tier_history`

| Column | Type |
|--------|------|
| id | uuid PK |
| feeder_id | uuid FK -> driver_profiles.id |
| old_tier | feeder_tier |
| new_tier | feeder_tier |
| reason | text |
| created_at | timestamptz |

RLS: readable by the feeder themselves + admins.

### 1D. Database Function: `evaluate_feeder_tier(p_feeder_id uuid)`

A PL/pgSQL function that:
1. Calculates rolling 60-day metrics from completed orders
2. Applies the tier qualification rules from the spec
3. Handles the 7-day grace period for demotions
4. Requires `tier_review_required = true` (admin approval) for Ultimate
5. Inserts into `tier_history` on any tier change
6. Updates `dispatch_weight` based on new tier (0/5/10/18/30)

This function will be called by a nightly cron (via pg_cron or edge function) and can also be triggered on delivery completion.

---

## Phase 2: Tier Evaluation Edge Function

### `evaluate-feeder-tiers` Edge Function

- Called nightly via a scheduled job (or manually)
- Iterates all active feeders and calls `evaluate_feeder_tier()` for each
- Also callable per-feeder on delivery completion or rating update
- Sends internal alert (inserts notification) when an Ultimate feeder is downgraded

---

## Phase 3: Update Existing Types and Hooks

### 3A. Update `src/types/diamond-orders.ts`

Change `RatingTier` from `'Bronze' | 'Silver' | 'Gold' | 'Diamond'` to `'Feeder' | 'Gold' | 'Platinum' | 'Diamond' | 'Ultimate'`

### 3B. Update `src/hooks/diamond-orders/useDriverTier.ts`

- Read from `tier_status` instead of `rating_tier`
- Expose full tier info: `tier`, `dispatchWeight`, `isUltimate`, `isDiamond`, `isAtLeastPlatinum`

### 3C. New Hook: `src/hooks/useFeederTierProfile.ts`

Returns all tier-related data for the current feeder:
- Current tier + badge color
- All rolling metrics
- Next tier requirements + progress percentages
- Grace period status
- Tier history

### 3D. Update `src/utils/ratingHelpers.ts`

Replace the old 4-tier color scheme with:

| Tier | Color | Hex |
|------|-------|-----|
| Feeder | Neutral white | #F5F5F5 |
| Gold | Gold gradient | #D4AF37 |
| Platinum | Silver-white | #E5E4E2 |
| Diamond | Deep blue | #1E3A5F |
| Ultimate | Black + orange trim | #1A1A1A / #F57C00 |

---

## Phase 4: Feeder App UI -- Ratings Tab Redesign

### Redesign `src/components/mobile/FeederRatingsTab.tsx`

Replace the current mock-data ratings tab with a tier-aware version:

**Section 1 -- Tier Badge (top)**
- Large tier name (e.g., "Diamond Feeder")
- Color-coded badge matching the spec
- Ultimate gets a black card with orange trim border

**Section 2 -- Current Metrics**
- Rating: 4.92/5.00
- Completion: 97%
- On-Time: 95%
- Cancellation: 4%
- Deliveries (60-day): 523

Each with a progress bar showing distance to next tier threshold.

**Section 3 -- Next Tier Progress**
- "Next Tier: Ultimate Feeder"
- Deliveries remaining: 477
- Rating required: 4.95 (current: 4.92)
- Each requirement shown as a checklist (check/x icon)

**Section 4 -- Tier Perks**
- List of current tier perks (unlocked)
- Locked perks from next tier shown grayed out

**Section 5 -- Tier History** (collapsible)
- Recent tier changes with timestamps and reasons

### Design Rules
- Clean, enterprise styling -- no animations, no emojis
- Badge colors as specified in the spec
- Mobile-first, responsive
- Consistent with existing Crave'N orange (#F57C00) accent color

---

## Phase 5: Update Dispatch-Related Components

### Update `ExclusiveOrdersFeed.tsx` and related diamond-order components

- Replace `isDiamond` checks with tier-level checks (e.g., `isAtLeastDiamond`)
- Ultimate feeders get first access to all exclusive order types
- Platinum+ get premium merchant access

---

## Phase 6: Anti-Gaming (Database-Level)

Add to the `evaluate_feeder_tier` function:
- Skip ratings from customers flagged in a `flagged_customers` reference (if table exists, otherwise note for future)
- If `fraud_flag = true`, lock tier -- no promotions allowed
- Log suspicious rating spikes (>0.3 jump in 24h) to `tier_history` with reason "review_spike"

---

## Files Created / Modified Summary

| File | Action |
|------|--------|
| Database migration | Add `feeder_tier` enum, alter `driver_profiles`, create `tier_history`, create `evaluate_feeder_tier()` function |
| `supabase/functions/evaluate-feeder-tiers/index.ts` | New edge function for batch + per-feeder evaluation |
| `src/types/diamond-orders.ts` | Update `RatingTier` type to 5 tiers |
| `src/hooks/diamond-orders/useDriverTier.ts` | Read `tier_status`, expose richer tier info |
| `src/hooks/useFeederTierProfile.ts` | New hook for full tier profile data |
| `src/utils/ratingHelpers.ts` | Update colors, tiers, helpers for 5-tier system |
| `src/components/mobile/FeederRatingsTab.tsx` | Full redesign with tier badge, metrics, progress, perks, history |
| `src/components/diamond-orders/ExclusiveOrdersFeed.tsx` | Update tier gating logic |
| `src/components/diamond-orders/FlashDropCard.tsx` | Update tier checks |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

