# Setting Moov Secrets in Supabase

You have two options to set the Moov API secrets:

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:

   - **Name:** `MOOV_SECRET_KEY`  
     **Value:** `tvMWfB9Zggm18QJ5Pk6baCn-CjS-vRMJ`

   - **Name:** `MOOV_PUBLIC_KEY`  
     **Value:** `fHdLsV9CQsL7UvLb`

   - **Name:** `MOOV_API_URL`  
     **Value:** `https://api.moov.io`

   - **Name:** `MOOV_ACCOUNT_ID`  
     **Value:** `4d316754-d42f-43bc-94c2-a83c624a537a`

4. Click **Save** for each secret

## Option 2: Supabase CLI (If authentication works)

If you can successfully authenticate with the CLI, use these commands:

```powershell
supabase secrets set MOOV_SECRET_KEY=tvMWfB9Zggm18QJ5Pk6baCn-CjS-vRMJ
supabase secrets set MOOV_PUBLIC_KEY=fHdLsV9CQsL7UvLb
supabase secrets set MOOV_API_URL=https://api.moov.io
supabase secrets set MOOV_ACCOUNT_ID=4d316754-d42f-43bc-94c2-a83c624a537a
```

## Verify Secrets Are Set

After setting the secrets, you can verify they're available to your edge functions by checking the function logs or testing the onboarding endpoint.

## Next Steps

Once secrets are set:
1. Run the database migration: `supabase db push`
2. Test the onboarding endpoint
3. Integrate into your merchant portal

