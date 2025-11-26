-- Grant CTO Portal Access to Executive Officers with CTO Role
-- This migration updates the has_permission function to automatically grant cto.view permission
-- to users who have role = 'cto' in the exec_users table

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  eff_allowed BOOLEAN;
BEGIN
  -- CEO gets EVERYTHING - absolute power
  SELECT EXISTS (
    SELECT 1 FROM public.exec_users eu
    WHERE eu.user_id = p_user_id AND eu.role ILIKE '%ceo%'
  ) INTO STRICT eff_allowed;
  IF eff_allowed THEN RETURN true; END IF;

  -- CTO gets cto.view permission automatically
  IF p_permission = 'cto.view' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cto%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- CFO gets finance.view permission automatically
  IF p_permission = 'finance.view' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cfo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- COO gets coo.view permission automatically
  IF p_permission = 'coo.view' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%coo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- Check effective_permissions materialized view
  SELECT COALESCE(ep.permissions -> p_permission, 'false'::jsonb)::boolean
  INTO eff_allowed
  FROM public.effective_permissions ep
  WHERE ep.user_id = p_user_id;

  IF eff_allowed IS NOT NULL THEN
    RETURN eff_allowed;
  END IF;

  -- Default deny
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ has_permission function updated successfully!';
  RAISE NOTICE '✅ Executive officers (CTO, CFO, COO) now automatically get their portal permissions';
  RAISE NOTICE '✅ Nathan Curry should now have access to the CTO Portal';
END $$;