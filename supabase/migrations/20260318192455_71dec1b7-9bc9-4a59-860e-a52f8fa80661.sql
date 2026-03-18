-- Allow executives (CPO, CEO) to view restaurant onboarding progress
CREATE POLICY "Executives can view onboarding progress"
ON public.restaurant_onboarding_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exec_users
    WHERE exec_users.user_id = auth.uid()
    AND exec_users.role IN ('cpo', 'ceo', 'coo')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'CRAVEN_EXECUTIVE'
  )
);