-- Fix RLS policies for user_profiles table to prevent public access
-- This migration ensures only authenticated users can view their own profiles
-- and admins can view all profiles

-- Enable Row Level Security if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies that allow public access
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy: Admins can view all profiles
-- Check if the current user has admin role in their own profile
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role = 'admin'
  )
);

-- Policy: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Admins can update all profiles
-- Check if the current user has admin role in their own profile
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role = 'admin'
  )
);

-- Policy: Service role can do everything (for backend operations)
-- Note: Service role bypasses RLS, but we add this for clarity
-- Service role operations are handled at the application level

-- Add comment to table
COMMENT ON TABLE public.user_profiles IS 'User profile information. Protected by RLS - users can only view/update their own profile, admins can view/update all profiles.';

