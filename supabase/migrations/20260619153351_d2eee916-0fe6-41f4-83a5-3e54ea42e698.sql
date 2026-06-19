GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_jobs TO authenticated;
GRANT ALL ON public.cx_jobs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_job_stops TO authenticated;
GRANT ALL ON public.cx_job_stops TO service_role;

GRANT SELECT, INSERT ON public.cx_job_events TO authenticated;
GRANT ALL ON public.cx_job_events TO service_role;

DROP POLICY IF EXISTS "Drivers view assigned/offered jobs" ON public.cx_jobs;

CREATE POLICY "Drivers view assigned/offered jobs"
  ON public.cx_jobs
  FOR SELECT
  TO authenticated
  USING (
    assigned_driver_id = auth.uid()
    OR (
      assigned_driver_id IS NULL
      AND status IN ('posted'::public.cx_job_status, 'offered'::public.cx_job_status)
    )
  );