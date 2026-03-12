-- Allow anonymous (public) inserts into job_applicants for career site applications.
-- HR views applications via TalentLens in the HR Portal (authenticated).

-- Ensure anon can insert
GRANT INSERT ON public.job_applicants TO anon;

-- If RLS is enabled, add policy for public career applications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_applicants'
  ) THEN
    ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;

    -- Drop if exists to make migration idempotent
    DROP POLICY IF EXISTS "job_applicants_anon_insert" ON public.job_applicants;
    CREATE POLICY "job_applicants_anon_insert"
      ON public.job_applicants
      FOR INSERT
      TO anon
      WITH CHECK (true);

    -- Ensure authenticated and service_role can read (for HR portal)
    DROP POLICY IF EXISTS "job_applicants_authenticated_select" ON public.job_applicants;
    CREATE POLICY "job_applicants_authenticated_select"
      ON public.job_applicants
      FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "job_applicants_service_select" ON public.job_applicants;
    CREATE POLICY "job_applicants_service_select"
      ON public.job_applicants
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;
