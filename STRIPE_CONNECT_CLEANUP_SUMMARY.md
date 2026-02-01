# Stripe Connect Cleanup Summary

**Date:** 2026-01-31  
**Change Type:** Consolidation & Standardization  
**Account Type:** Express (Stripe-hosted onboarding)

---

## Changes Made

### 1. ✅ Updated `create-connected-account` Function
**File:** `supabase/functions/create-connected-account/index.ts`

**Changes:**
- ✅ Changed from `custom` to `express` account type
- ✅ Removed `card_payments` capability (only `transfers` needed)
- ✅ Added onboarding link generation in the same call
- ✅ Returns both `stripe_account_id` and `onboarding_url`
- ✅ Handles existing accounts by generating new onboarding links

**Before:**
```typescript
type: 'custom',
capabilities: {
  transfers: { requested: true },
}
// No onboarding link generation
```

**After:**
```typescript
type: 'express', // Stripe handles compliance
capabilities: {
  transfers: { requested: true }, // Only transfers
}
// + Generates onboarding link
// + Returns: { stripe_account_id, onboarding_url }
```

---

### 2. ✅ Deleted Redundant Function
**Deleted:** `supabase/functions/create-stripe-connect-account/index.ts`

**Reason:** Duplicate functionality - consolidated into `create-connected-account`

---

### 3. ✅ Updated `create-stripe-connect-link` Function
**File:** `supabase/functions/create-stripe-connect-link/index.ts`

**Changes:**
- ✅ Removed `card_payments` capability
- ✅ Now stores in `stripe_accounts` table (primary)
- ✅ Still stores in `restaurants.stripe_connect_account_id` (backward compatibility)
- ✅ Checks `stripe_accounts` table first before creating new accounts
- ✅ Fixed duplicate import

**Before:**
```typescript
capabilities: {
  card_payments: { requested: true }, // ❌ Not needed
  transfers: { requested: true },
}
// Only saved to restaurants table
```

**After:**
```typescript
capabilities: {
  transfers: { requested: true }, // ✅ Only transfers
}
// Saves to both:
// - stripe_accounts (primary)
// - restaurants (backward compat)
```

---

## API Usage

### Primary Function (Recommended): `create-connected-account`

**For both restaurants and drivers:**

```typescript
// Create account + get onboarding link in one call
POST /functions/v1/create-connected-account
{
  "owner_type": "restaurant", // or "driver"
  "owner_id": "uuid-xxx",
  "email": "merchant@example.com",
  "business_name": "Joe's Pizza", // for restaurants
  "first_name": "John", // for drivers
  "last_name": "Doe", // for drivers
  "refresh_url": "https://yourapp.com/onboarding/refresh", // optional
  "return_url": "https://yourapp.com/onboarding/complete" // optional
}

Response:
{
  "stripe_account_id": "acct_xxx",
  "onboarding_url": "https://connect.stripe.com/setup/...",
  "details_submitted": false,
  "payouts_enabled": false
}
```

### Legacy Function (Restaurant-specific): `create-stripe-connect-link`

**For restaurants only (uses authenticated session):**

```typescript
POST /functions/v1/create-stripe-connect-link
Authorization: Bearer <user_token>
{
  "restaurantId": "uuid-xxx", // optional
  "returnUrl": "https://yourapp.com/merchant-portal",
  "refreshUrl": "https://yourapp.com/merchant-portal?refresh=true"
}

Response:
{
  "url": "https://connect.stripe.com/setup/...",
  "accountId": "acct_xxx"
}
```

---

## Account Type Comparison

### Express Accounts (What you now have) ✅

**Pros:**
- ✅ Stripe handles all KYC/compliance
- ✅ Stripe-hosted onboarding UI
- ✅ Less regulatory liability for you
- ✅ Faster to market
- ✅ Automatic payout scheduling

**Cons:**
- ❌ Less control over onboarding UX
- ❌ Stripe branding in onboarding flow

### Custom Accounts (What you had before) ❌

**Pros:**
- ✅ Full control over onboarding UX
- ✅ Custom compliance workflow

**Cons:**
- ❌ YOU handle all KYC/compliance
- ❌ More regulatory responsibility
- ❌ More code to maintain

---

## Database Schema

### Primary Table: `stripe_accounts`

```sql
CREATE TABLE public.stripe_accounts (
  id UUID PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('restaurant', 'driver')),
  owner_id UUID NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  details_submitted BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(owner_type, owner_id)
);
```

### Backward Compatibility

- `restaurants.stripe_connect_account_id` still populated
- Webhook updates both tables
- New code should query `stripe_accounts` table

---

## Webhook Updates

**File:** `supabase/functions/stripe-webhook/index.ts`

**Already correctly configured:**
- ✅ Listens to `account.updated` events
- ✅ Updates `stripe_accounts` table
- ✅ Tracks `payouts_enabled`, `details_submitted`, etc.

```typescript
case 'account.updated':
  await supabase
    .from('stripe_accounts')
    .update({
      details_submitted: account.details_submitted || false,
      payouts_enabled: account.payouts_enabled || false,
      charges_enabled: account.charges_enabled || false,
      requirements: account.requirements || {},
    })
    .eq('stripe_account_id', account.id);
```

---

## Testing Checklist

### 1. Test Restaurant Onboarding
- [ ] Call `create-connected-account` with `owner_type: 'restaurant'`
- [ ] Receive `onboarding_url`
- [ ] Complete onboarding in Stripe
- [ ] Verify `account.updated` webhook fires
- [ ] Verify `payouts_enabled` = true in `stripe_accounts` table
- [ ] Test transfer to restaurant account

### 2. Test Driver Onboarding
- [ ] Call `create-connected-account` with `owner_type: 'driver'`
- [ ] Receive `onboarding_url`
- [ ] Complete onboarding in Stripe
- [ ] Verify webhook updates status
- [ ] Test transfer to driver account

### 3. Test Existing Accounts
- [ ] Call `create-connected-account` with existing `owner_id`
- [ ] Verify returns new onboarding link (doesn't create duplicate)

### 4. Test Payout Flow
- [ ] Create test order
- [ ] Complete payment
- [ ] Verify webhook creates transfers
- [ ] Check Stripe dashboard for successful transfers

---

## Migration Notes

### If you have existing Custom accounts

**Option 1: Keep them (recommended)**
- Existing Custom accounts will continue to work
- New accounts will be Express
- Mixed account types are fine

**Option 2: Migrate to Express (complex)**
- Would require deleting Custom accounts
- Creating new Express accounts
- Re-onboarding all merchants/drivers
- Not recommended unless necessary

---

## Summary

✅ **All cleanup complete**  
✅ **Standardized on Express accounts**  
✅ **Removed unnecessary `card_payments` capability**  
✅ **Consolidated to `stripe_accounts` table**  
✅ **One primary function for all account creation**  
✅ **Backward compatible with existing code**

**Next step:** Test the onboarding flow end-to-end.






