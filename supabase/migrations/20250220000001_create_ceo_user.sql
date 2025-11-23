-- Create CEO user in the database
-- This ensures tstroman.ceo@cravenusa.com exists in auth.users

DO $$
DECLARE
  ceo_user_id UUID;
  ceo_email TEXT := 'tstroman.ceo@cravenusa.com';
BEGIN
  -- Check if user already exists
  SELECT id INTO ceo_user_id
  FROM auth.users
  WHERE email = ceo_email OR email = 'craven@usa.com';
  
  -- If user doesn't exist, we need to create them via Supabase Auth
  -- Since we can't directly insert into auth.users, we'll ensure the profile and exec_users records exist
  -- The user should be created via the Supabase Auth UI or create-user-with-portals function
  
  -- Ensure user_profiles record exists (will be created by trigger if user exists)
  -- If user_id is NULL, we'll update it when the user is created
  
  -- Ensure exec_users record exists for CEO
  -- First, try to find existing CEO exec_users record
  IF ceo_user_id IS NOT NULL THEN
    -- Update or insert exec_users record
    INSERT INTO public.exec_users (
      user_id,
      role,
      access_level,
      title,
      department,
      approved_at
    ) VALUES (
      ceo_user_id,
      'ceo',
      1,
      'Founder & Chief Executive Officer',
      'Executive',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      role = 'ceo',
      access_level = 1,
      title = 'Founder & Chief Executive Officer',
      department = 'Executive',
      approved_at = now();
    
    -- Ensure user_profiles has email
    UPDATE public.user_profiles
    SET email = ceo_email
    WHERE user_id = ceo_user_id
      AND (email IS NULL OR email != ceo_email);
    
    RAISE NOTICE 'CEO user found: %', ceo_user_id;
  ELSE
    RAISE NOTICE 'CEO user not found in auth.users. User must be created via Supabase Auth UI or create-user-with-portals function first.';
    RAISE NOTICE 'Email should be: %', ceo_email;
  END IF;
END $$;

-- Also ensure craven@usa.com is linked if it exists
DO $$
DECLARE
  old_ceo_user_id UUID;
  new_ceo_user_id UUID;
  ceo_email TEXT := 'tstroman.ceo@cravenusa.com';
BEGIN
  -- Find user with old email
  SELECT id INTO old_ceo_user_id
  FROM auth.users
  WHERE email = 'craven@usa.com';
  
  -- Find user with new email
  SELECT id INTO new_ceo_user_id
  FROM auth.users
  WHERE email = ceo_email;
  
  -- If old email exists but new doesn't, update the email
  IF old_ceo_user_id IS NOT NULL AND new_ceo_user_id IS NULL THEN
    -- Update email in auth.users (if we have permission)
    -- Note: This might require service role permissions
    UPDATE auth.users
    SET email = ceo_email,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', ceo_email)
    WHERE id = old_ceo_user_id;
    
    RAISE NOTICE 'Updated CEO email from craven@usa.com to %', ceo_email;
  END IF;
END $$;

