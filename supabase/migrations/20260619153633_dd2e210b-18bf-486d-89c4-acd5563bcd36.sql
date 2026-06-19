DROP POLICY IF EXISTS "View stops if can view job" ON public.cx_job_stops;

CREATE POLICY "View stops if can view job"
  ON public.cx_job_stops
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cx_jobs j
      WHERE j.id = cx_job_stops.job_id
        AND (
          public.user_owns_courier_restaurant(auth.uid(), j.courier_restaurant_id)
          OR j.assigned_driver_id = auth.uid()
          OR public.is_cx_admin(auth.uid())
          OR (
            j.assigned_driver_id IS NULL
            AND j.status IN ('posted'::public.cx_job_status, 'offered'::public.cx_job_status)
          )
        )
    )
  );