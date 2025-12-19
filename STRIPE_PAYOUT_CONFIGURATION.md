# Stripe Payout Configuration Guide
## Driver & Merchant Payouts via Stripe Connect

**Date:** December 18, 2025  
**Purpose:** Configure Stripe Connect for automated driver and merchant payouts  

---

## Overview

Crave'n uses **Stripe Connect** for all payouts:
- **Merchants:** Receive payments for orders via Stripe Connect Express accounts
- **Drivers:** Receive delivery fees via Stripe transfers

---

## Architecture

```
Customer Payment
    ↓
Stripe Payment Intent
    ↓
Crave'n Platform Account (holds funds)
    ↓
    ├─→ Merchant Payout (Stripe Connect)
    └─→ Driver Payout (Stripe Transfer)
```

---

## 1. Merchant Payouts (Stripe Connect)

### How It Works:
1. Merchant onboards via Stripe Connect Express
2. Customer pays for order
3. Funds held in platform account
4. Automatic transfer to merchant account (minus platform fee)

### Current Implementation:
✅ **Already Implemented:**
- `supabase/functions/create-stripe-connect-account/index.ts` - Creates merchant Stripe account
- `supabase/functions/create-stripe-connect-link/index.ts` - Onboarding link
- `supabase/functions/get-stripe-connect-status/index.ts` - Check status
- `supabase/functions/stripe-webhook/index.ts` - Handle account updates

### Configuration Needed:

#### Step 1: Enable Stripe Connect in Dashboard
1. Go to https://dashboard.stripe.com/connect/accounts/overview
2. Click **Get Started** if not already enabled
3. Choose **Platform or marketplace**
4. Complete business verification

#### Step 2: Configure Platform Settings
1. Go to **Settings** → **Connect**
2. Set **Platform name:** Crave'n
3. Set **Support email:** support@cravenusa.com
4. Set **Brand color:** #your-brand-color
5. Upload **Brand logo**

#### Step 3: Configure Payout Schedule
1. Go to **Settings** → **Connect** → **Payments**
2. Set **Payout schedule:**
   - **Recommended:** Daily automatic payouts
   - **Alternative:** Weekly on Fridays
   - **Minimum payout:** $10

3. Set **Platform fee:**
   - **Application fee:** 15-30% of order total
   - Or fixed fee per transaction

#### Step 4: Test Merchant Onboarding
```bash
# Test creating a merchant account
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-stripe-connect-account \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@restaurant.com",
    "businessName": "Test Restaurant",
    "refreshUrl": "https://cravenusa.com/restaurant/onboarding",
    "returnUrl": "https://cravenusa.com/restaurant/dashboard",
    "restaurantId": "test-123"
  }'
```

---

## 2. Driver Payouts (Stripe Transfers)

### How It Works:
1. Driver completes delivery
2. Earnings calculated and stored in `driver_earnings` table
3. Daily cron job runs payout function
4. Funds transferred to driver's bank account via Stripe

### Current Implementation:
✅ **Already Implemented:**
- `supabase/functions/daily-driver-payouts/index.ts` - Automated daily payouts
- `supabase/functions/manual-driver-payout/index.ts` - Manual payout trigger
- Database table: `driver_earnings`

### Configuration Needed:

#### Step 1: Set Up Driver Bank Accounts

**Option A: Stripe Connect (Recommended)**
Drivers onboard via Stripe Connect Express (same as merchants)

**Benefits:**
- Instant payouts available
- Automatic tax reporting (1099)
- Fraud protection
- Bank account verification

**Implementation:**
```typescript
// Add to driver onboarding flow
const { data } = await supabase.functions.invoke('create-stripe-connect-account', {
  body: {
    email: driver.email,
    businessName: `${driver.firstName} ${driver.lastName}`,
    type: 'individual', // Not business
    refreshUrl: 'https://cravenusa.com/driver/onboarding',
    returnUrl: 'https://cravenusa.com/driver/dashboard',
    driverId: driver.id
  }
});
```

**Option B: Stripe Transfers (Current)**
Drivers provide bank account details directly

**Benefits:**
- Simpler onboarding
- Lower fees

**Drawbacks:**
- Manual bank verification
- No instant payouts
- Manual tax reporting

#### Step 2: Configure Payout Schedule

**Edit:** `supabase/functions/daily-driver-payouts/index.ts`

```typescript
// Current: Pays out all pending earnings daily
// Recommended: Add minimum payout threshold

const MINIMUM_PAYOUT = 25.00; // $25 minimum

// Only process if earnings >= minimum
if (totalEarnings >= MINIMUM_PAYOUT) {
  // Process payout
}
```

#### Step 3: Set Up Cron Job

**Via Supabase:**
1. Go to Supabase Dashboard → **Database** → **Cron Jobs**
2. Create new cron job:
   ```sql
   SELECT cron.schedule(
     'daily-driver-payouts',
     '0 2 * * *', -- 2 AM daily
     $$
     SELECT net.http_post(
       url:='https://YOUR_PROJECT.supabase.co/functions/v1/daily-driver-payouts',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     );
     $$
   );
   ```

**Via GitHub Actions (Alternative):**
```yaml
name: Daily Driver Payouts
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM UTC daily
jobs:
  payout:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Payout
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/daily-driver-payouts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

#### Step 4: Update Payout Function for Stripe

**Current code uses Moov. Update to use Stripe:**

```typescript
// supabase/functions/daily-driver-payouts/index.ts

import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// For each driver with pending earnings
for (const driver of driversWithEarnings) {
  try {
    // If driver has Stripe Connect account
    if (driver.stripe_connect_account_id) {
      // Transfer to Connect account
      const transfer = await stripe.transfers.create({
        amount: Math.round(driver.total_earnings * 100), // Convert to cents
        currency: 'usd',
        destination: driver.stripe_connect_account_id,
        description: `Driver payout for ${driver.full_name}`,
        metadata: {
          driver_id: driver.id,
          payout_date: new Date().toISOString(),
        },
      });
    } 
    // If driver has bank account details
    else if (driver.bank_account_id) {
      // Create payout to bank account
      const payout = await stripe.payouts.create({
        amount: Math.round(driver.total_earnings * 100),
        currency: 'usd',
        method: 'standard', // or 'instant' for instant payouts
        destination: driver.bank_account_id,
        description: `Driver payout for ${driver.full_name}`,
      });
    }

    // Update database
    await supabase
      .from('driver_earnings')
      .update({ 
        payout_status: 'paid',
        payout_date: new Date().toISOString(),
        payout_id: transfer.id || payout.id
      })
      .eq('driver_id', driver.id)
      .eq('payout_status', 'pending');

  } catch (error) {
    console.error(`Payout failed for driver ${driver.id}:`, error);
    // Log error, send notification
  }
}
```

---

## 3. Platform Fee Configuration

### Set Application Fee:

```typescript
// When creating payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: orderTotal,
  currency: 'usd',
  application_fee_amount: Math.round(orderTotal * 0.20), // 20% platform fee
  transfer_data: {
    destination: merchantStripeAccountId, // Merchant gets 80%
  },
});
```

### Fee Structure Recommendations:

**Merchants:**
- Platform fee: 15-30% of order total
- Includes: Payment processing, platform usage, support

**Drivers:**
- Delivery fee: $3-8 per delivery (paid by customer)
- Driver keeps: 100% of delivery fee + tips
- Platform keeps: Service fee from merchant

---

## 4. Testing Payouts

### Test Mode:
1. Use test API keys
2. Use test bank accounts:
   - Account: `000123456789`
   - Routing: `110000000`

3. Test payout flow:
```bash
# Trigger manual payout
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/manual-driver-payout \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"driverId": "test-driver-id"}'
```

### Live Mode:
1. Start with small test payouts ($1-5)
2. Verify funds arrive correctly
3. Check Stripe Dashboard for status
4. Monitor for errors

---

## 5. Monitoring & Alerts

### Set Up Alerts:

**Stripe Dashboard:**
1. Go to **Developers** → **Webhooks**
2. Add webhook for payout events:
   - `payout.paid`
   - `payout.failed`
   - `transfer.created`
   - `transfer.failed`

**Email Notifications:**
```typescript
// Send email on payout failure
if (payoutFailed) {
  await supabase.functions.invoke('send-email', {
    body: {
      to: 'finance@cravenusa.com',
      subject: 'Driver Payout Failed',
      body: `Payout failed for driver ${driverId}. Error: ${error}`
    }
  });
}
```

### Dashboard Metrics:
- Total payouts processed
- Failed payouts
- Average payout amount
- Payout processing time
- Driver satisfaction with payouts

---

## 6. Compliance & Tax Reporting

### 1099 Forms (US):
- Stripe Connect automatically generates 1099-K forms
- Threshold: $600+ per year
- Drivers receive form by January 31

### Record Keeping:
- Store all payout records in database
- Keep for 7 years
- Include: amount, date, driver, method

### Audit Trail:
```sql
-- Query payout history
SELECT 
  driver_id,
  full_name,
  total_earnings,
  payout_date,
  payout_id,
  payout_status
FROM driver_earnings
WHERE payout_date >= '2025-01-01'
ORDER BY payout_date DESC;
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Payout fails | Check bank account details, verify funds available |
| Driver not receiving payout | Check Stripe Dashboard, verify account status |
| Insufficient funds | Ensure platform account has balance |
| Bank account invalid | Re-verify bank details, use Stripe Connect |
| Payout delayed | Check payout schedule, may take 2-5 business days |

---

## 8. Security Best Practices

1. **Never expose secret keys**
2. **Use Stripe Connect for bank verification**
3. **Implement fraud detection**
4. **Monitor unusual payout patterns**
5. **Require 2FA for large payouts**
6. **Regular security audits**

---

## 9. Cost Analysis

### Stripe Fees:

**Payment Processing:**
- 2.9% + $0.30 per transaction

**Stripe Connect:**
- No additional fee for standard payouts
- 1% fee for instant payouts (optional)

**Transfers:**
- Free for standard transfers
- $0.25 for instant transfers

### Example:
```
Order Total: $50.00
Stripe Fee: $1.75 (2.9% + $0.30)
Platform Fee: $10.00 (20%)
Merchant Gets: $38.25
Driver Delivery Fee: $5.00 (paid by customer)
Driver Gets: $5.00 + tips
```

---

## 10. Next Steps

### Immediate:
- [ ] Enable Stripe Connect in dashboard
- [ ] Configure platform settings
- [ ] Update payout functions to use Stripe
- [ ] Set up cron job for daily payouts
- [ ] Test payout flow

### This Week:
- [ ] Onboard first test merchant
- [ ] Process first test driver payout
- [ ] Set up monitoring and alerts
- [ ] Create payout dashboard for finance team

### This Month:
- [ ] Migrate all merchants to Stripe Connect
- [ ] Migrate all drivers to Stripe payouts
- [ ] Implement instant payouts (optional)
- [ ] Generate first month's payout reports

---

## Resources

- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Payout API:** https://stripe.com/docs/api/payouts
- **Transfer API:** https://stripe.com/docs/api/transfers
- **Testing:** https://stripe.com/docs/testing

---

**Configuration Status:** Ready to implement  
**Estimated Setup Time:** 2-3 hours  
**Go-Live Date:** December 19, 2025

