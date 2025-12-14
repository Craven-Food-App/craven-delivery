-- Fix permissive RLS policies that allow unauthorized access
-- This migration restricts access to sensitive tables

-- 1. Fix executive_accountability_system - EAS documents should only be viewable by executives
DROP POLICY IF EXISTS "Executives can view EAS documents" ON public.eas_documents;

CREATE POLICY "Executives can view EAS documents"
ON public.eas_documents FOR SELECT
TO authenticated
USING (
  -- Only executives (CEO, CFO, COO, CTO, CXO) can view
  EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo', 'coo', 'cto', 'cxo')
  )
  OR
  -- Admins can also view
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 2. Fix enterprise_finance_portal - Finance roles/permissions should be restricted
DROP POLICY IF EXISTS "Authenticated users can view finance roles" ON public.finance_roles;
DROP POLICY IF EXISTS "Authenticated users can view finance permissions" ON public.finance_permissions;

-- Only users with finance roles can view finance roles
CREATE POLICY "Finance users can view finance roles"
ON public.finance_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.finance_user_roles
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Only users with finance roles can view finance permissions
CREATE POLICY "Finance users can view finance permissions"
ON public.finance_permissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.finance_user_roles
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 3. Fix finance_audit_system - Audit trail inserts should be restricted
-- Note: Audit trails are typically inserted by triggers/functions using service role
-- This policy allows authenticated users, but ideally should be service role only
-- However, restricting too much might break legitimate audit logging
-- For now, we'll restrict to authenticated users with appropriate roles

DROP POLICY IF EXISTS "system_can_insert_audit_trail" ON public.audit_trail;

-- Allow inserts from:
-- 1. Service role (via functions/triggers) - handled by SECURITY DEFINER functions
-- 2. Authenticated users with finance/admin roles
CREATE POLICY "Authorized users can insert audit trail"
ON public.audit_trail FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.finance_user_roles
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo')
  )
);

-- 4. Fix craver_applications - Check if permissive SELECT policy exists
-- Note: restaurants table having USING(true) is intentional (public listings)
-- But craver_applications should be restricted

DO $$
BEGIN
  -- Check if permissive policy exists on craver_applications
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'craver_applications' 
    AND cmd = 'SELECT'
    AND (qual LIKE '%USING (true)%' OR qual = 'true')
  ) THEN
    -- Drop any permissive SELECT policies
    DROP POLICY IF EXISTS "Public can view applications" ON public.craver_applications;
    DROP POLICY IF EXISTS "Applications are viewable by everyone" ON public.craver_applications;
    
    -- Note: craver_applications should already have proper policies
    -- This is just a safety check to remove any permissive ones
    RAISE NOTICE 'Checked and cleaned craver_applications policies';
  END IF;
END $$;

-- Add security comments
COMMENT ON TABLE public.eas_documents IS 'Executive Accountability System documents. Restricted to executives and admins only.';
COMMENT ON TABLE public.finance_roles IS 'Finance roles. Restricted to users with finance access or admins.';
COMMENT ON TABLE public.audit_trail IS 'Audit trail. Inserts restricted to authorized roles. Service role can insert via SECURITY DEFINER functions.';

