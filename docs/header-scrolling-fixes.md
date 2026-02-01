# Header & Scrolling Standardization

**Date:** February 1, 2026  
**Status:** ✅ Complete  
**Scope:** Profile, Vehicle, App Settings, Security pages

---

## Overview

Standardized all account sub-pages to match the Schedule page header positioning and scrolling behavior. Headers are now static (sticky) at the top, and the entire page scrolls naturally.

---

## Problem

User reported:
- Headers not positioned consistently across pages
- Pages requiring scrolling were not scrolling properly
- Headers were not static like the Schedule page

---

## Solution

### Structure Changes

**Before:**
```tsx
<MobileLayout headerHeight="56px">
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ flexShrink: 0, height: '56px' }}>Header</div>
    <div style={{ flex: 1, overflowY: 'auto' }}>Content</div>
  </div>
</MobileLayout>
```

**After:**
```tsx
<div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 72 }}>
  <div style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid ${C.border}', padding: '12px 16px' }}>
    Header
  </div>
  <div style={{ padding: '12px 16px' }}>
    Content
  </div>
</div>
```

### Key Changes

1. **Removed `MobileLayout` wrapper** - Direct rendering for full control
2. **Sticky header** - `position: 'sticky', top: 0` instead of `flexShrink: 0`
3. **Natural scrolling** - Entire page scrolls, not just content area
4. **Consistent padding** - `paddingBottom: 72` for tab bar clearance
5. **Min height** - `minHeight: '100vh'` for full-page coverage

---

## Files Modified

### Main App:
- `src/components/mobile/ProfileDetailsPage.tsx`
- `src/components/mobile/VehicleDocumentsPage.tsx`
- `src/components/mobile/AppSettingsPage.tsx`
- `src/components/mobile/SecuritySafetyPage.tsx`

### Customer App:
- `apps/customer/src/components/mobile/ProfileDetailsPage.tsx`
- `apps/customer/src/components/mobile/VehicleDocumentsPage.tsx`
- `apps/customer/src/components/mobile/AppSettingsPage.tsx`
- `apps/customer/src/components/mobile/SecuritySafetyPage.tsx`

---

## Reference Page

**Schedule Page Structure** (`FeederScheduleTab.tsx`):
```tsx
<div style={{
  background: C.bg,
  minHeight: "100vh",
  paddingBottom: 72,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
}}>
  {/* ── sticky top bar ── */}
  <div style={{
    position: "sticky",
    top: 0,
    background: C.bg,
    zIndex: 10,
    borderBottom: `1px solid ${C.border}`,
    padding: "12px 16px",
  }}>
    <h1>Schedule</h1>
  </div>

  {/* ── scrollable content ── */}
  <div style={{ padding: "12px 16px 0" }}>
    Content
  </div>
</div>
```

---

## Benefits

1. **Consistent UX** - All pages now have identical header behavior
2. **Better Scrolling** - Natural page scrolling instead of nested scroll containers
3. **Simpler Code** - No wrapper component, direct styling
4. **Mobile-Friendly** - Proper safe area handling with `env(safe-area-inset-bottom)`
5. **Keyboard Aware** - Dynamic padding for keyboard height

---

## Testing Checklist

- [x] Profile Information scrolls correctly
- [x] Vehicle & Documents scrolls correctly
- [x] App Settings scrolls correctly
- [x] Security & Safety scrolls correctly
- [x] Headers stay static on scroll
- [x] Headers positioned consistently
- [x] Safe area insets respected
- [x] Keyboard doesn't cover inputs
- [x] No linter errors
- [x] Applied to both main and customer apps

---

## Design Tokens

All pages use consistent theme:
```typescript
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  border:  "#EEEEEE",
  bg:      "#FFFFFF",
  bgMuted: "#F8F9FA",
} as const;
```

---

**Status:** ✅ Production Ready

