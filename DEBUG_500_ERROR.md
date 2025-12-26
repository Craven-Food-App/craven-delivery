# Debugging 500 Internal Server Error

## Changes Made

1. ✅ **Added explicit POST method validation** - Returns 405 for non-POST methods
2. ✅ **Improved error handling** - Better error messages and logging
3. ✅ **Added Moov config validation** - Checks for secret key before API calls
4. ✅ **Enhanced Moov API error handling** - More detailed error messages from Moov API
5. ✅ **Improved database error handling** - DB update failures won't fail the entire request

## Next Steps to Debug

### 1. Check Supabase Function Logs

The most important step is to check the actual error in Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Edge Functions** → `create-moov-onboarding-invite`
2. Click on **Logs** tab
3. Look for the error message that occurred when the 500 error happened
4. The error will show:
   - The exact error message
   - Stack trace
   - Any console.error logs we added

### 2. Verify Environment Variables

Ensure these are set in Supabase:
- `MOOV_SECRET_KEY` - Your Moov secret key
- `MOOV_PUBLIC_KEY` - Your Moov public key (optional but recommended)
- `MOOV_API_URL` - Defaults to `https://api.moov.io` if not set
- `MOOV_ACCOUNT_ID` - Your Moov account ID

To check/update:
- Supabase Dashboard → **Edge Functions** → **Secrets**

### 3. Redeploy the Function

Make sure the latest code is deployed:

```bash
supabase functions deploy create-moov-onboarding-invite
```

### 4. Common Causes of 500 Errors

1. **Missing Moov API Keys**
   - Error: "Moov secret key is not configured"
   - Fix: Set `MOOV_SECRET_KEY` in Supabase secrets

2. **Moov API Authentication Failed**
   - Error: "Moov onboarding invite creation failed (401): ..."
   - Fix: Verify your Moov API keys are correct

3. **Invalid Fee Plan Code**
   - Error: "Moov onboarding invite creation failed (400): ..."
   - Fix: Verify `feePlanCodes: ["merchant-direct"]` is valid for your Moov account

4. **Moov API Request Format Issue**
   - Error: "Moov onboarding invite creation failed (400/422): ..."
   - Fix: Check the request payload structure matches Moov API requirements

### 5. Test the Function Locally (Optional)

You can test the function locally if you have Supabase CLI set up:

```bash
supabase functions serve create-moov-onboarding-invite --env-file .env.local
```

## What to Check in Logs

Look for these specific error patterns in the logs:

- `Error creating Moov onboarding invite:` - General error catch
- `Error details:` - Detailed error information we log
- `Moov API error:` - Errors from Moov API calls
- `Moov secret key is not configured` - Missing secret key
- `Moov onboarding invite creation failed` - Moov API returned an error

The logs will show the exact error message that's causing the 500 error.

