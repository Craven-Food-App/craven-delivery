

# Instant Cashout Eligibility: 30 Days + 50 Deliveries

## What Changes

### 1. Eligibility Check Logic

The "Instant Cashout to Debit Card" option in the Earnings Dashboard will be gated behind two requirements:
- The feeder's account must be **at least 30 days old** (based on `driver_profiles.created_at`)
- The feeder must have **50 or more completed deliveries** (based on `driver_profiles.completed_orders`)

If either condition is not met:
- The "Instant Cashout to Debit Card" row will still be visible but **locked** with a lock icon and muted styling
- Tapping it shows a toast explaining what's needed (e.g., "You need 50+ deliveries and 30 days as an active feeder to unlock instant cashout")
- The modal will not open

### 2. Eligibility Display

When locked, the row will show:
- A lock icon instead of the chevron arrow
- Muted/gray text
- A subtitle showing progress: e.g., "12/50 deliveries - 18 days remaining"

When unlocked, behavior stays exactly as it is now.

### 3. Fee Disclosure

The instant cashout modal will include a small percentage fee note (e.g., "A 1.5% processing fee applies") displayed near the Cash Out button.

## Technical Details

### EarningsDashboard.tsx Changes

1. **New state variables**: `isInstantCashoutEligible`, `completedDeliveries`, `accountAgeDays`
2. **In `fetchCardData`**: Query `driver_profiles` for `created_at` and `completed_orders` to compute eligibility
3. **Instant Cashout row (line ~804)**: Conditionally render locked/unlocked state based on eligibility
4. **Instant Cashout modal**: Add fee percentage display line (e.g., "1.5% fee applies")

### Eligibility Logic (frontend only, no DB changes needed)

```text
const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
const completedDeliveries = profile.completed_orders || 0;
const isEligible = accountAgeDays >= 30 && completedDeliveries >= 50;
```

### No Database Changes Required

All needed data (`created_at`, `completed_orders`) already exists in `driver_profiles`. The `driver_payment_methods` table already supports adding debit cards.

### Files Modified

| File | Change |
|------|--------|
| `src/components/mobile/EarningsDashboard.tsx` | Add eligibility check, locked state UI for the instant cashout row, fee display in modal |

