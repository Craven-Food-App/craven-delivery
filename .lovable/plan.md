
# Fix Tier Inconsistencies Across the Entire Feeder App

## Problem

Three files still use the **old points-based tier system** (with "Silver", "Bronze", or a `points >= 95` check) instead of reading the real `tier_status` from the `driver_profiles` table. This creates visible inconsistencies across the app.

## Files to Fix

### 1. `src/components/mobile/FeederAccountPage.tsx`

**Current (broken)**: Uses a `StatusTier` type that includes "Silver" (not part of the spec). Calculates a fake `statusPoints` from `(totalDeliveries * 0.5) + (rating * 10)` and maps to tiers based on point thresholds (55/65/76/85/95).

**Fix**:
- Remove the `StatusTier`, `StatusInfo`, `TIERS`, `getStatus()`, and `tierProgress()` constructs
- Import `getTierConfig`, `getNextTier`, `TIER_ORDER` from `ratingHelpers.ts`
- Fetch `tier_status` from `driver_profiles` instead of computing points
- Update `IdentityRow` to show the real tier badge with correct colors
- Update `StatusRow` to show progress toward the next tier using real metrics (deliveries, rating, etc.) instead of fake points
- Remove "Silver" references entirely -- the system is Feeder / Gold / Platinum / Diamond / Ultimate

### 2. `src/components/mobile/RatingsSection.tsx`

**Current (broken)**: Uses a completely separate 4-tier system (`bronze`, `silver`, `gold`, `platinum`) with different thresholds and emoji icons. This is entirely disconnected from the real tier system.

**Fix**:
- Replace the local `DriverTier` type and `tierConfig` with imports from `ratingHelpers.ts`
- Fetch `tier_status` from `driver_profiles` instead of computing the tier locally
- Update the UI to use the official 5-tier names and colors (Feeder / Gold / Platinum / Diamond / Ultimate)
- Remove "Bronze" and "Silver" references
- Use `useFeederTierProfile` hook for consistent data

### 3. `src/components/mobile/FeedPreferencesPage.tsx`

**Current (broken)**: Determines Ultimate status using `points >= 95` (same fake points formula). Not connected to the real tier system.

**Fix**:
- Fetch `tier_status` from `driver_profiles` instead of computing points
- Check `tier_status === 'Ultimate'` instead of `points >= 95`
- Update the status display text to show the real tier name
- Remove the `statusPoints` state and points calculation

## Technical Approach

All three files will:
1. Query `tier_status` (and optionally `rolling_rating`, `rolling_deliveries`, etc.) from `driver_profiles`
2. Use `getTierConfig()` from `ratingHelpers.ts` for colors and display names
3. Use `getNextTier()` for progress indicators
4. Remove all local tier definitions, points calculations, and legacy tier names (Bronze, Silver)

## Summary of Changes

| File | What Changes |
|------|-------------|
| `FeederAccountPage.tsx` | Remove points-based `getStatus`/`TIERS`/`StatusTier`; fetch `tier_status` from DB; display real tier badge and progress |
| `RatingsSection.tsx` | Replace 4-tier `bronze/silver/gold/platinum` system with official 5-tier system from `ratingHelpers.ts`; fetch `tier_status` from DB |
| `FeedPreferencesPage.tsx` | Replace `points >= 95` check with `tier_status === 'Ultimate'` from DB; remove points calculation |
