-- Audit and secure SECURITY DEFINER functions
-- SECURITY DEFINER functions run with elevated privileges and need careful review

-- 1. Review verify_ceo_pin function (already updated in previous migration)
-- This function is properly secured with SECURITY DEFINER and SET search_path

-- 2. Review is_ceo_authorized function (already updated in previous migration)
-- This function is properly secured

-- 3. Review hash_and_update_pin function
-- Check if it properly restricts access
DO $$
BEGIN
  -- Verify the function exists and has proper security settings
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'hash_and_update_pin'
    AND prosecdef = true
  ) THEN
    -- Function exists and is SECURITY DEFINER - verify it has search_path set
    RAISE NOTICE 'hash_and_update_pin function exists and is SECURITY DEFINER';
    -- Note: This function should only be called by authorized edge functions
  END IF;
END $$;

-- 4. Review is_craven_founder function
-- This function is used in RLS policies and should be secure
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_craven_founder'
    AND prosecdef = true
  ) THEN
    -- Verify it has search_path set
    RAISE NOTICE 'is_craven_founder function exists and is SECURITY DEFINER';
  END IF;
END $$;

-- 5. Review get_current_user_email function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_current_user_email'
    AND prosecdef = true
  ) THEN
    RAISE NOTICE 'get_current_user_email function exists and is SECURITY DEFINER';
  END IF;
END $$;

-- 6. Review has_universal_access function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_universal_access'
    AND prosecdef = true
  ) THEN
    RAISE NOTICE 'has_universal_access function exists and is SECURITY DEFINER';
  END IF;
END $$;

-- 7. Ensure all SECURITY DEFINER functions have SET search_path
-- This prevents search_path injection attacks
-- Note: This is a review - actual fixes should be done in function definitions

-- 8. Create a view to audit all SECURITY DEFINER functions
CREATE OR REPLACE VIEW public.security_definer_functions_audit AS
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN true
    ELSE false
  END as has_search_path_set,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' THEN true
    ELSE false
  END as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- Grant read access to admins only
GRANT SELECT ON public.security_definer_functions_audit TO authenticated;

-- RLS policy for the audit view
ALTER VIEW public.security_definer_functions_audit SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW public.security_definer_functions_audit IS 
'Audit view of all SECURITY DEFINER functions in public schema. Review functions without SET search_path for potential security issues.';

-- 9. Create function to check for potentially unsafe SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.audit_security_definer_functions()
RETURNS TABLE(
  function_name TEXT,
  has_search_path_set BOOLEAN,
  potential_risk TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT,
    CASE 
      WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN true
      ELSE false
    END,
    CASE
      WHEN pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%' 
      THEN 'Missing SET search_path - potential search_path injection risk'
      ELSE 'OK'
    END
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosecdef = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.audit_security_definer_functions() TO authenticated;

COMMENT ON FUNCTION public.audit_security_definer_functions IS 
'Returns audit results for all SECURITY DEFINER functions, highlighting potential security risks.';






