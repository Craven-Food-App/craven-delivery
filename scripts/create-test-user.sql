-- Create Test User Account
-- Run this in Supabase SQL Editor
-- This creates a test user that can only see test orders

-- Step 1: Create the auth user (if it doesn't exist)
-- Note: You'll need to manually set the password in Supabase Auth dashboard
-- or use the Supabase CLI/auth API

-- First, check if user exists and create if needed
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'tester@cravenusa.com';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- User doesn't exist - you'll need to create it via Supabase Dashboard
    -- Go to Authentication > Users > Add User
    -- Email: tester@cravenusa.com
    -- Password: Testing123!
    -- Auto Confirm: Yes
    RAISE NOTICE 'User does not exist. Please create it manually in Supabase Dashboard:';
    RAISE NOTICE '  - Go to Authentication > Users > Add User';
    RAISE NOTICE '  - Email: tester@cravenusa.com';
    RAISE NOTICE '  - Password: Testing123!';
    RAISE NOTICE '  - Auto Confirm: Yes';
    RAISE NOTICE 'Then run the rest of this script.';
    RETURN;
  ELSE
    RAISE NOTICE 'User found: %', v_user_id;
  END IF;

  -- Step 2: Create or update driver_profile
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

  RAISE NOTICE '✓ Driver profile created/updated';

  -- Step 3: Create or update driver_settings
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

  RAISE NOTICE '✓ Driver settings created/updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Test user setup complete!';
  RAISE NOTICE 'Email: tester@cravenusa.com';
  RAISE NOTICE 'Password: Testing123!';
  RAISE NOTICE 'This user will only see test orders.';

END $$;

-- If user already exists, you can also just update the existing user:
-- UPDATE driver_profiles SET is_test_user = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tester@cravenusa.com');
-- UPDATE driver_settings SET is_test_user = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tester@cravenusa.com');

