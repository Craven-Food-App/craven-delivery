# Setting Up Moov Environment Variables

## Method 1: Supabase Dashboard (Recommended)

1. **Navigate to your Supabase project**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Go to Edge Functions Settings**
   - Click **Settings** in the left sidebar
   - Click **Edge Functions** 
   - Click **Secrets** tab

3. **Add each environment variable:**
   
   Click **"Add new secret"** for each:
   
   | Secret Name | Value | Description |
   |------------|-------|-------------|
   | `MOOV_API_URL` | `https://api.moov.io` | Moov API base URL (use `https://api-sandbox.moov.io` for sandbox) |
   | `MOOV_ACCOUNT_ID` | `your-account-id` | Your Moov account ID (found in Moov dashboard) |
   | `MOOV_SECRET_KEY` | `your-secret-key` | Your Moov secret key (found in Moov dashboard → API Keys) |
   | `MOOV_PUBLIC_KEY` | `your-public-key` | Your Moov public key (for frontend Moov.js if needed) |
   | `MOOV_WEBHOOK_SECRET` | `your-webhook-secret` | Webhook signing secret (configure in Moov dashboard → Webhooks) |

4. **Save each secret** - They will be available to all Edge Functions immediately

## Method 2: Supabase CLI

If you have Supabase CLI installed and authenticated:

```bash
# Set each secret
supabase secrets set MOOV_API_URL=https://api.moov.io
supabase secrets set MOOV_ACCOUNT_ID=your-account-id
supabase secrets set MOOV_SECRET_KEY=your-secret-key
supabase secrets set MOOV_PUBLIC_KEY=your-public-key
supabase secrets set MOOV_WEBHOOK_SECRET=your-webhook-secret
```

## Where to Find Moov Credentials

### Moov Account ID
1. Log into Moov Dashboard: https://dashboard.moov.io
2. Go to **Settings** → **Account**
3. Your Account ID is displayed there

### Moov API Keys
1. In Moov Dashboard, go to **Settings** → **API Keys**
2. Create a new API key or use existing one
3. **Secret Key**: Copy the secret key (only shown once!)
4. **Public Key**: Copy the public key (if using Moov.js on frontend)

### Moov Webhook Secret
1. In Moov Dashboard, go to **Settings** → **Webhooks**
2. Create a webhook endpoint pointing to: `https://your-project.supabase.co/functions/v1/moov-webhook`
3. Moov will generate a webhook secret - copy this

## Verification

After setting the secrets, you can verify they're working by:

1. **Check Edge Function logs** - Deploy a test function that reads the env vars
2. **Test a payment** - Try creating a test payment to see if Moov API calls work
3. **Check Supabase logs** - Look for any "Missing Moov configuration" errors

## Important Notes

- **Never commit secrets to git** - They're stored securely in Supabase
- **Use different keys for production vs sandbox** - Moov provides separate credentials
- **Rotate keys regularly** - Update secrets if keys are compromised
- **Webhook secret is critical** - Without it, webhook signature verification will fail

## Testing

Once set up, test with a small payment:

```bash
# Test via Supabase Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/create-payment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderTotal": 1000,
    "orderId": "test-order-123",
    "customerInfo": {"name": "Test", "email": "test@example.com"},
    "paymentMethodId": "your-moov-payment-method-id",
    "paymentMethodType": "card"
  }'
```

## Troubleshooting

**Error: "Moov secret key not configured"**
- Check that `MOOV_SECRET_KEY` is set in Supabase secrets
- Verify the key name matches exactly (case-sensitive)

**Error: "Webhook secret not configured"**
- Set `MOOV_WEBHOOK_SECRET` in Supabase secrets
- This is only needed for the webhook handler

**Error: "Moov API request failed"**
- Verify `MOOV_API_URL` is correct (sandbox vs production)
- Check that `MOOV_ACCOUNT_ID` matches your Moov account
- Verify `MOOV_SECRET_KEY` is valid and not expired

