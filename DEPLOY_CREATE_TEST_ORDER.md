# Deploy create-test-order Edge Function

The `create-test-order` edge function has been updated to include realistic test order data. **You must deploy it for the changes to take effect.**

## Quick Deploy

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Find the `create-test-order` function
3. Click **Edit** or **Deploy**
4. Copy the entire contents of `supabase/functions/create-test-order/index.ts`
5. Paste it into the function editor
6. Click **Deploy**

### Option 2: Via CLI (If authenticated)

```bash
# First authenticate
npx supabase login

# Then deploy
npx supabase functions deploy create-test-order
```

## What Changed

The function now:
- ✅ Fetches real menu items from the restaurant
- ✅ Creates 2-4 realistic order items with quantities
- ✅ Uses actual customer name from user_profiles
- ✅ Uses real delivery address from delivery_addresses
- ✅ Calculates realistic prices, tax, and tip
- ✅ Includes all order items in the notification payload
- ✅ Includes customer_name, subtotal_cents, and tip_cents in payload

## Verify Deployment

After deploying, test by:
1. Going to Live Driver Testing page
2. Selecting a driver
3. Sending a test order
4. The order should now show:
   - Real customer name (not "Customer")
   - Real customer address
   - 2-4 actual menu items with names and quantities
   - Real prices

