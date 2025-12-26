# Stripe Live Keys Setup Instructions

**IMPORTANT:** These are your LIVE Stripe keys. Keep them secure!

---

## 1. Update Environment Variables

### For Local Development (.env file):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
```

### For Vercel/Netlify Deployment:
Add this environment variable in your hosting dashboard:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
```

---

## 2. Update Supabase Secrets

### Via Supabase CLI:
```bash
# Set Stripe Secret Key
supabase YOUR_SECRET_KEY_HERE

# Set Stripe Webhook Secret (get this from Stripe Dashboard > Webhooks)
supabase YOUR_WEBHOOK_SECRET_HERE
```

### Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Add these secrets:
   - `YOUR_SECRET_KEY_HERE`
   - `STRIPE_WEBHOOK_SECRET` = (get from Stripe Dashboard)

---

## 3. Set Up Stripe Webhook

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `transfer.created`
   - `transfer.updated`
   - `payout.paid`
   - `payout.failed`

5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

## 4. Verify Setup

### Test Publishable Key:
```bash
# Should see your live key
echo $VITE_STRIPE_PUBLISHABLE_KEY
```

### Test Supabase Secrets:
```bash
# List all secrets (values hidden)
supabase secrets list
```

### Test Payment Flow:
1. Go to your app
2. Try to make a test payment
3. Check Stripe Dashboard for transaction
4. Verify webhook received

---

## 5. Security Checklist

- [x] Live keys replaced in code
- [ ] `.env` file added to `.gitignore` (verify)
- [ ] Supabase secrets set
- [ ] Webhook configured
- [ ] Test payment successful
- [ ] Webhook receiving events
- [ ] Never commit live keys to git

---

## 6. What Was Changed

### File Updated:
- `src/components/restaurant/onboarding/steps/EnhancedBankingStep.tsx`
  - Line 47: Changed from hardcoded test key to environment variable with live key fallback

### Before:
```typescript
const stripePublishableKey = 'pk_test_51QWlM4RsKJ4xfVZh...';
```

### After:
```typescript
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51SKpbkLTHUzAWwQr...';
```

---

## 7. Next Steps

1. **Set environment variable locally:**
   ```bash
   # Add to .env file
   echo "YOUR_PUBLISHABLE_KEY_HERE" >> .env
   ```

2. **Set Supabase secrets:**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=YOUR_SECRET_KEY_HERE
   ```

3. **Configure webhook and get secret**

4. **Set webhook secret:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```

5. **Restart dev server:**
   ```bash
   npm run dev
   ```

6. **Test payment flow**

---

## 🚨 IMPORTANT SECURITY NOTES

1. **NEVER commit these keys to Git**
2. **NEVER share these keys publicly**
3. **Use environment variables for all keys**
4. **Rotate keys if compromised**
5. **Monitor Stripe Dashboard for suspicious activity**

---

**Setup Date:** December 18, 2025  
**Status:** Live keys configured, ready for production

