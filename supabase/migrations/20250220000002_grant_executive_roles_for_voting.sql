-- Grant CRAVEN_EXECUTIVE role to Justin Sweet and Terri Crawford
-- This ensures they can access the Voting tab in the Company Portal
-- The Voting tab requires: CRAVEN_BOARD_MEMBER, CRAVEN_FOUNDER, or CRAVEN_EXECUTIVE

-- Grant role to Justin Sweet (CFO)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jsweet.cfo@cravenusa.com';

  -- If user exists, grant CRAVEN_EXECUTIVE role
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'CRAVEN_EXECUTIVE')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Granted CRAVEN_EXECUTIVE role to Justin Sweet (%)', v_user_id;
  ELSE
    RAISE NOTICE 'User jsweet.cfo@cravenusa.com not found';
  END IF;
END $$;

-- Grant role to Terri Crawford (CXO)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'terri.crawford@cravenusa.com';

  -- If user exists, grant CRAVEN_EXECUTIVE role
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'CRAVEN_EXECUTIVE')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Granted CRAVEN_EXECUTIVE role to Terri Crawford (%)', v_user_id;
  ELSE
    RAISE NOTICE 'User terri.crawford@cravenusa.com not found';
  END IF;
END $$;

-- Verify the roles were granted
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email IN ('jsweet.cfo@cravenusa.com', 'terri.crawford@cravenusa.com')
  AND ur.role = 'CRAVEN_EXECUTIVE'
ORDER BY u.email;










































