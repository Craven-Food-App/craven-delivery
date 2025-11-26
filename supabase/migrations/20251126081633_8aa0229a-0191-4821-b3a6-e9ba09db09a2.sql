-- Add CFO-specific permissions to has_permission function
-- CFOs automatically get access to executives and leadership tabs in Company Portal

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
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

  -- CFO gets company.executives.view permission automatically
  IF p_permission = 'company.executives.view' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cfo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

  -- CFO gets company.leadership.view permission automatically
  IF p_permission = 'company.leadership.view' THEN
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
$$;

-- Insert permission definitions for company portal tabs
INSERT INTO permissions (key, label, module, description)
VALUES 
  ('company.executives.view', 'View Executives Tab', 'company', 'Access to Company Portal Executives section'),
  ('company.leadership.view', 'View Leadership Tab', 'company', 'Access to Company Portal Leadership section')
ON CONFLICT (key) DO NOTHING;

-- Remove CRAVEN_EXECUTIVE role from Justin Sweet (CFO)
-- He should only have CFO-specific access, not full executive access
DELETE FROM user_roles 
WHERE user_id = '5a259c29-8cdd-4569-9a3c-4f7481f1b441' 
AND role = 'CRAVEN_EXECUTIVE';