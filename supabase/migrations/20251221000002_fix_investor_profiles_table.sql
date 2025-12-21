-- Fix investor_profiles table structure and ensure all columns exist
-- This migration ensures the table is properly set up with all required columns

-- Ensure investor_profiles table exists
CREATE TABLE IF NOT EXISTS investor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_status TEXT NOT NULL DEFAULT 'none' CHECK (access_status IN ('none', 'pending', 'approved', 'rejected')),
  accreditation_status TEXT CHECK (accreditation_status IN ('accredited', 'non_accredited', 'prefer_not_to_say')),
  accreditation_self_certified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist (idempotent)
DO $$ 
BEGIN
  -- Add accreditation_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_profiles' 
    AND column_name = 'accreditation_status'
  ) THEN
    ALTER TABLE investor_profiles 
    ADD COLUMN accreditation_status TEXT CHECK (accreditation_status IN ('accredited', 'non_accredited', 'prefer_not_to_say'));
  END IF;

  -- Add accreditation_self_certified_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_profiles' 
    AND column_name = 'accreditation_self_certified_at'
  ) THEN
    ALTER TABLE investor_profiles 
    ADD COLUMN accreditation_self_certified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure is_admin() function exists and can bypass RLS
-- This function is used to check admin status without causing infinite recursion
-- SECURITY DEFINER functions run with the privileges of the function owner (postgres)
-- which should bypass RLS, but we'll also try to avoid recursion by using a simpler check
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_result BOOLEAN;
BEGIN
    -- Use SECURITY DEFINER to bypass RLS when checking user_roles
    -- This prevents infinite recursion when policies call this function
    -- The function runs as the owner (postgres), which should bypass RLS
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    ) INTO is_admin_result;
    
    RETURN COALESCE(is_admin_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user is CEO/CFO in exec_users without causing recursion
-- This function bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_executive_role(user_uuid UUID, exec_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_exec_result BOOLEAN;
BEGIN
    -- Use SECURITY DEFINER to bypass RLS when checking exec_users
    -- This prevents infinite recursion when policies call this function
    -- The function runs as the owner (postgres), which should bypass RLS
    SELECT EXISTS (
        SELECT 1 FROM public.exec_users 
        WHERE user_id = user_uuid AND role = exec_role
    ) INTO is_exec_result;
    
    RETURN COALESCE(is_exec_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own investor profile" ON investor_profiles;
DROP POLICY IF EXISTS "Users can insert their own investor profile" ON investor_profiles;
DROP POLICY IF EXISTS "Users can update their own investor profile" ON investor_profiles;
DROP POLICY IF EXISTS "Admins can view all investor profiles" ON investor_profiles;
DROP POLICY IF EXISTS "Admins can update all investor profiles" ON investor_profiles;

-- Recreate RLS Policies for investor_profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own investor profile"
  ON investor_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own investor profile"
  ON investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update their own investor profile"
  ON investor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
-- Use SECURITY DEFINER functions to avoid infinite recursion
-- Never query exec_users or user_roles directly in policies
CREATE POLICY "Admins can view all investor profiles"
  ON investor_profiles FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
    OR public.is_executive_role(auth.uid(), 'ceo')
    OR public.is_executive_role(auth.uid(), 'cfo')
  );

-- Admins can update all profiles
-- Use SECURITY DEFINER functions to avoid infinite recursion
-- Never query exec_users or user_roles directly in policies
CREATE POLICY "Admins can update all investor profiles"
  ON investor_profiles FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
    OR public.is_executive_role(auth.uid(), 'ceo')
    OR public.is_executive_role(auth.uid(), 'cfo')
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS investor_profiles_updated_at ON investor_profiles;
CREATE TRIGGER investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_profiles_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_access_status ON investor_profiles(access_status);

-- Fix investment_opportunities RLS policies to prevent infinite recursion
-- Drop existing policies that query user_roles directly
DROP POLICY IF EXISTS "Admins can manage investment opportunities" ON public.investment_opportunities;

-- Recreate policy using SECURITY DEFINER functions to avoid recursion
CREATE POLICY "Admins can manage investment opportunities"
  ON public.investment_opportunities FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
    OR public.is_executive_role(auth.uid(), 'ceo')
    OR public.is_executive_role(auth.uid(), 'cfo')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR LOWER(auth.jwt()->>'email') IN ('craven@usa.com', 'tstroman.ceo@cravenusa.com')
    OR public.is_executive_role(auth.uid(), 'ceo')
    OR public.is_executive_role(auth.uid(), 'cfo')
  );

-- Ensure investors can view active opportunities
-- This policy should already exist, but let's make sure it's correct
DROP POLICY IF EXISTS "Anyone can view active investment opportunities" ON public.investment_opportunities;
CREATE POLICY "Anyone can view active investment opportunities"
  ON public.investment_opportunities FOR SELECT
  USING (is_active = true);

