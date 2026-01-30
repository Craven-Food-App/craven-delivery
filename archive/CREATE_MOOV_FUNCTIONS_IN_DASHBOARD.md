# Create Moov Functions in Supabase Dashboard

Since the functions don't exist yet and CLI deployment has permission issues, here's how to create them manually in the Supabase Dashboard.

## Step 1: Create `create-moov-onboarding-invite` Function

1. **Navigate to Functions:**
   - Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
   - Click "Create a new function" or "+ New Function"

2. **Function Setup:**
   - **Function Name:** `create-moov-onboarding-invite`
   - **Language:** TypeScript/Deno
   - Copy the entire contents of: `supabase/functions/create-moov-onboarding-invite/index.ts`

3. **Shared Dependencies:**
   The function depends on shared files. You'll need to either:
   
   **Option A: Inline the shared code** (Simpler for dashboard)
   - Copy code from `supabase/functions/_shared/cors.ts` into the function
   - Copy code from `supabase/functions/_shared/moov.ts` into the function
   
   **Option B: Create shared functions** (More complex)
   - Shared files need to be accessible - this is harder in dashboard

## Step 2: Create `manage-moov-onboarding-invites` Function

1. **Navigate to Functions:**
   - Same as above, create a new function

2. **Function Setup:**
   - **Function Name:** `manage-moov-onboarding-invites`
   - Copy the entire contents of: `supabase/functions/manage-moov-onboarding-invites/index.ts`
   - Also needs the shared dependencies

## Recommended: Use Supabase CLI (If Permissions Fixed)

The dashboard approach is complex because of shared dependencies. It's better to:

1. **Fix CLI Permissions:**
   - Make sure you're logged in: `supabase login`
   - Check if you have project access
   - May need to be added as a team member with deployment permissions

2. **Deploy via CLI:**
   ```bash
   supabase functions deploy create-moov-onboarding-invite
   supabase functions deploy manage-moov-onboarding-invites
   ```

## Alternative: Ask Team Member

If you don't have deployment permissions, ask a team member who does to deploy these functions using the CLI commands above.

