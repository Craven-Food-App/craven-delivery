

# Feeder App: Safe Areas, Scrolling, and Enterprise-Grade Delivery Flow

## Overview

Standardize the entire Feeder app so all pages, headers, and content stay within Android/iOS safe areas, scroll properly, and the delivery flow gets a compact enterprise-grade redesign.

## Current Issues

1. **Inconsistent safe area handling** -- Some pages use `env(safe-area-inset-top)`, others use hardcoded `43px` offsets, and the delivery flow uses a fixed 48px black bar at the bottom
2. **Hardcoded bottom bars** -- `CravenDeliveryFlow.tsx` renders a fixed black `<Box>` at the bottom (lines 1851-1862, 1870-1882). The offline home state also renders a fixed 48px orange bar. The paused state also has a 48px bottom bar
3. **Delivery flow has oversized UI** -- 100px earnings font, 120px icons, `size="lg"` buttons, 45% map height that squeezes content on small screens
4. **Schedule tab** has no safe-area top padding on its sticky header
5. **Account page** `TopBar` has no safe-area top padding
6. **DriverBottomNav** handles safe area correctly but some pages don't account for it
7. **Map overlay headers** (hamburger, pause button) use `calc(env(safe-area-inset-top, 0px) + 43px)` which may clip on some devices

## Plan

### Phase 1: Create a shared SafeAreaWrapper component

Create a lightweight wrapper component used across all Feeder app pages that applies consistent safe-area padding:

```tsx
// src/components/mobile/SafeAreaWrapper.tsx
const SafeAreaWrapper = ({ children, fullHeight = true }) => (
  <div style={{
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    minHeight: fullHeight ? '100dvh' : undefined,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
  }}>
    {children}
  </div>
);
```

### Phase 2: Standardize all page headers

Every tab page (Schedule, Earnings, On Fire, Promos, Account, Ratings) will use the same header pattern:

```tsx
<div style={{
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: '#fff',
  borderBottom: '1px solid #eee',
  padding: '12px 16px',
  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
}}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <button>hamburger</button>
    <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2 }}>Page Title</h1>
    <button>action</button>
  </div>
</div>
```

**Files to update:**
| File | Current Header | Change |
|------|---------------|--------|
| `FeederScheduleTab.tsx` | Sticky header, no safe area top padding | Add `paddingTop: calc(env(safe-area-inset-top) + 12px)` |
| `EarningsDashboard.tsx` | Has safe area on container, header uses `sticky top-0` | Move safe area padding into the sticky header itself |
| `CorporateEarningsDashboard.tsx` | Has safe area on container, header uses `sticky top-0` | Move safe area padding into the sticky header itself |
| `FeederPromotionsTab.tsx` | Has safe area on container, header uses `sticky top-0` | Move safe area padding into the sticky header itself |
| `FeederAccountPage.tsx` | `TopBar` has fixed 56px height, no safe area | Add safe area top padding |

### Phase 3: Remove all hardcoded bottom bars

Remove every instance of hardcoded black/orange bottom bars:

- `CravenDeliveryFlow.tsx` lines 1851-1862 and 1870-1882: Delete the fixed black `<Box>` bars
- `MobileDriverDashboard.tsx` line 1721: Delete the fixed orange footer bar (`height: 48px`)
- `MobileDriverDashboard.tsx` line 1779: Delete the fixed orange footer bar in searching state
- `MobileDriverDashboard.tsx` line 1859: Delete the fixed black bar in paused state

Replace with proper `env(safe-area-inset-bottom)` padding on content containers.

### Phase 4: Compact the delivery flow (CravenDeliveryFlow.tsx)

**Map section:**
- Change from `h="45%"` / `h="calc(45% + 50px)"` to a fixed `height: 200px`
- Replace the full-height gradient `MapHeader` with a compact 48px overlay bar at the bottom of the map showing: status, destination name, and distance in one row
- Remove the "CRAVEN" branding and oversized `ThemeIcon` from the header

**Content section:**
- Remove `borderTopLeftRadius: 20px` / `borderTopRightRadius: 20px` and `-16px` margin overlap (flat, clean edge)
- Change to `flex: 1; overflow-y: auto; padding: 12px 16px`
- Remove `marginTop: 20px` on order number section

**Detail cards:**
- Reduce card padding from `p="sm"` to `p="xs"`
- Reduce icon sizes from 20px to 16px in `DetailCard`
- Reduce `ThemeIcon` from `size="lg"` to `size="md"` in cards

**Action buttons:**
- Change `size="lg"` to `size="md"` on "Arrived at Customer's Location" and "Drop-off & Complete Delivery" buttons
- Remove `mt="md"` margins
- Add `borderRadius: 8px` consistently

**Completion screen:**
- Reduce earnings font from `100px` to `48px`
- Reduce feeder icon from `120px` to `72px`
- Reduce summary card padding from `p="lg"` to `p="md"`
- Change "Resume Feeding" button from `h={56}` to `h={44}` and `size="lg"` to `size="md"`
- Wrap entire completion in safe area container

**Estimated pay card (delivery phase):**
- Remove `mt="md"` and `p="md"` overrides on the customer-phase pay card
- Use consistent `p="sm"` with the pickup-phase pay card

### Phase 5: Fix MobileDriverDashboard home state overlays

- Update hamburger button positioning from `calc(env(safe-area-inset-top, 0px) + 43px)` to `calc(env(safe-area-inset-top, 0px) + 12px)` for consistency
- Same for pause button and speed limit sign positioning
- The paused state container uses `paddingTop: calc(env(safe-area-inset-top, 0px) + 43px)` -- change to use the standard header pattern

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/mobile/SafeAreaWrapper.tsx` | **Create** -- shared safe area wrapper |
| `src/components/mobile/CravenDeliveryFlow.tsx` | Full layout restructure, compact UI, remove bottom bars |
| `src/components/mobile/MobileDriverDashboard.tsx` | Remove hardcoded bottom bars, fix header positioning |
| `src/components/mobile/FeederScheduleTab.tsx` | Add safe area top padding to sticky header |
| `src/components/mobile/EarningsDashboard.tsx` | Move safe area into sticky header |
| `src/components/mobile/CorporateEarningsDashboard.tsx` | Move safe area into sticky header |
| `src/components/mobile/FeederPromotionsTab.tsx` | Move safe area into sticky header |
| `src/components/mobile/FeederAccountPage.tsx` | Add safe area to TopBar |

## What Won't Change

- All business logic (status transitions, photo upload, GPS tracking, order verification)
- Transition animations (pickup confirmed, arrival squiggly path)
- Camera flow (FullscreenCamera component)
- DriverBottomNav (already handles safe areas correctly)
- Sidebar menus and modals
- Data fetching and Supabase integration

