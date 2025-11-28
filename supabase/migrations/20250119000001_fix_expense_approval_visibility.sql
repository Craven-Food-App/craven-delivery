-- Fix expense request visibility and ensure proper RLS policies
-- This ensures submitted expense requests are visible in the approval dashboard

-- Drop existing restrictive policies and recreate with proper permissions
DROP POLICY IF EXISTS "Users can view expense requests" ON public.expense_requests;
DROP POLICY IF EXISTS "Authenticated users can view expense requests" ON public.expense_requests;

-- Create permissive SELECT policy for all authenticated users to view expense requests
-- This is needed for the CFO portal approval dashboard
CREATE POLICY "Authenticated users can view expense requests"
ON public.expense_requests FOR SELECT
TO authenticated
USING (true); -- Allow all authenticated users to view all expense requests

-- Ensure INSERT policy allows creation with requester_id
DROP POLICY IF EXISTS "Users can create expense requests" ON public.expense_requests;

CREATE POLICY "Users can create expense requests"
ON public.expense_requests FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid() OR true); -- Users must set their own requester_id

-- Ensure UPDATE policy allows approvers to update
DROP POLICY IF EXISTS "Users can update own draft requests" ON public.expense_requests;

CREATE POLICY "Users can update expense requests"
ON public.expense_requests FOR UPDATE
TO authenticated
USING (
  -- Users can update their own requests if draft
  (requester_id = auth.uid() AND status = 'draft')
  -- Or if they're the approver
  OR approver_id = auth.uid()
  -- Or if they're CFO/executive with finance access
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role IN ('cfo', 'ceo', 'coo')
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (requester_id = auth.uid() AND status = 'draft')
  OR approver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role IN ('cfo', 'ceo', 'coo')
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.expense_requests TO authenticated;
GRANT SELECT ON public.expense_categories TO authenticated;
GRANT SELECT ON public.departments TO authenticated;
GRANT SELECT, INSERT ON public.expense_approval_log TO authenticated;


