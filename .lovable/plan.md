

# Dark Mode for the Entire Feeder Mobile App

## Overview

Add a fully functional dark mode toggle that transforms the entire feeder app when enabled. The dark mode preference is already saved to user metadata (`app_settings.darkMode`) via the Settings page -- but currently nothing reads it. This plan introduces a React context provider and updates every mobile component to respect the dark/light mode.

## Architecture

### 1. Create `FeederDarkModeContext` (New File)

**File**: `src/contexts/FeederDarkModeContext.tsx`

A React context that:
- Reads `darkMode` from user metadata (`app_settings.darkMode`) on mount
- Provides `isDark` boolean and `toggleDarkMode()` to all children
- Stores preference in localStorage for instant load (no flash)
- Exposes a `colors` object that returns the correct palette based on mode

**Light palette** (current):
- `bg`: `#FFFFFF`, `bgMuted`: `#F8F9FA`, `text`: `#111111`, `muted`: `#777777`, `border`: `#EEEEEE`

**Dark palette**:
- `bg`: `#121212`, `bgMuted`: `#1E1E1E`, `text`: `#F1F1F1`, `muted`: `#A0A0A0`, `border`: `#2E2E2E`
- `card`: `#1A1A1A`, `surface`: `#1E1E1E`
- Orange accent stays `#E8622A` (unchanged)

A custom hook `useFeederDarkMode()` returns `{ isDark, colors, toggleDarkMode }`.

### 2. Wrap the Mobile App in the Provider

**File**: `src/components/mobile/MobileDriverDashboard.tsx`

Wrap the entire return JSX with `<FeederDarkModeProvider>`. This ensures every child component can access dark mode state.

### 3. Update All Components with Hardcoded Colors

Each of these files has a `const C = { ... }` or `const T = { ... }` theme object. Replace the static object with a call to `useFeederDarkMode()` so colors swap dynamically:

| File | Theme Object |
|------|-------------|
| `AppSettingsPage.tsx` | `C` -- Also wire toggle to context's `toggleDarkMode()` |
| `FeederAccountPage.tsx` | `C` |
| `FeederScheduleTab.tsx` | `C` |
| `FeederRatingsTab.tsx` | `C` |
| `FeedPreferencesPage.tsx` | `C` |
| `ProfileDetailsPage.tsx` | `C` |
| `VehicleDocumentsPage.tsx` | `C` |
| `SecuritySafetyPage.tsx` | `C` |
| `DriverSupportChat.tsx` | `C` |
| `NewDeliveryRequest.tsx` | `C` |
| `FeederSidebarMenu.tsx` | `T` |
| `EarningsDashboard.tsx` | Tailwind/inline |
| `CravenDeliveryFlow.tsx` | Mantine `bg` props |
| `CorporateEarningsDashboard.tsx` | Inline styles |

In each file, the pattern is:
- Import `useFeederDarkMode`
- Replace `const C = { ... }` with `const { colors: C } = useFeederDarkMode();` (moved inside the component)
- For components using Tailwind classes like `bg-white`, `text-gray-*`, conditionally apply dark variants

### 4. Update `AppSettingsPage.tsx` Toggle Wiring

The existing Dark Mode toggle in settings currently only saves to user metadata. Update it to also call `toggleDarkMode()` from the context so the theme changes instantly without requiring an app restart.

### 5. Delivery Flow Dark Mode (`CravenDeliveryFlow.tsx`)

This is a Mantine-heavy component. Update:
- Card backgrounds from white to dark surface color
- Text colors from dark to light
- Badge/button backgrounds for contrast
- The simulated map view already uses dark colors (dark.9) so it stays
- Ensure all status text, item lists, and address text are visible

### 6. Tailwind-Based Components

For components using Tailwind (bottom nav, loading screens, map overlays in `MobileDriverDashboard.tsx`):
- Add a `dark` class to the root wrapper when dark mode is active
- Use conditional classNames: `isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'`

### 7. Key Contrast Rules (No Black-on-Dark)

- All body text: `#F1F1F1` on dark backgrounds
- Muted/secondary text: `#A0A0A0` (never `#777` on dark)
- Card borders: `#2E2E2E` (subtle, visible)
- Input fields: `#1E1E1E` background with `#F1F1F1` text
- Orange accent buttons remain `#E8622A` with white text (unchanged)
- Progress bars: darker track color `#2E2E2E`

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/FeederDarkModeContext.tsx` | Dark mode context provider + hook |

## Files to Modify

| File | Change |
|------|--------|
| `MobileDriverDashboard.tsx` | Wrap with provider; dark bg on root container |
| `AppSettingsPage.tsx` | Wire toggle to context; use dynamic colors |
| `FeederAccountPage.tsx` | Use dynamic colors from context |
| `FeederScheduleTab.tsx` | Use dynamic colors from context |
| `FeederRatingsTab.tsx` | Use dynamic colors from context |
| `FeedPreferencesPage.tsx` | Use dynamic colors from context |
| `ProfileDetailsPage.tsx` | Use dynamic colors from context |
| `VehicleDocumentsPage.tsx` | Use dynamic colors from context |
| `SecuritySafetyPage.tsx` | Use dynamic colors from context |
| `DriverSupportChat.tsx` | Use dynamic colors from context |
| `NewDeliveryRequest.tsx` | Use dynamic colors from context |
| `FeederSidebarMenu.tsx` | Use dynamic colors from context |
| `EarningsDashboard.tsx` | Conditional dark Tailwind/inline styles |
| `CravenDeliveryFlow.tsx` | Mantine dark props for cards/text |
| `CorporateEarningsDashboard.tsx` | Conditional dark inline styles |
| `BottomNavigation.tsx` | Dark background/text classes |
| `LoadingScreen.tsx` | Dark background |
| `GetBackToFeedingCard.tsx` | Dark card background |
| `NearbyRestaurantCards.tsx` | Dark card background |

