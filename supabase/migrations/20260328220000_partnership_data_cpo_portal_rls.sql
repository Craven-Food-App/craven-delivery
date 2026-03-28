-- Partnership / renewal data: only CPO portal cohort (CPO, CEO, company admin, founder)
-- can read or write. Matches CPOPortal auth (not general executives).

CREATE OR REPLACE FUNCTION public.user_has_cpo_partnership_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      lower(coalesce(auth.jwt()->>'email', '')) = 'tstroman.ceo@cravenusa.com'
      OR EXISTS (
        SELECT 1 FROM public.exec_users eu
        WHERE eu.user_id = auth.uid()
          AND eu.role::text IN ('cpo', 'ceo')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
      )
    );
$$;

COMMENT ON FUNCTION public.user_has_cpo_partnership_access() IS
  'True for users who may use the CPO Partnership Portal (renewals, pipeline, contracts).';

GRANT EXECUTE ON FUNCTION public.user_has_cpo_partnership_access() TO authenticated;

-- ---------------------------------------------------------------------------
-- Core partnership tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "Authenticated users can insert partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "Authenticated users can update partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "Authenticated users can delete partnerships" ON public.partnerships;

CREATE POLICY "cpo_portal_access_partnerships"
  ON public.partnerships FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated users can view partnership_contacts" ON public.partnership_contacts;
DROP POLICY IF EXISTS "Authenticated users can manage partnership_contacts" ON public.partnership_contacts;

CREATE POLICY "cpo_portal_access_partnership_contacts"
  ON public.partnership_contacts FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated users can view partnership_activities" ON public.partnership_activities;
DROP POLICY IF EXISTS "Authenticated users can manage partnership_activities" ON public.partnership_activities;

CREATE POLICY "cpo_portal_access_partnership_activities"
  ON public.partnership_activities FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated users can view partnership_documents" ON public.partnership_documents;
DROP POLICY IF EXISTS "Authenticated users can manage partnership_documents" ON public.partnership_documents;

CREATE POLICY "cpo_portal_access_partnership_documents"
  ON public.partnership_documents FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated users can manage partnership_tasks" ON public.partnership_tasks;

CREATE POLICY "cpo_portal_access_partnership_tasks"
  ON public.partnership_tasks FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated can manage onboarding items" ON public.partnership_onboarding_items;

CREATE POLICY "cpo_portal_access_partnership_onboarding_items"
  ON public.partnership_onboarding_items FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

DROP POLICY IF EXISTS "Authenticated users can manage partnership_kpis" ON public.partnership_kpis;

CREATE POLICY "cpo_portal_access_partnership_kpis"
  ON public.partnership_kpis FOR ALL TO authenticated
  USING (public.user_has_cpo_partnership_access())
  WITH CHECK (public.user_has_cpo_partnership_access());

-- ---------------------------------------------------------------------------
-- Partnership document storage
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can upload partnership docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read partnership docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete partnership docs" ON storage.objects;

CREATE POLICY "cpo_portal_upload_partnership_storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partnership-documents'
    AND public.user_has_cpo_partnership_access()
  );

CREATE POLICY "cpo_portal_read_partnership_storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partnership-documents'
    AND public.user_has_cpo_partnership_access()
  );

CREATE POLICY "cpo_portal_delete_partnership_storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partnership-documents'
    AND public.user_has_cpo_partnership_access()
  );
