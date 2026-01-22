# Stripe Edge Function Deployment Instructions (No CLI Required)

## Overview
This guide explains how to deploy the Stripe payment method edge function using the Supabase Dashboard (no CLI needed).

## Step 1: Create the Edge Function via Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Edge Functions**
   - Click on **"Edge Functions"** in the left sidebar
   - Click **"Create a new function"** or **"New Function"**

3. **Create Function: `create-stripe-payment-method`**
   - **Function Name**: `create-stripe-payment-method`
   - **Copy the code** from `supabase/functions/create-stripe-payment-method/index.ts`
   - Paste it into the editor
   - Click **"Deploy"** or **"Save"**

## Step 2: Set Environment Variables

1. **Go to Project Settings**
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"Edge Functions"** or **"Secrets"**

2. **Add Required Secrets:**
   - Click **"Add new secret"** or **"New Secret"**
   - Add the following secrets:

   ```
   STRIPE_SECRET_KEY = sk_test_... (or sk_live_... for production)
   STRIPE_PUBLISHABLE_KEY = pk_test_... (optional, for frontend)
   ```

3. **Get Your Stripe Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

## Step 3: Verify Dependencies

The function uses these shared files:
- `_shared/cors.ts` - Should already exist
- `_shared/stripe.ts` - **You need to create this**

### Create `_shared/stripe.ts`:

1. In the Edge Functions dashboard, look for **"Shared"** or **"Common"** functions
2. If you can create shared files, create `_shared/stripe.ts`
3. Copy the code from `supabase/functions/_shared/stripe.ts` in your repository
4. If you can't create shared files, you'll need to inline the Stripe functions directly into `create-stripe-payment-method/index.ts`

## Step 4: Run Database Migration

1. **Go to SQL Editor** in Supabase Dashboard
2. **Open the migration file**: `supabase/migrations/20250125000001_add_stripe_payment_method_fields.sql`
3. **Copy and paste** the entire SQL into the SQL Editor
4. **Click "Run"** to execute the migration

This will:
- Add `stripe_payment_method_id` column to `payment_methods` table
- Add `stripe_customer_id` columns where needed
- Create indexes for better performance
- Add payment tracking columns to `orders` table

## Step 5: Test the Function

1. **Go to Edge Functions** → `create-stripe-payment-method`
2. **Click "Invoke"** or **"Test"**
3. **Use this test payload**:

```json
{
  "type": "card",
  "card": {
    "number": "4242424242424242",
    "expMonth": 12,
    "expYear": 2025,
    "cvv": "123",
    "holderName": "Test User",
    "billingAddress": {
      "addressLine1": "123 Test St",
      "city": "Test City",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
    }
  }
}
```

**Note**: You'll need to include an Authorization header with a valid JWT token from your Supabase auth.

## Step 6: Update Frontend (Already Done)

The frontend code in `src/pages/Checkout.tsx` is already updated to call `create-stripe-payment-method`. After deploying the function, it should work.

## Troubleshooting

### Error: "Stripe secret key not configured"
- Make sure `STRIPE_SECRET_KEY` is set in Edge Function secrets
- Check that the secret name matches exactly (case-sensitive)

### Error: "Module not found: _shared/stripe.ts"
- If you can't create shared files, copy the contents of `stripe.ts` directly into the edge function file
- Or create the shared file via the dashboard if that option is available

### Error: "Function not found"
- Make sure the function name is exactly `create-stripe-payment-method`
- Check that it's deployed and active in the dashboard

## Alternative: Inline Approach (If Shared Files Don't Work)

If you can't use shared files, you can inline the Stripe functions:

1. Open `supabase/functions/_shared/stripe.ts`
2. Copy all the function code
3. Paste it at the top of `create-stripe-payment-method/index.ts` (before the `serve` function)
4. Remove the import statement for `_shared/stripe.ts`
5. Deploy the function

## Next Steps

After deploying:
1. Test adding a card in the checkout flow
2. Verify the payment method is saved to the database
3. Test the full payment flow
4. Monitor Edge Function logs for any errors


























