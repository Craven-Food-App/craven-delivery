# Moov Integration Setup Verification

## ✅ Environment Variables Status

### Configured (Required for API calls)
- ✅ `MOOV_SECRET_KEY` - Used in `_shared/moov.ts` line 60
- ✅ `MOOV_PUBLIC_KEY` - Used in `_shared/moov.ts` line 59

### Partially Configured
- ⚠️ `MOOV_WEBHOOK_SECRET` - **NOT SET** (required for webhook signature verification)
  - Used in `moov-webhook/index.ts` line 14
  - Webhook will return 500 error until this is set

### Optional (with defaults)
- ✅ `MOOV_API_URL` - Defaults to `https://api.moov.io` if not set (line 6 of `_shared/moov.ts`)
- ✅ `MOOV_ACCOUNT_ID` - Defaults to empty string if not set (line 7 of `_shared/moov.ts`)

## ✅ Code Implementation Status

### Shared Utilities (`supabase/functions/_shared/moov.ts`)
- ✅ `getMoovConfig()` - Reads environment variables
- ✅ `moovRequest()` - Makes authenticated API calls
- ✅ `createMoovPayment()` - Creates card/ACH payments
- ✅ `createMoovTransfer()` - Creates transfers/payouts
- ✅ `createCardPaymentMethod()` - Tokenizes cards
- ✅ `createAchPaymentMethod()` - Creates ACH payment methods
- ✅ `getPaymentMethod()` - Retrieves payment method details
- ⚠️ `verifyMoovWebhook()` - Placeholder implementation (lines 270-286)

### Edge Functions Using Moov

1. **`create-payment`** (Lines 4, 62-98)
   - ✅ Imports: `createMoovPayment`, `getMoovConfig`, `moovRequest`
   - ✅ Uses `MOOV_SECRET_KEY` via `getMoovConfig()`
   - ⚠️ Will fail if `MOOV_SECRET_KEY` is missing

2. **`create-moov-payment-method`** (Line 4)
   - ✅ Imports: `createCardPaymentMethod`, `createAchPaymentMethod`
   - ✅ Uses `MOOV_SECRET_KEY` via shared functions
   - ⚠️ Will fail if `MOOV_SECRET_KEY` is missing

3. **`daily-driver-payouts`** (Line 5)
   - ✅ Imports: `createMoovTransfer`
   - ✅ Uses `MOOV_SECRET_KEY` via shared functions
   - ⚠️ Will fail if `MOOV_SECRET_KEY` is missing

4. **`manual-driver-payout`** (Line 5)
   - ✅ Imports: `createMoovTransfer`
   - ✅ Uses `MOOV_SECRET_KEY` via shared functions
   - ⚠️ Will fail if `MOOV_SECRET_KEY` is missing

5. **`moov-webhook`** (Line 3, 14)
   - ✅ Imports: `verifyMoovWebhook`
   - ✅ Configured with `verify_jwt = false` in `config.toml` (line 154-155)
   - ❌ **Will return 500 error** if `MOOV_WEBHOOK_SECRET` is not set

## ✅ Configuration Files

### `supabase/config.toml`
- ✅ `moov-webhook` function configured with `verify_jwt = false` (line 154-155)
- ✅ Correctly allows webhook calls without JWT authentication

### Database Migration
- ✅ `20251223000002_add_moov_processing_fee_settings.sql` exists
- ✅ Adds processing fee configuration columns to `commission_settings`:
  - `moov_card_processing_percent` (default 2.70%)
  - `moov_ach_processing_percent` (default 0.50%)
  - `moov_rtp_processing_percent` (nullable)
  - `moov_processing_applies_to_full_amount` (default true)

## ⚠️ Action Required

### Critical: Set Webhook Secret
1. Go to Moov Dashboard → Settings → Webhooks
2. Create webhook endpoint: `https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/moov-webhook`
3. Copy the webhook secret
4. Set in Supabase:
   ```bash
   supabase secrets set MOOV_WEBHOOK_SECRET=your-webhook-secret
   ```

### Optional: Verify Webhook Signature Implementation
The `verifyMoovWebhook()` function in `_shared/moov.ts` (lines 270-286) is currently a placeholder. 
You may need to implement the actual signature verification based on Moov's webhook signing specification.

## 📊 Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| API Credentials | ✅ Configured | `MOOV_SECRET_KEY` and `MOOV_PUBLIC_KEY` set |
| Webhook Secret | ❌ Missing | `MOOV_WEBHOOK_SECRET` not set - webhook will fail |
| API Functions | ✅ Ready | Can process payments once credentials are verified |
| Webhook Handler | ⚠️ Incomplete | Missing secret; signature verification needs implementation |
| Database Schema | ✅ Migrated | Processing fee columns added |
| Function Config | ✅ Correct | `moov-webhook` properly configured |

## 🧪 Testing Checklist

After setting `MOOV_WEBHOOK_SECRET`:

1. **Test Payment Creation**
   ```bash
   curl -X POST https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/create-payment \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"orderTotal": 1000, "orderId": "test-123", ...}'
   ```

2. **Test Webhook Endpoint**
   - Send test webhook from Moov dashboard
   - Check Edge Function logs for errors
   - Verify signature validation works

3. **Verify Processing Fees**
   - Check `commission_settings` table has new columns
   - Verify default values are set correctly

