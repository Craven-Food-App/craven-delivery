-- Fix other permissive RLS policies that use USING(true) or WITH CHECK(true)
-- These policies allow public access and need to be restricted

-- Note: This migration addresses the most critical tables
-- Some tables may intentionally allow public access (e.g., marketing assets)
-- Review each policy before applying restrictions

-- 1. Fix marketing_assets table (if it should be restricted)
-- Currently allows public SELECT - review if this is intentional
-- If marketing assets should be public, keep as is
-- If they should be restricted, uncomment below:

/*
DROP POLICY IF EXISTS "Public can view marketing assets" ON public.marketing_assets;

CREATE POLICY "Authenticated users can view marketing assets"
ON public.marketing_assets
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'marketing')
  )
);
*/

-- 2. Fix craver_applications SELECT policy
-- Check if the permissive policy exists and needs restriction
DO $$
BEGIN
  -- Check if permissive policy exists
  -- pg_policies.qual contains the USING clause, with_check contains WITH CHECK clause
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'craver_applications' 
    AND schemaname = 'public'
    AND cmd = 'SELECT'
    AND (qual LIKE '%USING (true)%' OR qual = 'true')
  ) THEN
    -- Drop permissive policy
    DROP POLICY IF EXISTS "Public can view applications" ON public.craver_applications;
    
    -- Note: craver_applications should already have proper RLS policies
    -- This is just a safety check
    RAISE NOTICE 'Checked craver_applications policies';
  END IF;
END $$;

-- 3. Add comment documenting the security review
COMMENT ON SCHEMA public IS 'Security Note: All tables should have appropriate RLS policies. Tables with USING(true) should be reviewed to ensure they are intentionally public or restricted appropriately.';

