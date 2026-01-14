-- Verify and Fix Test User
-- Run this in Supabase SQL Editor to check if the user exists and fix issues

-- Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'tester@cravenusa.com';

-- If the above returns no rows, the user doesn't exist in auth.users
-- You need to create it in Supabase Dashboard: Authentication > Users > Add User

-- Check driver_profile
SELECT 
  dp.id,
  dp.user_id,
  u.email,
  dp.status,
  dp.is_test_user,
  dp.is_available
FROM driver_profiles dp
JOIN auth.users u ON u.id = dp.user_id
WHERE u.email = 'tester@cravenusa.com';

-- Check driver_settings
SELECT 
  id,
  user_id,
  is_test_user,
  on_fire_game_enabled
FROM driver_settings
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tester@cravenusa.com'
);

-- If user exists but email_confirmed_at is NULL, you need to confirm the email
-- Note: confirmed_at is a generated column, so we only update email_confirmed_at
UPDATE auth.users
SET 
  email_confirmed_at = NOW()
WHERE email = 'tester@cravenusa.com'
  AND email_confirmed_at IS NULL;

-- Reset password (if needed) - this requires service role key, so manual reset may be needed
-- You can reset password in Supabase Dashboard: Authentication > Users > [User] > Reset Password

