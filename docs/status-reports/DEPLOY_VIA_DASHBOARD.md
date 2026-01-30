# Deploy Moov Functions via Supabase Dashboard

Since CLI deployment is having authentication issues, use the Supabase Dashboard instead.

## Steps

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions

2. **Use the Dashboard Terminal**
   - Click on the terminal/CLI option in the dashboard
   - Or use the "Deploy Function" interface

3. **Alternative: Copy Files Directly**
   - Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
   - You can create/edit functions directly in the dashboard
   - Copy the code from the local files

## Quick Fix: Test if Functions Exist

The CORS error might also be because:
1. Functions are deployed but have errors
2. Functions need to be redeployed
3. There's a runtime error in the function

**Check function logs:**
1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Look for `create-moov-onboarding-invite` function
3. Check logs for errors
4. Verify function is active/deployed

## Temporary Workaround

If deployment is blocked, you can:
1. Use the Supabase Dashboard to create the functions manually
2. Copy the code from:
   - `supabase/functions/create-moov-onboarding-invite/index.ts`
   - `supabase/functions/manage-moov-onboarding-invites/index.ts`

Or wait for a team member with deployment permissions to deploy them.

