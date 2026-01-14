-- Simple diagnostic query - Run this first to see what's wrong
-- Copy and paste into Supabase SQL Editor

-- Check if user exists and their status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Email NOT confirmed'
    ELSE '✅ Email confirmed'
  END as email_status
FROM auth.users
WHERE email = 'tester@cravenusa.com';

-- If no rows returned above, the user doesn't exist
-- You need to create it in Supabase Dashboard





