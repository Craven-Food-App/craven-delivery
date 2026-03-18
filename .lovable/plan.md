

# Feeder Tier System -- Full Integration Plan

## Problem

The tier system spec is defined in `ratingHelpers.ts` but **none of the mobile/feeder UI components actually use it**. There are 4 separate ratings/score components, each with their own hardcoded or mock data, and none query the real rolling metrics from `driver_profiles`.

### Current State (Broken)

| Component | Data Source | Tier Logic |
|---|---|---|
| `FeederRatingsTab.tsx` (active in feeder app) | Mock data (all zeros) | None |
| `DriverRatingsPage.tsx` | Hardcoded (score=95) | Wrong reward system |
| `RatingsSection.tsx` | Real DB queries | Correct but unused |
| `score.tsx` (feeder page) | `driver_scores` table | Wrong (0-100 scale) |
| `ratingHelpers.ts` | N/A (utility) | Correct spec constants |

### Database (Already Exists)

`driver_profiles` already has: `rolling_rating`, `rolling_completion_rate`, `rolling_on_time_rate`, `rolling_cancel_rate`, `rolling_deliveries`, `rating_tier`

`tier_history` table already exists with `feeder_id`, `old_tier`, `new_tier`, `reason`, `created_at`

---

## Plan

### 1. Rewrite `FeederRatingsTab.tsx` to Use Real Data + Tier Spec

Replace the mock data hook with a real Supabase query that pulls from `driver_profiles`:
- `rolling_rating`, `rolling_completion_rate`, `rolling_on_time_rate`, `rolling_cancel_rate`, `rolling_deliveries`, `rating_tier`

Use `evaluateFeederTier()` and `getNextTier()` from `ratingHelpers.ts` to determine the current tier and next tier requirements.

Display:
- Tier badge (color-coded per spec: white/gold gradient/silver-white/deep blue/black+orange)
- Current rating with stars
- Performance Pulse metrics (On-Time, Completion, Cancellation rates from rolling data)
- Rating breakdown (keep existing star breakdown UI)
- Next tier progress section showing requirements vs current values
- Tier benefits list matching the spec exactly

### 2. Update `score.tsx` (Feeder Score Page)

- Replace the `getTier` function (which uses a 0-100 score scale) with `evaluateFeederTier()` from `ratingHelpers.ts`
- Query `driver_profiles` rolling metrics instead of `driver_scores`
- Add cancellation rate display (missing from current UI)
- Add next-tier progress section with deliveries remaining, rating required, etc.

### 3. Consolidate: Remove `DriverRatingsPage.tsx` Usage

- The feeder app already uses `FeederRatingsTab` -- confirm `DriverRatingsPage` is not referenced anywhere active and leave it as-is (no breakage risk)

### 4. Add Tier Badge to Feeder Account Page and Dashboard

- On the account page header, show the current tier badge (icon + name + color)
- On the main dashboard (home tab), show a small tier indicator near the driver's name/status

### 5. Ensure `RatingsSection.tsx` Stays in Sync

- This component already has correct logic; add the missing `cancellation_rate` metric and ensure it imports thresholds from `ratingHelpers.ts` instead of duplicating them inline

---

## Technical Details

### Shared Hook: `useFeederTier`

Create a reusable hook that all components can share:

```typescript
// src/hooks/useFeederTier.ts
function useFeederTier(userId: string) {
  // Query driver_profiles for rolling metrics
  // Call evaluateFeederTier() from ratingHelpers
  // Return: { tier, metrics, nextTier, loading }
}
```

### Files to Modify

1. **`src/hooks/useFeederTier.ts`** -- New shared hook (or update existing `useDriverTier.ts`)
2. **`src/components/mobile/FeederRatingsTab.tsx`** -- Replace mock data with real queries + full tier UI
3. **`src/pages/feeder/score.tsx`** -- Fix tier evaluation to use spec thresholds
4. **`src/components/mobile/FeederAccountPage.tsx`** -- Add tier badge display
5. **`src/components/mobile/RatingsSection.tsx`** -- Add cancellation rate, import from ratingHelpers
6. **`src/components/mobile/MobileDriverDashboard.tsx`** -- Add tier indicator to home tab header

### Badge Colors (from spec)

- Feeder: White background, gray text, gray border
- Gold: Gold gradient, dark gold text
- Platinum: Silver-white gradient, gray text
- Diamond: Deep blue gradient, white text
- Ultimate: Black background, orange (#E8622A) text/border

### No Database Changes Needed

All required columns and tables already exist in the schema.

