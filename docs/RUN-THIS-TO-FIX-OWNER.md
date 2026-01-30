# 🔧 FIX OWNER ACCESS NOW

## The Problem

`craven@usa.com` should have **ZERO LIMITATIONS** across the system, but some RLS policies weren't checking for owner access.

## The Fix

Run this SQL in your **Supabase SQL Editor** right now:

```sql
-- Copy/paste the entire FIX-OWNER-ACCESS.sql file
```

Or go to: **Supabase Dashboard → SQL Editor → New Query → Paste FIX-OWNER-ACCESS.sql → Run**

## What This Does

1. ✅ Updates `is_admin()` function to return TRUE for owner
2. ✅ Updates `is_ceo()` function to return TRUE for owner  
3. ✅ Creates `is_owner()` function for future use
4. ✅ Grants owner access to ALL exec_users records
5. ✅ Inserts owner as CEO in exec_users if missing
6. ✅ Inserts owner as admin in user_roles if missing

## After Running

**Refresh your browser** and log back in. You should now have:
- ✅ Full CEO Command Center access
- ✅ Full Board Portal access
- ✅ Full Admin Portal access
- ✅ Full CFO/COO/CTO portal access
- ✅ Bypass all RLS restrictions
- ✅ Unlimited permissions

## Status Check

Run this to verify:

```sql
SELECT 
    'Owner Setup' as check_name,
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'craven@usa.com') as user_exists,
    EXISTS(SELECT 1 FROM exec_users WHERE user_id IN (
        SELECT id FROM auth.users WHERE email = 'craven@usa.com'
    )) as ceo_exists,
    EXISTS(SELECT 1 FROM user_roles WHERE user_id IN (
        SELECT id FROM auth.users WHERE email = 'craven@usa.com'
    ) AND role = 'admin') as admin_exists;
```

Should all return TRUE.

---

**Do this NOW** to restore full access. 🚀

