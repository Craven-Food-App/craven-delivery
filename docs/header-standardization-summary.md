# Header Standardization & Driver Support Full-Page Update

**Date:** February 1, 2026  
**Objective:** Standardize all mobile page headers to match the Schedule page positioning and make Driver Support chat full-page.

---

## Changes Implemented

### 1. **Earnings Dashboard** (`src/components/mobile/EarningsDashboard.tsx`)
- **Header Positioning:** Moved from `paddingTop: calc(env(safe-area-inset-top, 0px) + 43px)` to standard positioning
- **Header Structure:** Changed to match Schedule page with:
  - Sticky header with white background and bottom border
  - Padding: `12px 16px`
  - Title: `text-base font-black` with `letterSpacing: 0.2px`
  - Hamburger and notification buttons with `p-2` padding
- **Safe Area:** Added `paddingTop: env(safe-area-inset-top, 0px)` to main container

### 2. **On Fire Dashboard** (`src/components/mobile/CorporateEarningsDashboard.tsx`)
- **Header Positioning:** Standardized to match Schedule page
- **Header Structure:**
  - Added sticky positioning with `position: sticky, top: 0, z-index: 10`
  - White background with bottom border
  - Title: `text-base font-black` with `letterSpacing: 0.2px`
  - Consistent padding and button styling
- **Safe Area:** Added `paddingTop: env(safe-area-inset-top, 0px)` to main container

### 3. **Promos Page** (`src/components/mobile/FeederPromotionsTab.tsx`)
- **Header Positioning:** Standardized to match Schedule page
- **Header Structure:**
  - Changed from `px="xl" pb="md"` to `px="md" py="xs"`
  - Added sticky positioning with white background and border
  - Title: Changed to `fw={900} size="md"` with `letterSpacing: 0.2px`
- **Safe Area:** Added `paddingTop: env(safe-area-inset-top, 0px)` to main container

### 4. **Driver Support Chat** (`src/components/mobile/DriverSupportChat.tsx`)
- **Full-Page Implementation:**
  - Removed `MobileLayout` wrapper
  - Changed to full `100dvh` height container
  - Direct safe area handling: `paddingTop: env(safe-area-inset-top, 0px)` and `paddingBottom: env(safe-area-inset-bottom, 0px)`
  - Removed import of `MobileLayout`
- **Header:** Simplified structure without extra height calculation

### 5. **Customer App Versions**
- Applied all changes to customer app versions:
  - `apps/customer/src/components/mobile/EarningsDashboard.tsx`
  - `apps/customer/src/components/mobile/CorporateEarningsDashboard.tsx`
  - `apps/customer/src/components/mobile/FeederPromotionsTab.tsx`

---

## Standard Header Pattern

All headers now follow this consistent pattern:

```tsx
<div className="bg-white border-b sticky top-0 z-10" style={{ padding: '12px 16px' }}>
  <div className="flex items-center justify-between mb-1">
    <button className="text-gray-700 p-2">
      {/* Hamburger Menu Icon */}
    </button>
    <h1 className="text-base font-black text-gray-900" style={{ letterSpacing: '0.2px' }}>
      {/* Page Title */}
    </h1>
    <button className="text-gray-700 p-2">
      {/* Notification Icon */}
    </button>
  </div>
  {/* Optional: Additional header content (tabs, filters, etc.) */}
</div>
```

**Main Container Pattern:**
```tsx
<div style={{
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
}}>
```

---

## Benefits

1. **Consistent UX:** All pages now have identical header positioning and styling
2. **Safe Area Compliance:** Proper handling of notches, status bars, and home indicators across all devices
3. **Visual Hierarchy:** Clear, readable headers with proper font weights and spacing
4. **Full-Page Chat:** Driver Support now uses full viewport height for better chat experience
5. **Maintainability:** Single pattern makes future updates easier

---

## Testing Checklist

- [x] Earnings page header matches Schedule page
- [x] On Fire page header matches Schedule page
- [x] Promos page header matches Schedule page
- [x] Driver Support is full-page without MobileLayout
- [x] All safe areas properly handled
- [x] No linter errors
- [x] Customer app versions updated

---

## Technical Notes

- **Safe Area Variables:** Using `env(safe-area-inset-top, 0px)` and `env(safe-area-inset-bottom, 0px)` for iOS notch/home indicator
- **Viewport Height:** Using `100dvh` (dynamic viewport height) for full-page components
- **Sticky Headers:** All headers use `position: sticky, top: 0, z-index: 10` for scroll behavior
- **Font Consistency:** `font-black` (900 weight) with `letterSpacing: 0.2px` for all page titles

