# 🚀 **QUICK DEPLOYMENT GUIDE**

## **Step 1: Copy SQL File**

I've created **`DEPLOY-ALL-BUSINESS-SYSTEMS.sql`** - a single file with all 5 migrations combined.

## **Step 2: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

## **Step 3: Paste & Run**

1. Open `DEPLOY-ALL-BUSINESS-SYSTEMS.sql` from this directory
2. Select all text (Ctrl+A)
3. Copy (Ctrl+C)
4. Paste into Supabase SQL Editor
5. Click **"RUN"** button

## **Step 4: Verify Success**

You should see: ✅ **Success. 5 statements executed.**

## **Step 5: Create Executive Users**

After deployment, run this in SQL Editor to create COO/CTO users:

```sql
-- First, get your user IDs from auth.users
SELECT id, email FROM auth.users;

-- Then insert into exec_users (replace the UUIDs with actual user IDs)
INSERT INTO public.exec_users (user_id, role, access_level, title, department) VALUES
  ('<your-coo-user-id>', 'coo', 9, 'Chief Operating Officer', 'Operations'),
  ('<your-cto-user-id>', 'cto', 9, 'Chief Technology Officer', 'Technology');
```

## **Step 6: Test Portals**

Visit these URLs in your browser:
- `coo.cravenusa.com` → Should show COO portal
- `cto.cravenusa.com` → Should show CTO portal

---

**That's it! Your complete business system is now live! 🎉**

