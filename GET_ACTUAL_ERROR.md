# Get the ACTUAL Error Message

## The Problem
You're getting a generic "500 Internal Server Error" but we need the REAL error message from the backend.

## Solution: Check Supabase Logs

1. **Go to**: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions/create-stripe-payment-method

2. **Click the "Logs" tab** (at the top)

3. **Look for the most recent error** (should be timestamped when you tried to add the card)

4. **Copy the ENTIRE error message** - it will show:
   - The exact error
   - Stack trace
   - What line failed

## Common Errors You Might See:

### "STRIPE_SECRET_KEY not configured"
- **Fix**: Go to Settings → Edge Functions → Secrets
- Add `STRIPE_SECRET_KEY` with your `rk_live_...` key

### "No such payment_method" or "resource_missing"
- Payment method was created with a different Stripe account
- Or the payment method ID is invalid

### "Permission denied" or "invalid_request_error"
- Your restricted key doesn't have the right permissions
- Make sure Payment Methods has **Read** enabled (not just Write)

### "Failed to retrieve payment method"
- The payment method doesn't exist or was created with different credentials

## What to Do:
1. Try adding a card again
2. Immediately go to the Logs tab
3. Find the error (most recent one)
4. **Copy the entire error message and share it**

The logs will tell us EXACTLY what's wrong.

