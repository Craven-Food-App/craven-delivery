-- Update has_permission to give CFO FULL access to all cfo.* and finance.* permissions
-- This ensures Justin Sweet can do everything within the CFO portal without restriction

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  eff_allowed BOOLEAN;
  user_role TEXT;
BEGIN
  -- CEO gets EVERYTHING - absolute power
  SELECT eu.role INTO user_role
  FROM public.exec_users eu
  WHERE eu.user_id = p_user_id AND eu.role ILIKE '%ceo%'
  LIMIT 1;
  IF user_role IS NOT NULL THEN RETURN true; END IF;

  -- CFO gets ALL cfo.*, finance.*, company.executives.view, company.leadership.view permissions
  -- This gives the CFO unrestricted access within the CFO portal
  IF p_permission LIKE 'cfo.%' 
     OR p_permission LIKE 'finance.%'
     OR p_permission = 'company.executives.view'
     OR p_permission = 'company.leadership.view'
  THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cfo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- CTO gets cto.view permission automatically
  IF p_permission LIKE 'cto.%' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cto%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- COO gets coo.* permissions automatically
  IF p_permission LIKE 'coo.%' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%coo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- Check effective_permissions materialized view (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'effective_permissions') THEN
    SELECT COALESCE(ep.permissions -> p_permission, 'false'::jsonb)::boolean
    INTO eff_allowed
    FROM public.effective_permissions ep
    WHERE ep.user_id = p_user_id;

    IF eff_allowed IS NOT NULL THEN
      RETURN eff_allowed;
    END IF;
  END IF;

  -- Default deny
  RETURN false;
END;
$function$;