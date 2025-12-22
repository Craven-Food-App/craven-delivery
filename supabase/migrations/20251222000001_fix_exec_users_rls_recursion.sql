-- Fix infinite recursion in exec_users RLS policies
-- This migration uses SECURITY DEFINER functions to break the recursion cycle
-- Similar to the fix for investor_profiles

-- Drop ALL existing policies that might cause recursion
-- Use DO block to handle errors gracefully
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on exec_users
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'exec_users'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exec_users', r.policyname);
    END LOOP;
END $$;

-- Create SECURITY DEFINER function to check if user is CEO/executive without causing recursion
-- This function bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_executive_role_safe(user_uuid UUID, exec_role TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    is_exec_result BOOLEAN;
BEGIN
    -- Use SECURITY DEFINER to bypass RLS when checking exec_users
    -- This prevents infinite recursion when policies call this function
    IF exec_role IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.exec_users 
            WHERE user_id = user_uuid AND role = exec_role
        ) INTO is_exec_result;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.exec_users 
            WHERE user_id = user_uuid
        ) INTO is_exec_result;
    END IF;
    
    RETURN COALESCE(is_exec_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for exec_users using email-based checks and SECURITY DEFINER functions
-- This prevents infinite recursion

-- Policy 1: Users can always view their own exec_users record
DROP POLICY IF EXISTS "users_view_own_exec_record" ON public.exec_users;
CREATE POLICY "users_view_own_exec_record"
  ON public.exec_users FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: CEO/executives can view all exec_users records
-- ONLY use email-based checks to avoid recursion
-- The SECURITY DEFINER function is available for use in other contexts, but not in this policy
DROP POLICY IF EXISTS "executives_view_all_exec_users" ON public.exec_users;
CREATE POLICY "executives_view_all_exec_users"
  ON public.exec_users FOR SELECT
  USING (
    -- Email-based checks only (no recursion)
    LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
    -- Note: We can't use is_executive_role_safe here because it would query exec_users
    -- during policy evaluation, causing recursion. Email-based checks are safe.
  );

-- Policy 3: Users can update their own record
DROP POLICY IF EXISTS "users_update_own_exec_record" ON public.exec_users;
CREATE POLICY "users_update_own_exec_record"
  ON public.exec_users FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: CEO can insert/delete exec_users records
-- Only use email-based checks to avoid recursion
DROP POLICY IF EXISTS "ceo_manage_exec_users" ON public.exec_users;
CREATE POLICY "ceo_manage_exec_users"
  ON public.exec_users FOR ALL
  USING (
    LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
  );

-- Ensure RLS is enabled
ALTER TABLE public.exec_users ENABLE ROW LEVEL SECURITY;

