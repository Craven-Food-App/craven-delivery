# Apply Invites Migration - DO THIS NOW

## Step 1: Open Supabase SQL Editor

Go to: **https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/sql/new**

## Step 2: Copy & Paste the SQL

Open `APPLY_INVITES_MIGRATION_NOW.sql` in this repo and paste the entire contents into the SQL editor.

## Step 3: Run It

Click **"Run"** or press `Ctrl+Enter`

## Step 4: Verify

Run this query to confirm the table exists:

```sql
SELECT * FROM public.invites LIMIT 1;
```

You should see column names (even if no rows exist yet).

## Done

The frontend will now work seamlessly - no backend API needed.

---

## What Changed

**BEFORE (broken):**
- Frontend → Express API → Supabase
- Required backend server running
- Complex routing and error handling
- Auth middleware not implemented

**AFTER (works):**
- Frontend → Supabase directly
- Zero backend dependencies for this feature
- RLS enforces CEO/admin access automatically
- Clean, simple, fast

**CEO access is hardcoded:** `tstroman.ceo@cravenusa.com` has full access via RLS policy.





