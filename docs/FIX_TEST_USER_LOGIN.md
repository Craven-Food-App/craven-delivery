# Fix Test User Login Issues

If you're getting "Invalid login credentials", follow these steps:

## Step 1: Verify User Exists

Run this in Supabase SQL Editor:

```sql
SELECT id, email, email_confirmed_at, confirmed_at
FROM auth.users
WHERE email = 'tester@cravenusa.com';
```

**If no rows returned:** The user doesn't exist. Go to Step 2.

**If rows returned but `email_confirmed_at` is NULL:** The email isn't confirmed. Go to Step 3.

## Step 2: Create the User (if it doesn't exist)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add User** (or **Invite User**)
3. Fill in:
   - **Email**: `tester@cravenusa.com`
   - **Password**: `Testing123!`
   - **Auto Confirm**: ✅ **Check this box** (very important!)
4. Click **Create User**

## Step 3: Confirm Email (if user exists but not confirmed)

Run this SQL:

```sql
UPDATE auth.users
SET 
  email_confirmed_at = NOW()
WHERE email = 'tester@cravenusa.com';
```

Note: `confirmed_at` is a generated column and will be automatically set when `email_confirmed_at` is updated.

## Step 4: Reset Password (if needed)

If the password isn't working:

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find `tester@cravenusa.com`
3. Click on the user
4. Click **Reset Password** or **Update User**
5. Set password to: `Testing123!`
6. Make sure **Auto Confirm** is checked

## Step 5: Verify Complete Setup

Run this to check everything:

```sql
-- Check auth user
SELECT id, email, email_confirmed_at, confirmed_at
FROM auth.users
WHERE email = 'tester@cravenusa.com';

-- Check driver profile
SELECT 
  dp.user_id, 
  u.email, 
  dp.status, 
  dp.is_test_user
FROM driver_profiles dp
JOIN auth.users u ON u.id = dp.user_id
WHERE u.email = 'tester@cravenusa.com';

-- Check driver settings
SELECT user_id, is_test_user
FROM driver_settings
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tester@cravenusa.com');
```

All three should return rows with:
- `email_confirmed_at` is NOT NULL
- `is_test_user` is `true` (for driver_profiles and driver_settings)

## Common Issues:

1. **User created but email not confirmed** → Run Step 3 SQL
2. **Wrong password** → Reset in Dashboard (Step 4)
3. **User doesn't exist** → Create in Dashboard (Step 2)
4. **Auto Confirm not checked** → Recreate user with Auto Confirm checked

