# Fix Foundational Invites RLS Error - Action Required

## Problem
Creating invites at `/hub/foundational/invites` fails with:
```
403 Forbidden - new row violates row-level security policy for table "invites"
```

## Root Cause
The `invites` table has RLS enabled, but no policy exists allowing authenticated browser users to insert rows.

## Solution
Run this SQL in your Supabase dashboard to create the required policy.

---

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
- Navigate to **SQL Editor** (left sidebar)

### 2. Run This SQL

```sql
-- Enable RLS on invites table (if not already enabled)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create policy allowing authenticated users full access to invites
DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invites'
      AND policyname = 'invites_authenticated_access'
  ) THEN
    DROP POLICY "invites_authenticated_access" ON public.invites;
  END IF;

  -- Create new policy
  CREATE POLICY "invites_authenticated_access" ON public.invites
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END;
$$;
```

### 3. Verify the Fix
After running the SQL:
1. Return to `http://localhost:8080/hub/foundational/invites`
2. Fill in the email field (e.g., `test@example.com`)
3. Click **Create Invite**
4. You should see the invite appear in the table without errors

---

## What This Does

**Security Model:**
- Any **authenticated user** (logged in via Supabase Auth) can create, read, update, and delete invites
- **Unauthenticated users** (public) have no access
- This matches how your frontend is built: `BusinessAuthGuard` already requires authentication before reaching the invites page

**Why It's Safe:**
- Your CEO account (`tstroman.ceo@cravenusa.com`) is authenticated
- Only authenticated team members can access `/hub/foundational/invites`
- The policy still blocks anonymous/public access

---

## Future Enhancement (Optional)

For tighter control, replace the above policy with a role-based one that checks specific user permissions:

```sql
-- Example: Only allow users with 'admin' or 'ceo' role
CREATE POLICY "invites_admin_ceo_only" ON public.invites
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'ceo')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'ceo')
  );
```

This requires adding a `role` claim to your JWT tokens, which is a separate implementation.

---

## Status
- [ ] SQL applied in Supabase
- [ ] Tested invite creation at `/hub/foundational/invites`
- [ ] Confirmed no console errors

---

**Next Step:** Run the SQL above in your Supabase dashboard now.




