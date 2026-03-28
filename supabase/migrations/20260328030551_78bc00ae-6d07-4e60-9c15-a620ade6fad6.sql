-- Fix infinite recursion in internal_messages RLS policy
DROP POLICY IF EXISTS "Users can read their messages" ON public.internal_messages;

-- Create a security definer function to check thread participation (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_root_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal_messages
    WHERE id = _thread_root_id
      AND (sender_id = _user_id OR _user_id = ANY(COALESCE(recipient_ids, ARRAY[]::uuid[])))
  )
$$;

-- Recreate the policy using the function instead of a subquery
CREATE POLICY "Users can read their messages"
ON public.internal_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR auth.uid() = ANY(recipient_ids)
  OR (thread_root_id IS NOT NULL AND public.is_thread_participant(thread_root_id, auth.uid()))
);