-- Grant Justin Sweet (CFO) access to Company Portal - Executives and Leadership
-- Email: jsweet.cfo@cravenusa.com

-- First, get Justin Sweet's user ID
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
    -- Insert the role if it doesn't exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'CRAVEN_EXECUTIVE')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Granted CRAVEN_EXECUTIVE role to Justin Sweet (%)' , v_user_id;
  ELSE
    RAISE NOTICE 'User jsweet.cfo@cravenusa.com not found';
  END IF;
END $$;

-- Verify the role was granted
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'jsweet.cfo@cravenusa.com';