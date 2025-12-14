# CraveMore Deployment Instructions

## Prerequisites
1. Ensure you have the Supabase CLI installed and authenticated
2. Your Supabase project is linked locally

## Step 1: Run Database Migration

First, apply the database migration to create the CraveMore tables:

```bash
# If using Supabase CLI locally
npx supabase db push

# Or apply the migration directly via Supabase Dashboard
# Go to Database > Migrations and run:
# 20250201000000_create_cravemore_membership_system.sql
```

## Step 2: Deploy Edge Functions

### Option A: Deploy via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. Navigate to **Edge Functions** in the left sidebar
3. For each function, click **"Deploy a new function"** or **"Edit"** if it exists:
   - **Function name**: `get-cravemore-offer`
     - Copy the contents of `supabase/functions/get-cravemore-offer/index.ts`
     - Paste into the function editor
     - Click **Deploy**
   - **Function name**: `create-cravemore-checkout`
     - Copy the contents of `supabase/functions/create-cravemore-checkout/index.ts`
     - Paste into the function editor
     - Click **Deploy**
   - **Function name**: `cancel-cravemore-subscription`
     - Copy the contents of `supabase/functions/cancel-cravemore-subscription/index.ts`
     - Paste into the function editor
     - Click **Deploy**

4. **Important**: For each function, you need to include the shared CORS file:
   - In the Dashboard, you may need to create a `_shared` folder
   - Add `secure-cors.ts` with the contents from `supabase/functions/_shared/secure-cors.ts`
   - Or, inline the CORS logic directly in each function

### Option B: Deploy via CLI (If authenticated)

```bash
# Deploy get-cravemore-offer
npx supabase functions deploy get-cravemore-offer

# Deploy create-cravemore-checkout
npx supabase functions deploy create-cravemore-checkout

# Deploy cancel-cravemore-subscription
npx supabase functions deploy cancel-cravemore-subscription
```

## Step 3: Update Existing Edge Functions

Update the existing functions that were modified:

```bash
# Update stripe-webhook (to handle CraveMore events)
npx supabase functions deploy stripe-webhook

# Update calculate-order-fees (to apply CraveMore benefits)
npx supabase functions deploy calculate-order-fees
```

## Step 4: Verify Deployment

Check that all functions are deployed:

```bash
npx supabase functions list
```

You should see:
- `get-cravemore-offer`
- `create-cravemore-checkout`
- `cancel-cravemore-subscription`
- `stripe-webhook` (updated)
- `calculate-order-fees` (updated)

## Step 5: Test the Functions

Test the get-cravemore-offer function:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-cravemore-offer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure:
1. The function is deployed
2. `http://localhost:8080` is in the `ALLOWED_ORIGINS` environment variable or the default list in `_shared/secure-cors.ts`

### Function Not Found
If you get "Function not found" errors:
1. Verify the function is deployed: `npx supabase functions list`
2. Check the function name matches exactly (case-sensitive)
3. Ensure you're using the correct project reference

### Database Errors
If you see database errors:
1. Verify the migration ran successfully
2. Check that all tables exist: `cravemore_plans`, `cravemore_promos`, `user_memberships`, `membership_entitlements`
3. Ensure RLS policies are enabled

