-- Fix RLS policies to ensure Torrance and admins can view all enrollments
-- This migration consolidates all admin access checks

-- ============================================================================
-- STEP 1: Create the function FIRST (before policies use it)
-- ============================================================================
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

-- ============================================================================
-- STEP 2: Drop existing policies (after function exists)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.android_tester_enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.android_tester_enrollments;

-- ============================================================================
-- STEP 3: Create comprehensive admin policies (using the function)
-- ============================================================================
CREATE POLICY "Admins can view all enrollments"
ON public.android_tester_enrollments
FOR SELECT
TO authenticated
USING (
  -- Check if Torrance or admin via function
  public.is_torrance_or_admin(auth.uid())
  OR
  -- Check user_profiles.role
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
  OR
  -- Check user_roles table
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

CREATE POLICY "Admins can update enrollments"
ON public.android_tester_enrollments
FOR UPDATE
TO authenticated
USING (
  -- Check if Torrance or admin via function
  public.is_torrance_or_admin(auth.uid())
  OR
  -- Check user_profiles.role
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
  OR
  -- Check user_roles table
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

