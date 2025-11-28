-- Fix expense workflow: Add missing RLS policy for expense_approval_log
-- This allows authenticated users to log expense approval actions

-- Add INSERT policy for expense_approval_log
CREATE POLICY "Users can create approval log entries"
ON public.expense_approval_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for expense_approval_log (for completeness)
CREATE POLICY "Users can update approval log entries"
ON public.expense_approval_log FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure requester_id is automatically set if not provided
CREATE OR REPLACE FUNCTION public.set_expense_requester()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set requester_id to current user if not already set
  IF NEW.requester_id IS NULL THEN
    NEW.requester_id := auth.uid();
  END IF;
  
  -- Set requested_date to now if not provided
  IF NEW.requested_date IS NULL THEN
    NEW.requested_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set requester (if not exists)
DROP TRIGGER IF EXISTS set_expense_requester_trigger ON public.expense_requests;
CREATE TRIGGER set_expense_requester_trigger
BEFORE INSERT ON public.expense_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_expense_requester();