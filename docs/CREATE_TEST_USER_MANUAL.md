# Creating Test User Account - Manual Instructions

Since you can't run Supabase scripts, here's how to create the test user manually:

## Step 1: Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250107000001_add_test_user_support.sql`
4. Click **Run**

This adds the `is_test_user` and `is_test` columns to the necessary tables.

## Step 2: Create the Auth User

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add User** (or **Invite User**)
3. Fill in:
   - **Email**: `tester@cravenusa.com`
   - **Password**: `Testing123!`
   - **Auto Confirm**: ✅ Yes (check this box)
4. Click **Create User**

## Step 3: Run the SQL Script

1. Go back to **SQL Editor**
2. Copy and paste the contents of `scripts/create-test-user.sql`
3. Click **Run**

This will:
- Find the user you just created
- Create/update the driver profile with `is_test_user = true`
- Create/update driver settings with `is_test_user = true`

## Step 4: Verify

Try logging in with:
- **Email**: `tester@cravenusa.com`
- **Password**: `Testing123!`

The test user will only see orders where `is_test = true`.

## Alternative: Update Existing User

If the user already exists but isn't marked as a test user, run this SQL:

```sql
-- Update existing user to be a test user
UPDATE driver_profiles 
SET is_test_user = true 
WHERE email = 'tester@cravenusa.com';

UPDATE driver_settings 
SET is_test_user = true 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'tester@cravenusa.com'
);
```





