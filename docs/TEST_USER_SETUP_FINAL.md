# Test User Setup - Final Solution

## The Problem
"Invalid login credentials" means the user either doesn't exist, password is wrong, or email isn't confirmed.

## Solution: Create User in Supabase Dashboard

### Step 1: Create the User

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users** (left sidebar)
4. Click **"Add User"** button (top right, green button)
5. Fill in the form:
   - **Email**: `tester@cravenusa.com`
   - **Password**: `Testing123!`
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (CRITICAL!)
6. Click **"Create User"**

### Step 2: Verify User Was Created

1. You should see `tester@cravenusa.com` in the users list
2. Click on the user to open details
3. Check that:
   - Email shows as confirmed (green checkmark or "Confirmed" status)
   - If not confirmed, click **"Confirm Email"** button

### Step 3: If Password Doesn't Work

1. In the user details page, click **"Reset Password"** or **"Update User"**
2. Set password to: `Testing123!`
3. Make sure **"Auto Confirm"** is checked
4. Save

### Step 4: Complete Setup (Run SQL)

After user is created, run this in **SQL Editor**:

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
END $$;
```

### Step 5: Test Login

Try logging in with:
- **Email**: `tester@cravenusa.com`
- **Password**: `Testing123!`

## Troubleshooting

**Still getting "Invalid login credentials"?**

1. **Double-check the password** - Make sure it's exactly `Testing123!` (case-sensitive, includes the exclamation mark)
2. **Check email confirmation** - User must have green checkmark or "Confirmed" status
3. **Try resetting password** - In Dashboard, click user → Reset Password → Set to `Testing123!` → Check Auto Confirm → Save
4. **Verify user exists** - Run this SQL:
   ```sql
   SELECT id, email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'tester@cravenusa.com';
   ```
   Should return 1 row with `email_confirmed_at` NOT NULL

## Important Notes

- The password is case-sensitive: `Testing123!` (capital T, capital N, exclamation mark)
- "Auto Confirm" MUST be checked when creating/updating the user
- The user will only see test orders (where `is_test = true`)





