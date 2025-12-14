-- Fix admin policy circular dependency in user_profiles
-- The current admin policy queries user_profiles to check admin status,
-- which could cause issues. This creates a more efficient solution.

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- Create a function to check if user is admin (more efficient)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check user_profiles for admin role
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE user_id = user_id_param
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;

-- Policy: Admins can view all profiles
-- Uses the function which is more efficient and avoids circular dependency
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (
  -- Users can always see their own profile (handled by other policy)
  auth.uid() = user_id
  OR
  -- Admins can see all profiles
  public.is_user_admin(auth.uid())
);

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
USING (
  -- Users can update their own profile (handled by other policy)
  auth.uid() = user_id
  OR
  -- Admins can update all profiles
  public.is_user_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR
  public.is_user_admin(auth.uid())
);

-- Add comment
COMMENT ON FUNCTION public.is_user_admin(UUID) IS 'Efficiently checks if a user has admin role. Uses SECURITY DEFINER to bypass RLS for the check.';

