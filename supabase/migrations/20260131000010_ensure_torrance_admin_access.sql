-- Ensure Torrance Stroman has admin access to tester enrollment system
-- This migration ensures tstroman.ceo@cravenusa.com has admin role in user_profiles

-- Function to check if user is Torrance or admin
CREATE OR REPLACE FUNCTION public.is_torrance_or_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;

  -- Check if it's Torrance
  IF user_email = 'tstroman.ceo@cravenusa.com' OR 
     LOWER(user_email) LIKE '%torrance%' OR 
     LOWER(user_email) LIKE '%tstroman%' THEN
    RETURN TRUE;
  END IF;

  -- Check if user has admin role in user_profiles
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE user_id = user_uuid
  LIMIT 1;

  RETURN user_role = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_torrance_or_admin(UUID) TO authenticated;

-- Ensure Torrance has admin role in user_profiles
DO $$
DECLARE
  torrance_user_id UUID;
BEGIN
  -- Find Torrance's user ID
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NOT NULL THEN
    -- Insert or update user_profiles to ensure admin role
    INSERT INTO public.user_profiles (user_id, role, full_name)
    VALUES (torrance_user_id, 'admin', 'Torrance Stroman')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'admin',
      full_name = COALESCE(user_profiles.full_name, 'Torrance Stroman'),
      updated_at = now();
    
    -- Also ensure admin role in user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (torrance_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Update RLS policies to use the new function
-- Update android_tester_enrollments admin policies
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.android_tester_enrollments;

CREATE POLICY "Admins can view all enrollments"
ON public.android_tester_enrollments
FOR SELECT
TO authenticated
USING (
  public.is_torrance_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

DROP POLICY IF EXISTS "Admins can update enrollments" ON public.android_tester_enrollments;

CREATE POLICY "Admins can update enrollments"
ON public.android_tester_enrollments
FOR UPDATE
TO authenticated
USING (
  public.is_torrance_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

