# Cleanup Examples

**Purpose:** Reference examples for common cleanup tasks

---

## Console.log Removal

### Example 1: Debug Logging

**Before:**
```typescript
// Debug logging for each day
console.log(`Day ${i} (${dayStart.toLocaleDateString()}):`, {
  earningsCount: dayEarnings?.length || 0,
  totalEarnings: dayTotalEarnings,
  tips: dayTips,
  rawTotalCents: dayEarnings?.reduce((sum, e) => sum + ((e.amount_cents || 0) + (e.tip_cents || 0)), 0) || 0,
  rawTipCents: dayEarnings?.reduce((sum, e) => sum + (e.tip_cents || 0), 0) || 0
});

// Debug logging
console.log('Weekly earnings data:', weeklyEarningsData);
console.log('Weekly data totals:', weeklyEarningsData.map(d => ({ payments: d.payments, tips: d.tips })));
```

**After:**
```typescript
// Removed debug logging - no longer needed in production
```

**Location:** `src/components/mobile/CorporateEarningsDashboard.tsx` (lines 121-127, 138-139)

---

### Example 2: Error Logging (Keep)

**Before:**
```typescript
if (error) {
  console.error('❌ Auth error:', error);
  throw new Error(error.message || "Invalid credentials.");
}
```

**After:**
```typescript
if (error) {
  // Keep console.error for critical authentication errors
  console.error('❌ Auth error:', error);
  throw new Error(error.message || "Invalid credentials.");
}
```

**Note:** Keep `console.error()` for critical errors that need monitoring in production.

---

### Example 3: Warning Logging (Review)

**Before:**
```typescript
console.warn('PDF functionality is currently disabled');
```

**After (Option 1 - Remove if not needed):**
```typescript
// Removed warning - functionality is intentionally disabled
```

**After (Option 2 - Keep if needed for debugging):**
```typescript
// Keep warning for production debugging
console.warn('PDF functionality is currently disabled');
```

---

## TODO/FIXME Resolution

### Example 1: Fix the Issue

**Before:**
```typescript
// TODO: Add error handling for failed API calls
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
```

**After:**
```typescript
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
};
```

---

### Example 2: Create Ticket and Remove TODO

**Before:**
```typescript
// TODO: Optimize this calculation for large datasets
const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};
```

**After:**
```typescript
// Note: Optimization tracked in issue #123
// Current implementation works but may need optimization for datasets > 10k items
const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};
```

---

### Example 3: Remove Resolved TODO

**Before:**
```typescript
// TODO: Fix calculation for edge cases
// Fixed: Updated calculation to handle edge cases
const calculate = (value: number) => {
  if (value < 0) return 0; // Handle negative values
  return value * 1.1;
};
```

**After:**
```typescript
const calculate = (value: number) => {
  if (value < 0) return 0; // Handle negative values
  return value * 1.1;
};
```

---

## Commented Code Removal

### Example 1: Old Implementation

**Before:**
```typescript
// Old implementation - keeping for reference
// const oldFunction = () => {
//   return something;
// };

// New implementation
const newFunction = () => {
  return somethingElse;
};
```

**After:**
```typescript
const newFunction = () => {
  return somethingElse;
};
```

---

### Example 2: Backup Code

**Before:**
```typescript
// Backup implementation in case new one fails
// if (condition) {
//   doSomething();
// }

if (newCondition) {
  doSomethingNew();
}
```

**After:**
```typescript
if (newCondition) {
  doSomethingNew();
}
```

---

### Example 3: Keep Meaningful Comments

**Before:**
```typescript
// Calculate total earnings including tips
// This uses the order_assignments table to get completed orders
const totalEarnings = earnings.reduce((sum, e) => {
  const total = (e.amount_cents || 0) + (e.tip_cents || 0);
  return sum + total;
}, 0) / 100 || 0;
```

**After:**
```typescript
// Calculate total earnings including tips
// This uses the order_assignments table to get completed orders
const totalEarnings = earnings.reduce((sum, e) => {
  const total = (e.amount_cents || 0) + (e.tip_cents || 0);
  return sum + total;
}, 0) / 100 || 0;
```

**Note:** Keep comments that explain business logic or non-obvious code.

---

## TypeScript Suppression Fixes

### Example 1: Fix Type Issue

**Before:**
```typescript
// @ts-ignore
const result = someFunction(data);
```

**After:**
```typescript
const result = someFunction(data as ExpectedType);
```

---

### Example 2: Document Why Suppression is Needed

**Before:**
```typescript
// @ts-nocheck
import React from 'react';
```

**After (if fixable):**
```typescript
import React from 'react';
// Properly typed component
```

**After (if not fixable):**
```typescript
// @ts-ignore - Third-party library 'some-lib' has incorrect type definitions
// See: https://github.com/some-lib/issues/123
import { SomeLibrary } from 'some-lib';
```

---

### Example 3: Remove @ts-nocheck from File Header

**Before:**
```typescript
// @ts-nocheck
import React, { useState } from 'react';
// ... rest of file with type issues
```

**After:**
```typescript
import React, { useState } from 'react';
// ... fix type issues throughout file
// Or add specific @ts-ignore comments only where needed
```

---

## Unused Code Removal

### Example 1: Unused Import

**Before:**
```typescript
import { useState, useEffect, useRef, useMemo } from 'react';
// ... only useState and useEffect are used
```

**After:**
```typescript
import { useState, useEffect } from 'react';
```

---

### Example 2: Unused Variable

**Before:**
```typescript
const calculateTotal = (items: Item[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;
  return subtotal + tax;
};
```

**After:**
```typescript
const calculateTotal = (items: Item[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * 1.1; // Includes tax
};
```

---

## Best Practices

1. **Remove, don't comment:** If code is not needed, delete it. Git history preserves it.
2. **Keep meaningful comments:** Comments that explain "why" are valuable.
3. **Fix types properly:** Don't suppress TypeScript errors unless absolutely necessary.
4. **Test after cleanup:** Always verify functionality still works after removing code.
5. **Commit frequently:** Commit after cleaning each file or logical group of files.

---

**Last Updated:** January 7, 2025




