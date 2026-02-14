

# Back Button + Sidebar Tier Sync + Tier Ombre Color

## What Changes

### 1. Back Button on Feeder Tier / Ratings Page

Add a back arrow button to the top-left of the `FeederRatingsTab.tsx` top bar. Tapping it navigates back to the Home tab (`/mobile`). The `onOpenMenu` prop is already available; we will add an `onBack` callback prop (or use `onOpenMenu` to navigate home).

### 2. Sidebar Tier Sync

The `FeederSidebarMenu.tsx` currently uses a points-based status system (`getStatus(driverPoints)` returning Diamond/Platinum/Gold/Silver) that is **not** connected to the actual `tier_status` column. This needs to be updated to:
- Read `tier_status` from `driver_profiles` (the source of truth set by the tier evaluation system)
- Display the correct tier name in the badge (e.g., "Gold Feeder", "Diamond Feeder", "Ultimate Feeder")
- Use the tier config from `ratingHelpers.ts` for colors

### 3. Ombre / Glow Color Matches Tier

The sidebar's top glow gradient (`status.glowGradient`) currently uses hardcoded Diamond/Platinum/Gold/Silver gradients based on points. This will be replaced with tier-specific gradients derived from the actual `TIER_CONFIG` colors:

| Tier | Glow Gradient |
|------|---------------|
| Feeder | Neutral gray fade |
| Gold | Gold/amber fade |
| Platinum | Silver/gray fade |
| Diamond | Deep blue fade |
| Ultimate | Black-to-orange fade |

## Technical Details

### FeederRatingsTab.tsx

- Add `onBack?: () => void` prop
- Render a left-arrow button in the top bar that calls `onBack` (or navigates to `/mobile`)
- Wire the prop from `MobileDriverDashboard.tsx`

### FeederSidebarMenu.tsx

1. Replace the `getStatus(driverPoints)` function and `driverPoints` state with a query for `tier_status` from `driver_profiles`
2. Import `getTierConfig` from `ratingHelpers.ts` to get the correct colors
3. Create a `TIER_GLOW_GRADIENTS` map keyed by tier name for the ombre effect
4. Update the `badgeText` and badge styling to use the real tier
5. Update the top glow div to use the tier-matched gradient

### MobileDriverDashboard.tsx

- Pass `onBack` prop to `FeederRatingsTab` that sets `activeTab('home')` and navigates to `/mobile`

### Files Modified

| File | Change |
|------|--------|
| `src/components/mobile/FeederRatingsTab.tsx` | Add back button to top bar |
| `src/components/mobile/FeederSidebarMenu.tsx` | Replace points-based status with `tier_status` from DB; match glow gradient to tier |
| `src/components/mobile/MobileDriverDashboard.tsx` | Pass `onBack` handler to FeederRatingsTab |

