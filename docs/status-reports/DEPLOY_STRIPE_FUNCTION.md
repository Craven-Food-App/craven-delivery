# Deploy Stripe Payment Method Function

## Quick Deploy via Supabase Dashboard

1. **Go to**: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions

2. **Find**: `create-stripe-payment-method` in the list

3. **Click on it**, then click "Edit"

4. **Copy ALL code** from: `supabase/functions/create-stripe-payment-method/index.ts`

5. **Paste** into the editor, replacing everything

6. **Click "Deploy"** or "Save"

7. **Wait** for deployment to complete (should show "Deployed" or "Active")

## Then Check Logs

After deploying, try adding a card again, then:

1. Same page → Click "Logs" tab
2. Look for the most recent error
3. Copy the EXACT error message

## If you see these specific errors:

- **"STRIPE_SECRET_KEY not configured"** → Set it in Settings → Edge Functions → Secrets
- **"Expired API Key"** → Your key expired, get a new one from Stripe Dashboard
- **"No such payment_method"** → Payment method was created with different Stripe account
- **Permission denied** → Restricted key needs Read permissions (already set)

---

**Status**: Function code updated locally, needs deployment to Supabase

