# Driver Instant Payout System Explained

**Date:** 2026-01-31  
**System:** Stripe Connect Platform Charges + Transfers  
**Pattern:** DoorDash-style marketplace

---

## Overview

Your driver payout system has **two stages**:

1. **Instant Transfer** (happens immediately via webhook)
2. **Bank Payout** (Stripe handles based on driver's schedule)

---

## Stage 1: Instant Transfer to Driver Balance

### When It Happens
**Immediately** after customer payment succeeds (within seconds)

### How It Works

```typescript
// Webhook: payment_intent.succeeded
↓
Customer pays $30 order
↓
Webhook fires instantly
↓
Platform transfers driver earnings to driver's Stripe balance
↓
Driver sees funds in Stripe balance immediately
```

### Code Location
**File:** `supabase/functions/stripe-webhook/index.ts`

```227:248:supabase/functions/stripe-webhook/index.ts
// Driver transfer (only if not already created)
const driverAmount = (order.driver_pay_cents || 0) + (order.tip_cents || 0);
if (!driverTransferId && driverAmount > 0 && driverAccount) {
  const driverTransfer = await stripe.transfers.create(
    {
      amount: driverAmount,
      currency: order.currency,
      destination: driverAccount.stripe_account_id,
      description: `Order ${order_id} - Driver payout`,
      metadata: { order_id, driver_id, type: 'driver_pay_tip' },
    },
    { idempotencyKey: `order:${order_id}:transfer:driver` }
  );
  driverTransferId = driverTransfer.id;
  console.log(`[Transfer] Driver: ${driverTransferId}`);

  // Store immediately
  await supabase
    .from('orders')
    .update({ stripe_transfer_driver_id: driverTransferId })
    .eq('id', order_id);
}
```

### What Driver Gets
```
Driver Earnings = Base Pay + Tips

Base Pay = delivery_fee_cents (from order)
Tips = tip_cents (100% to driver)

Example:
Delivery Fee: $4.49
Customer Tip: $5.00
Driver Gets: $9.49 (transferred instantly to Stripe balance)
```

---

## Stage 2: Bank Payout (Stripe Handles This)

### When It Happens
Depends on **driver's Stripe payout schedule**

### Payout Schedule Options

#### Option A: Instant Payouts (Fastest) ⚡
- **Speed:** Minutes
- **Requirements:**
  - Driver must enable instant payouts in Stripe
  - Bank must support instant transfers
  - Debit card required (for some instant methods)
- **Fees:** ~1% instant payout fee (charged by Stripe)
- **Driver Experience:** 
  ```
  Order complete → Transfer in webhook → 5-30 minutes → Money in bank
  ```

#### Option B: Daily Automatic (Recommended) 📅
- **Speed:** Next business day
- **Requirements:** Bank account verified
- **Fees:** No fees
- **Driver Experience:**
  ```
  Order complete → Transfer in webhook → Next day 2 AM → Money in bank
  ```

#### Option C: Weekly (Default)
- **Speed:** Once per week (Friday)
- **Requirements:** None
- **Fees:** No fees
- **Driver Experience:**
  ```
  Orders Mon-Sun → All transfers accumulated → Friday → Money in bank
  ```

#### Option D: Manual
- **Speed:** Driver initiates
- **Requirements:** Minimum balance ($25 typical)
- **Fees:** No fees
- **Driver Experience:**
  ```
  Driver clicks "Cash Out" → 1-2 business days → Money in bank
  ```

---

## Current Implementation

### ✅ What's Ready (Instant Transfer)

**Transfer to Stripe Balance:** Already implemented and working
- Happens in `payment_intent.succeeded` webhook
- Uses `stripe.transfers.create()`
- Driver's Stripe balance updated immediately
- Idempotent (won't duplicate if webhook replays)

### ⚠️ What Drivers Control (Bank Payout)

**Payout to Bank Account:** Controlled by driver's Stripe Connect settings
- Set during onboarding via Stripe-hosted UI
- Driver can change in Stripe Express Dashboard
- Platform doesn't control this (Stripe handles it)

---

## How to Enable Instant Payouts for Drivers

### Step 1: Driver Onboarding (Express Accounts)

Your current setup creates Express accounts:

```52:66:supabase/functions/create-connected-account/index.ts
// Create Express Connect account (Stripe handles KYC/compliance)
const accountParams: Stripe.AccountCreateParams = {
  type: 'express', // Express = Stripe handles onboarding/compliance
  country: 'US',
  email: email,
  capabilities: {
    transfers: { requested: true }, // ONLY transfers (no card_payments)
  },
  business_type: owner_type === 'restaurant' ? 'company' : 'individual',
  metadata: {
    owner_type,
    owner_id,
    platform: 'cravenusa',
  },
};
```

**Express accounts automatically have access to instant payouts if:**
1. ✅ They complete onboarding
2. ✅ They verify their bank account
3. ✅ They enable instant payouts in settings

### Step 2: Driver Configures Payout Schedule

During onboarding, Stripe asks driver:
- **Payout schedule:** Daily, weekly, or manual
- **Instant payouts:** Enable/disable
- **Bank details:** For receiving funds

### Step 3: Platform Transfers (Already Working)

Your webhook handles this automatically:
```typescript
// Customer pays for order
↓
payment_intent.succeeded webhook fires
↓
Platform transfers funds to driver's Stripe balance
↓
Stripe handles payout to driver's bank (based on driver's settings)
```

---

## Comparison: Instant vs. Daily vs. Weekly

### Example Timeline

**Order completed at 3:00 PM Tuesday:**

| Payout Method | Transfer to Stripe Balance | Payout to Bank Account | Total Time |
|---------------|----------------------------|------------------------|------------|
| **Instant** ⚡ | 3:00 PM (webhook) | 3:05 PM (Stripe) | ~5 minutes |
| **Daily** 📅 | 3:00 PM (webhook) | Wed 2 AM (Stripe) | ~11 hours |
| **Weekly** 📆 | 3:00 PM (webhook) | Friday (Stripe) | ~3 days |
| **Manual** 🖱️ | 3:00 PM (webhook) | When driver clicks | Driver controlled |

---

## Cost Breakdown

### Platform Costs (You Pay)
```
Stripe Transfer API: FREE
- No fee to transfer from platform → driver balance
- Your webhook handles this at no cost
```

### Driver Costs (Driver Pays)
```
Standard Payout (Daily/Weekly): FREE
- ACH transfer from Stripe → bank account
- No fees

Instant Payout: ~1% fee
- Charged by Stripe
- Deducted from driver's balance
- Example: $50 instant payout = $0.50 fee
```

---

## How "Instant" Is It Really?

### Your Part (Platform → Stripe Balance)
**Actual timing:** 2-5 seconds
```
Customer confirms payment
↓ (Stripe processes payment: ~2 seconds)
Webhook fires
↓ (Your function executes: ~1 second)
Transfer API call
↓ (Stripe processes transfer: ~1 second)
Driver's Stripe balance updated
```

**Total:** ~4 seconds (effectively instant)

### Stripe's Part (Stripe Balance → Bank Account)

**Instant Payout:**
- **Best case:** 30 seconds
- **Typical:** 5-30 minutes
- **Depends on:** Bank's instant transfer support

**Daily Payout:**
- **Scheduled:** 2:00 AM local time
- **Arrives:** Same morning (typically 6-9 AM)

**Weekly Payout:**
- **Scheduled:** Friday 2:00 AM
- **Arrives:** Friday morning

---

## Driver Experience (Ideal Flow)

### With Instant Payouts Enabled

```
1. Driver completes delivery (3:00 PM)
   ↓
2. Customer's payment processed (3:00 PM)
   ↓
3. Webhook transfers to driver's Stripe balance (3:00 PM)
   ↓
4. Driver app shows "Earnings available: $9.49" (3:00 PM)
   ↓
5. Driver clicks "Cash Out Now" (optional)
   ↓
6. Stripe pays out to bank instantly (~5 min, ~1% fee)
   ↓
7. Driver gets notification: "Money in your account" (3:05 PM)
```

### With Daily Automatic Payouts

```
1. Driver completes delivery (3:00 PM Tuesday)
   ↓
2. Webhook transfers to driver's Stripe balance (3:00 PM)
   ↓
3. Driver app shows "Earnings available: $9.49"
   ↓
4. Next day at 2:00 AM (Wednesday), Stripe pays out automatically
   ↓
5. Money arrives in bank (Wednesday 6-9 AM)
   ↓
6. Driver wakes up, checks bank: money is there
```

---

## Implementation Status

### ✅ Already Working

1. **Instant transfers to Stripe balance**
   - Webhook implemented: `stripe-webhook/index.ts`
   - Uses `stripe.transfers.create()`
   - Happens within seconds of payment
   - Driver's Stripe balance updated immediately

2. **Idempotency protection**
   - Webhook deduplication via `stripe_events` table
   - Transfer idempotency keys: `order:${order_id}:transfer:driver`
   - Safe against replays/duplicates

3. **Ledger tracking**
   - All transfers logged in `ledger_entries` table
   - Includes `driver_pay` and `tip` entries
   - Full audit trail

### ✅ Driver Controls (via Stripe)

4. **Payout schedule**
   - Set during Stripe Express onboarding
   - Driver can change anytime in Stripe Dashboard
   - Options: instant, daily, weekly, manual

5. **Bank account management**
   - Stripe handles verification
   - Driver adds/updates bank details
   - Instant payout eligibility checked by Stripe

### ⚠️ Recommended Additions

6. **Driver payout dashboard** (optional)
   - Show Stripe balance in driver app
   - Show recent transfers
   - Link to Stripe Express Dashboard for settings

7. **Cash out button** (optional)
   - Allow driver to trigger instant payout from your app
   - Use Stripe API: `stripe.payouts.create()`
   - Show fee estimate before confirming

---

## Enabling Instant Payouts for All Drivers

### Automatic During Onboarding

When driver completes onboarding via your Express account link:
1. Stripe shows payout schedule options
2. Driver selects "Daily" or "Instant"
3. Stripe enables based on driver's bank
4. No code changes needed (Stripe handles it)

### Platform-Wide Default

To make daily automatic payouts the default:

```typescript
// Option 1: Set during account creation (not recommended - let driver choose)
const account = await stripe.accounts.create({
  type: 'express',
  settings: {
    payouts: {
      schedule: {
        interval: 'daily', // or 'weekly', 'manual'
        delay_days: 'minimum', // Fastest allowed
      },
    },
  },
  // ... other params
});

// Option 2: Let Stripe handle during onboarding (recommended)
// Stripe will show driver the options and set based on their choice
```

---

## FAQ

### Q: Can I make all drivers get instant payouts?
**A:** No. Instant payouts require:
- Bank account that supports instant transfers
- Driver to enable it in their settings
- Stripe to approve their account for instant

You can **encourage** it, but not force it.

### Q: Do I pay for instant payouts?
**A:** No. Driver pays ~1% fee. Platform pays nothing.

### Q: What if driver's bank doesn't support instant?
**A:** They get daily/weekly payouts. Stripe handles the fallback.

### Q: Can driver change payout schedule later?
**A:** Yes. In their Stripe Express Dashboard.

### Q: What if webhook fails?
**A:** Your webhook has retry logic and idempotency. Transfer will happen when webhook succeeds.

### Q: Does driver see pending vs. available balance?
**A:** If you build it. Otherwise they see everything in Stripe Dashboard.

---

## Summary

**Your current implementation:**
- ✅ **Instant** transfer to driver's Stripe balance (webhook handles this)
- ✅ Bank payout timing controlled by driver's Stripe settings
- ✅ No code changes needed for instant payouts (drivers enable in Stripe)

**Driver experience:**
- Funds hit Stripe balance in ~5 seconds after delivery
- Funds hit bank account based on driver's settings:
  - Instant: 5-30 minutes (driver pays ~1% fee)
  - Daily: Next morning (free)
  - Weekly: Friday (free)

**Bottom line:**
Your implementation is already "instant" for the transfer part. The bank payout speed is controlled by Stripe and the driver's settings, not your code.

---

## Next Steps (Optional)

1. **Add balance display in driver app**
   - Query: `stripe.balance.retrieve({ stripeAccount: driver_account_id })`
   - Show available balance vs. pending

2. **Add cash-out button**
   - Button: "Cash Out Now ($0.50 instant fee)"
   - API: `stripe.payouts.create({ amount, stripeAccount })`
   - Show confirmation: "Money arriving in ~5 minutes"

3. **Educate drivers**
   - During onboarding: "Choose instant payouts for immediate access"
   - In-app tips: "Enable instant payouts in settings"
   - Support docs: How to change payout schedule

**But these are enhancements. Your core instant transfer system is already working.**




