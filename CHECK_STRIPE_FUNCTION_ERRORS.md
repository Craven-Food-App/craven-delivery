# How to Check Stripe Function Errors

## The function is being called correctly, but returning 500 error

### Step 1: Check Supabase Edge Function Logs

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Edge Functions**
   - Click **"Edge Functions"** in the left sidebar
   - Find **`create-stripe-payment-method`** in the list
   - Click on it

3. **View Logs**
   - Click the **"Logs"** tab
   - Look for the most recent error (should be timestamped when you tried to add the card)
   - The error will show:
     - The exact error message
     - Stack trace
     - Console.log outputs

### Step 2: Common Errors and Fixes

#### Error: "STRIPE_SECRET_KEY not configured"
**Fix:**
1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add `STRIPE_SECRET_KEY` with your Stripe secret key
3. Get your key from: https://dashboard.stripe.com/apikeys
4. Use `sk_test_...` for testing or `sk_live_...` for production

#### Error: "Failed to create Stripe customer"
**Possible causes:**
- Invalid email format
- Stripe API issue
- Network error

**Fix:**
- Check the logs for the specific Stripe error
- Verify the user has a valid email address

#### Error: "Failed to create payment method"
**Possible causes:**
- Invalid card details
- Stripe API authentication failed
- Card declined by Stripe

**Fix:**
- Check the logs for the specific Stripe error code
- Try with a test card: `4242 4242 4242 4242` (any future expiry, any CVC)

### Step 3: Test with Stripe Test Card

Use these test card numbers:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)

### Step 4: Verify Function is Deployed

1. In Edge Functions dashboard, make sure `create-stripe-payment-method` shows as **"Active"** or **"Deployed"**
2. If it shows errors, click **"Deploy"** or **"Redeploy"**
3. Make sure you copied the **entire** contents of `create-stripe-payment-method-standalone.ts`

### Step 5: Check Function Code

Make sure the function includes:
- ✅ All imports at the top
- ✅ CORS helper function
- ✅ Stripe helper functions (getStripeClient, getOrCreateCustomer, etc.)
- ✅ Main serve() function
- ✅ Error handling

If anything is missing, copy the entire file again.




















