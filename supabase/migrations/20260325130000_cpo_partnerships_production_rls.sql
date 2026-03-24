-- CPO / partnerships: missing DELETE policy (deletes were blocked by RLS) + query indexes

-- DELETE was never granted — PartnerPipeline.deletePartnership() failed under RLS
DROP POLICY IF EXISTS "Authenticated users can delete partnerships" ON public.partnerships;
CREATE POLICY "Authenticated users can delete partnerships"
  ON public.partnerships FOR DELETE TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_partnerships_status ON public.partnerships (status);
CREATE INDEX IF NOT EXISTS idx_partnerships_updated_at ON public.partnerships (updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_partnership_tasks_partnership_id ON public.partnership_tasks (partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_activities_partnership_id ON public.partnership_activities (partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_contacts_partnership_id ON public.partnership_contacts (partnership_id);
