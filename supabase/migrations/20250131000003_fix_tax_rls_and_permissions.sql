-- Fix tax tables RLS policies and has_permission function
-- This migration fixes access issues for tax_estimates, tax_credits, and tax_calendar

-- First, update has_permission function to handle cfo.view permission
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

  -- CFO gets cfo.view permission automatically
  IF p_permission = 'cfo.view' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exec_users eu
      WHERE eu.user_id = p_user_id AND eu.role ILIKE '%cfo%'
    ) INTO eff_allowed;
    IF eff_allowed THEN RETURN true; END IF;
  END IF;

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
$$;

-- Drop existing tax table policies to recreate them
DROP POLICY IF EXISTS "CFO can view tax_estimates" ON public.tax_estimates;
DROP POLICY IF EXISTS "CFO can manage tax_estimates" ON public.tax_estimates;
DROP POLICY IF EXISTS "CFO can view tax_calendar" ON public.tax_calendar;
DROP POLICY IF EXISTS "CFO can manage tax_calendar" ON public.tax_calendar;
DROP POLICY IF EXISTS "CFO can view tax_credits" ON public.tax_credits;
DROP POLICY IF EXISTS "CFO can manage tax_credits" ON public.tax_credits;

-- Recreate policies with better access control
-- Allow CFO, CEO, and admins to access tax tables
CREATE POLICY "CFO and executives can view tax_estimates"
  ON public.tax_estimates FOR SELECT
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

CREATE POLICY "CFO and executives can manage tax_estimates"
  ON public.tax_estimates FOR ALL
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  )
  WITH CHECK (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

CREATE POLICY "CFO and executives can view tax_calendar"
  ON public.tax_calendar FOR SELECT
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

CREATE POLICY "CFO and executives can manage tax_calendar"
  ON public.tax_calendar FOR ALL
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  )
  WITH CHECK (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

CREATE POLICY "CFO and executives can view tax_credits"
  ON public.tax_credits FOR SELECT
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

CREATE POLICY "CFO and executives can manage tax_credits"
  ON public.tax_credits FOR ALL
  TO authenticated
  USING (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  )
  WITH CHECK (
    has_permission(auth.uid(), 'cfo.view')
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo', 'cfo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

