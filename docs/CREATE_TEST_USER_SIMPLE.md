# Create Test User - Simple Step-by-Step

## Step 1: Check if User Exists

Run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Email NOT confirmed'
    ELSE '✅ Email confirmed'
  END as email_status
FROM auth.users
WHERE email = 'tester@cravenusa.com';
```

**If this returns NO rows:** User doesn't exist. Go to Step 2.

**If this returns a row but `email_confirmed_at` is NULL:** Email not confirmed. Go to Step 3.

**If this returns a row with `email_confirmed_at` set:** User exists and is confirmed. Password might be wrong. Go to Step 4.

## Step 2: Create User in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** button (top right)
3. Fill in the form:
   - **Email**: `tester@cravenusa.com`
   - **Password**: `Testing123!`
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (very important!)
4. Click **"Create User"**

## Step 3: Confirm Email (if user exists but not confirmed)

Run this SQL in Supabase SQL Editor:

```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'tester@cravenusa.com'
  AND email_confirmed_at IS NULL;
```

## Step 4: Reset Password (if password doesn't work)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find `tester@cravenusa.com` in the list
3. Click on the user row to open details
4. Click **"Reset Password"** or **"Update User"**
5. Set password to: `Testing123!`
6. Make sure **"Auto Confirm"** is checked
7. Save

## Step 5: Complete Setup (Run after user is created)

Run this SQL to set up driver profile and settings:

```sql
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'tester@cravenusa.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please create user first in Dashboard.';
  END IF;

  -- Create/update driver profile
  INSERT INTO driver_profiles (
    user_id,
    status,
    vehicle_type,
    is_test_user,
    is_available
  ) VALUES (
    v_user_id,
    'online',
    'car',
    true,
    true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_test_user = true,
    status = 'online',
    is_available = true;

  -- Create/update driver settings
  INSERT INTO driver_settings (
    user_id,
    is_test_user,
    on_fire_game_enabled
  ) VALUES (
    v_user_id,
    true,
    false
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_test_user = true;

  RAISE NOTICE '✅ Test user setup complete!';
  RAISE NOTICE 'Email: tester@cravenusa.com';
  RAISE NOTICE 'Password: Testing123!';
END $$;
```

## Step 6: Verify Everything Works

Try logging in with:
- **Email**: `tester@cravenusa.com`
- **Password**: `Testing123!`

If it still doesn't work, check:
1. User exists in Dashboard → Authentication → Users
2. Email is confirmed (green checkmark or `email_confirmed_at` is not NULL)
3. Password is exactly `Testing123!` (case-sensitive)
4. Auto Confirm was checked when creating/updating user





