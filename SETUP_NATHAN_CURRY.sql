-- Setup Nathan Curry (CTO) Account
-- Email: natecurry.cto@cravenusa.com
-- UID: 76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3
-- Temporary Password: NateCrave404!
-- Hub PIN: 570022
-- Access: CTO Portal, Company Portal (NO Governance Admin, Board, or Template Manager)

DO $$
DECLARE
  nathan_user_id UUID := '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
  nathan_email TEXT := 'natecurry.cto@cravenusa.com';
  temp_password TEXT := 'NateCrave404!';
  hub_pin TEXT := '570022';
BEGIN
  -- Step 1: Create/Update auth user with temporary password
  -- Note: This requires Supabase Admin API, so we'll use a function call
  -- The user should be created via edge function or Supabase dashboard first
  RAISE NOTICE 'Step 1: User should be created via create-user-with-portals edge function or Supabase Auth Admin API';
  RAISE NOTICE 'User ID: %', nathan_user_id;
  RAISE NOTICE 'Email: %', nathan_email;
  RAISE NOTICE 'Temporary Password: %', temp_password;
  RAISE NOTICE 'Password change required on first login: YES';

  -- Step 2: Create/Update user_profiles
  -- Note: role must be one of: 'customer', 'driver', 'admin', 'restaurant_owner'
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    email,
    role
  )
  VALUES (
    nathan_user_id,
    'Nathan Curry',
    nathan_email,
    'admin' -- Using 'admin' for executive users
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    full_name = 'Nathan Curry',
    email = nathan_email,
    role = 'admin';

  RAISE NOTICE 'Step 2: User profile created/updated';

  -- Step 3: Create/Update exec_users record for CTO
  INSERT INTO public.exec_users (
    user_id,
    role,
    access_level,
    title,
    department,
    approved_at
  )
  VALUES (
    nathan_user_id,
    'cto',
    2, -- Standard executive access level
    'Chief Technology Officer',
    'Technology',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    role = 'cto',
    access_level = 2,
    title = 'Chief Technology Officer',
    department = 'Technology';

  RAISE NOTICE 'Step 3: exec_users record created/updated for CTO';

  -- Step 4: Add Portal PIN access for Hub verification
  -- Executives use ceo_access_credentials table for Portal PIN verification
  -- PIN must be hashed using bcrypt
  INSERT INTO public.ceo_access_credentials (
    user_email,
    pin_hash
  )
  VALUES (
    nathan_email,
    crypt(hub_pin, gen_salt('bf')) -- Hash PIN using bcrypt
  )
  ON CONFLICT (user_email) DO UPDATE
  SET 
    pin_hash = crypt(hub_pin, gen_salt('bf')),
    updated_at = now();

  RAISE NOTICE 'Step 4: Portal PIN access configured (PIN: %)', hub_pin;

  -- Step 5: Grant Company Portal access (CRAVEN_EXECUTIVE and CRAVEN_CTO roles)
  -- This gives access to Executives and Leadership tabs but NOT Governance Admin, Board, or Template Manager
  INSERT INTO public.user_roles (
    user_id,
    role
  )
  VALUES 
    (nathan_user_id, 'CRAVEN_EXECUTIVE'),
    (nathan_user_id, 'CRAVEN_CTO')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Step 5: Company Portal access granted (CRAVEN_EXECUTIVE and CRAVEN_CTO roles)';
  RAISE NOTICE '   - Access to: CTO Portal, Company Portal (Executives and Leadership tabs)';
  RAISE NOTICE '   - NO access to: Governance Administration, Board, Template Manager';

  -- Step 5b: Create exec_users record for CTO portal access
  INSERT INTO public.exec_users (
    user_id,
    role,
    access_level,
    title,
    department,
    first_name,
    last_name,
    email
  )
  VALUES (
    nathan_user_id,
    'cto',
    7,
    'Chief Technology Officer',
    'Technology',
    'Nathan',
    'Curry',
    'natecurry.cto@cravenusa.com'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    access_level = EXCLUDED.access_level,
    title = EXCLUDED.title,
    department = EXCLUDED.department;

  RAISE NOTICE 'Step 5b: CTO exec_users record created for portal access';

  -- Step 6: Remove any roles that would grant restricted access
  DELETE FROM public.user_roles
  WHERE user_id = nathan_user_id
    AND role IN (
      'CRAVEN_FOUNDER',
      'CRAVEN_CORPORATE_SECRETARY',
      'CRAVEN_BOARD_MEMBER',
      'CRAVEN_CEO'
    );

  RAISE NOTICE 'Step 6: Restricted roles removed (if any existed)';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Nathan Curry account setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create/update auth user via Supabase Auth Admin API or create-user-with-portals edge function';
  RAISE NOTICE '2. Set temporary password: %', temp_password;
  RAISE NOTICE '3. Enable password change requirement on first login';
  RAISE NOTICE '4. User can login with email: %', nathan_email;
  RAISE NOTICE '5. User will be prompted to change password on first login';
  RAISE NOTICE '6. After password change, user can access:';
  RAISE NOTICE '   - BusinessAuth (via email/password)';
  RAISE NOTICE '   - Company Hub (with PIN: %)', hub_pin;
  RAISE NOTICE '   - CTO Portal';
  RAISE NOTICE '   - Company Portal (Executives tab only)';

END $$;

