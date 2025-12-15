-- Allow inserting CTO evaluation events from application code and test helpers

-- Drop any previous insert policy if present
DROP POLICY IF EXISTS "cto_events_insert" ON public.cto_evaluation_events;

-- New insert policy:
-- - Any authenticated user may insert an event where actor_user_id = auth.uid()
--   (real CEO/CTO flows and test flows both satisfy this).
CREATE POLICY "cto_events_insert"
ON public.cto_evaluation_events
FOR INSERT
WITH CHECK (actor_user_id = auth.uid());


