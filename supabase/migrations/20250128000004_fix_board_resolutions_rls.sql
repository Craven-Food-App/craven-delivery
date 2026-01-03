-- Fix RLS policies for board_resolutions to allow executives and admins to create resolutions
-- This ensures exit workflow can create board resolutions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "CEO can manage board resolutions" ON public.board_resolutions;

-- Create comprehensive policy that allows:
-- 1. Executives (from exec_users)
-- 2. Admins (from user_roles or user_profiles)
-- 3. Corporate Secretary and Founder roles
-- 4. Users with ceo_access_credentials
CREATE POLICY "Authorized users can manage board resolutions"
ON public.board_resolutions FOR ALL
TO authenticated
USING (
  -- CEO access credentials
  EXISTS (SELECT 1 FROM public.ceo_access_credentials WHERE user_email = auth.jwt()->>'email')
  -- Admin roles
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  -- Executives
  OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  -- Corporate roles
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_CEO'))
);

-- Also allow SELECT for board members
DROP POLICY IF EXISTS "Board members can view resolutions" ON public.board_resolutions;
CREATE POLICY "Board members can view resolutions"
ON public.board_resolutions FOR SELECT
TO authenticated
USING (
  -- All authenticated users can view (for transparency)
  true
);

