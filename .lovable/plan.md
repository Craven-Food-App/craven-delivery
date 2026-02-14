

# Driver Delivery Flow: Safe Areas, Scrolling, and Enterprise-Grade Redesign

## Overview

Refactor the `CravenDeliveryFlow.tsx` component to properly handle Android safe areas on all devices, ensure full scrollability, and deliver a cleaner, more compact enterprise-grade UI.

## Current Issues

1. **Hardcoded Android bottom bar** -- A fixed 48px black `<Box>` at the bottom is a blunt workaround that doesn't adapt to different devices
2. **Map takes fixed percentage height** (`45%`) which squeezes content on small screens and prevents proper scrolling
3. **Oversized UI elements** -- 100px earnings font, 120px icons, `size="lg"` buttons with extra margins create unnecessary bulk
4. **Inconsistent safe area handling** -- Some sections use `env(safe-area-inset-*)`, others don't, and the bottom bar overrides all of it
5. **Content section relies on flex overflow** rather than natural document scroll, causing scroll issues on some Android devices

## Plan

### 1. Remove hardcoded Android bottom bar

Delete the fixed black bottom bar rendered at lines 1851-1862 and 1870-1882. Replace with proper `padding-bottom` using `env(safe-area-inset-bottom)` on the content container itself.

### 2. Restructure layout for natural scrolling

Change from a flex-split layout (45% map / 55% content) to a single scrollable column:
- Map section: fixed height of `200px` (compact, still visible) with sticky positioning
- Content section: flows naturally below, full page scroll via the parent container
- Entire component wrapped in a single `overflow-y: auto` container with proper top/bottom safe area padding

### 3. Compact the map header

- Reduce the gradient header overlay from full-height to a slim bar (~56px)
- Show only: status text, destination name, and distance -- all in one tight row
- Remove the oversized `ThemeIcon` and "CRAVEN" branding from the map header (redundant, driver already knows the app)

### 4. Tighten detail cards

- Reduce card padding from `p="sm"` to `p="xs"`
- Reduce icon sizes from 20px to 16px
- Use `size="xs"` for labels and `size="sm"` for values
- Remove extra margins between cards

### 5. Compact the completion screen

- Reduce earnings font from 100px to 48px
- Reduce feeder icon from 120px to 72px
- Reduce the summary card padding
- Make the "Resume Feeding" button standard height (44px vs 56px)

### 6. Proper safe area wrapper

Wrap the entire delivery flow in a container that uses:
```css
padding-top: env(safe-area-inset-top, 0px);
padding-bottom: env(safe-area-inset-bottom, 0px);
min-height: 100dvh;
overflow-y: auto;
```

### 7. Compact action buttons

- Change all action buttons from `size="lg"` to `size="md"`
- Use consistent `borderRadius: 8px` and remove extra `mt="md"` margins
- Keep the orange gradient only for the primary CTA on the completion screen

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/mobile/CravenDeliveryFlow.tsx` | Full layout restructure, safe areas, compact UI |

## Technical Details

### Safe area container (wraps entire flow)
```tsx
<Box style={{
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
}}>
  {/* Map: fixed height, no shrink */}
  <Box style={{ height: 200, flexShrink: 0, position: 'relative' }}>
    ...map + compact header overlay...
  </Box>
  {/* Content: scrollable */}
  <Box style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
    ...cards, buttons...
  </Box>
</Box>
```

### Compact MapHeader (replaces current)
- Single row: icon + status/name on left, distance on right
- Height: ~48px, semi-transparent dark overlay at bottom of map
- No gradient background -- just a dark overlay strip

### Completion screen
- Same safe-area wrapper pattern
- 48px font for earnings (down from 100px)
- 72px icon (down from 120px)
- Tighter card with smaller gaps

## What Won't Change

- All business logic (status transitions, photo upload, GPS tracking, order verification)
- Transition animations (pickup confirmed, arrival)
- Camera flow (FullscreenCamera component)
- The `ActiveDeliveryFlow.tsx` wrapper and `ErrorBoundary`

