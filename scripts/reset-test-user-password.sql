-- Reset Test User Password
-- This uses Supabase's auth.admin functions
-- Note: You may need service role permissions to run this

-- First, verify user exists
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Email NOT confirmed'
    ELSE '✅ Email confirmed'
  END as status
FROM auth.users
WHERE email = 'tester@cravenusa.com';

-- If user exists and is confirmed, the password might be wrong
-- You'll need to reset it in Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Find tester@cravenusa.com
-- 3. Click on the user
-- 4. Click "Reset Password" or "Update User"
-- 5. Set password to: Testing123!
-- 6. Make sure "Auto Confirm" is checked
-- 7. Save

-- Alternative: Try using Supabase's password reset function
-- But this requires service role key, so Dashboard is easier





