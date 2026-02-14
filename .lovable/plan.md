
# Complete Dark Mode Integration for All Remaining Feeder Pages

## Problem

Several major pages and components in the Feeder app still have hardcoded light colors (`bg-white`, `text-gray-900`, `bg-gray-50`, etc.) and do not use the `useFeederDarkMode()` hook. This means toggling dark mode in Settings has no effect on these pages.

## Files That Need Dark Mode

### 1. `CorporateEarningsDashboard.tsx` (On Fire Page)

The entire component uses hardcoded whites and grays:
- Root: `background: '#ffffff'`
- Header: `bg-white`, `text-gray-900`
- Charts: `bg-gray-50`, `text-gray-900`
- Diamond section: `backgroundColor: '#ffffff'`, `c="#000"`
- Info modal: `bg-white`, `text-gray-900`, `text-gray-600`

**Fix**: Import and call `useFeederDarkMode()`. Replace all hardcoded colors with dynamic `C.*` values from the context.

### 2. `EarningsDashboard.tsx` (Earnings Page -- ~1500 lines)

Massive file with hardcoded light colors everywhere:
- Root: `bg-gray-50`
- Header: `bg-white`, `text-gray-900`, `text-gray-700`
- Tab buttons: `bg-gray-100 text-gray-700`
- All cards: `bg-white`, `text-gray-900`, `text-gray-500`, `text-gray-600`
- Earnings breakdown, payout status, metrics cards
- Transaction ledger rows: `hover:bg-gray-50`, `text-gray-900`
- All modals (Transaction detail, Gas Money, Earnings Cashout, Instant Cashout): `bg-white`, `text-gray-900`
- Input fields: `border-gray-200`
- Dividers: `bg-gray-200`, `bg-gray-300`

**Fix**: Import and call `useFeederDarkMode()`. Replace all hardcoded Tailwind classes and inline styles with dynamic values. Use `isDark` for conditional Tailwind classes and `C.*` for inline styles.

### 3. `FeederPromotionsTab.tsx` (Promos/Giveaway Page)

Uses Mantine components with hardcoded light backgrounds:
- Loading state: `background: 'white'`
- Root: `background: 'white'`
- Header: `background: 'white'`, `borderBottom: '1px solid #EEEEEE'`
- Challenge cards use Mantine color tokens (these work somewhat but the background is still white)

**Fix**: Import `useFeederDarkMode()`. Replace `background: 'white'` and border colors with dynamic `C.bg`, `C.border`. Update Mantine `c` and `bg` props.

### 4. `GetBackToFeedingCard.tsx`

Small component with:
- `bg-white`, `text-gray-600`, `border-gray-100`

**Fix**: Import `useFeederDarkMode()`. Replace with `C.card`, `C.muted`, `C.border`.

### 5. `NearbyRestaurantCards.tsx`

Restaurant cards with hardcoded:
- Card backgrounds: `bg-white/95`, `bg-gray-50`
- Text: `text-gray-900`, `text-gray-500`, `text-gray-600`
- Borders: `border-gray-100`, `border-gray-200`
- Stat badges: `bg-gray-50`

**Fix**: Import `useFeederDarkMode()`. Replace with dynamic values.

### 6. `BottomNavigation.tsx`

Uses Tailwind CSS theme variables (`bg-card/95`, `text-primary`, `text-muted-foreground`). These should inherit from CSS but may need explicit dark overrides since the app uses an inline style-based dark mode, not CSS class-based.

**Fix**: Import `useFeederDarkMode()`. Apply dynamic inline background and text colors.

### 7. `MobileDriverDashboard.tsx` (Home tab panels)

The home tab offline/paused states have hardcoded:
- Paused state: `bg-white z-50`, `text-gray-900`, `text-gray-600`, `text-gray-700`

**Fix**: Add `isDark`/`C` from the existing context (already wrapped in provider). Replace hardcoded colors in the paused state panel and other home-tab overlay sections.

### 8. `CravenDeliveryFlow.tsx` (Driver Delivery Flow)

Does not have `useFeederDarkMode` imported. This is Mantine-heavy and needs:
- Card backgrounds switched from white to `C.card`
- Text colors switched to `C.text` / `C.muted`
- Border colors to `C.border`

**Fix**: Import `useFeederDarkMode()`. Update Mantine `bg`, `c`, and style props.

## Technical Approach

For each file, the pattern is the same:
1. Add `import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';`
2. Inside the component function, add `const { isDark, colors: C } = useFeederDarkMode();`
3. Replace hardcoded colors:
   - `bg-white` / `background: '#ffffff'` / `background: 'white'` --> `style={{ background: C.bg }}` or `C.card`
   - `bg-gray-50` --> `C.bgMuted`
   - `text-gray-900` / `text-gray-800` / `c="#000"` --> `C.text`
   - `text-gray-600` / `text-gray-500` / `text-gray-700` --> `C.muted`
   - `text-gray-400` --> `C.muted2`
   - `border-gray-100` / `border-gray-200` --> `C.border`
   - `bg-gray-100` / `bg-gray-200` (dividers, tracks) --> `C.track`
   - Input backgrounds --> `C.inputBg` with `C.text` text

## Contrast Rules (No Black on Dark)

- Body text on dark: `#F1F1F1`
- Muted text on dark: `#A0A0A0`
- Card backgrounds on dark: `#1A1A1A`
- Surface/input backgrounds on dark: `#1E1E1E`
- Borders on dark: `#2E2E2E`
- Orange accent `#E8622A` stays unchanged
- Modal overlays stay `bg-black/50`

## Summary

| File | What Changes |
|------|-------------|
| `CorporateEarningsDashboard.tsx` | Add hook; replace all white/gray hardcoded colors with dynamic `C.*` |
| `EarningsDashboard.tsx` | Add hook; replace all hardcoded Tailwind and inline colors across cards, modals, inputs |
| `FeederPromotionsTab.tsx` | Add hook; replace Mantine background/text/border props |
| `GetBackToFeedingCard.tsx` | Add hook; replace card bg, text, border |
| `NearbyRestaurantCards.tsx` | Add hook; replace card and stat colors (both RestaurantCard and main component) |
| `BottomNavigation.tsx` | Add hook; apply dynamic bg/text inline styles |
| `MobileDriverDashboard.tsx` | Use existing hook; update paused state panel and home overlays |
| `CravenDeliveryFlow.tsx` | Add hook; update Mantine card/text/border props |
