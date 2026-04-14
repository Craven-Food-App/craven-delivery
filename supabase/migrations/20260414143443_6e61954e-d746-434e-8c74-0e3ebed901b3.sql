
-- Fix Markayla Danzy's employee record: wrong user_id pointing to CEO's account
UPDATE public.employees 
SET user_id = '2cd7af58-1e56-4859-8b69-d83da79821b1'
WHERE id = '7199bd74-7caa-4960-b846-e8d80331c479'
  AND user_id = '8829227c-cd71-459b-a0f6-9b0f0dcb6372';

-- Also update the clock_in function to prioritize exec_user_id for executives
-- so the CEO's name shows correctly (from exec_users, not employees)
CREATE OR REPLACE FUNCTION public.clock_in(p_user_id UUID, p_work_location TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_employee_id UUID;
  v_exec_user_id UUID;
BEGIN
  -- Auto-close any stale open entries older than 24 hours
  UPDATE public.time_entries
  SET 
    clock_out_at = clock_in_at + INTERVAL '8 hours',
    status = 'clocked_out',
    updated_at = now()
  WHERE user_id = p_user_id
    AND clock_out_at IS NULL
    AND status IN ('clocked_in', 'on_break')
    AND clock_in_at < now() - INTERVAL '24 hours';

  -- Check if user is already clocked in
  SELECT id INTO v_entry_id
  FROM public.time_entries
  WHERE user_id = p_user_id
    AND status = 'clocked_in'
    AND clock_out_at IS NULL
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'User is already clocked in';
  END IF;

  -- Look up exec_user_id first (executives take priority)
  SELECT id INTO v_exec_user_id
  FROM public.exec_users
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Only look up employee_id if not an executive
  IF v_exec_user_id IS NULL THEN
    SELECT id INTO v_employee_id
    FROM public.employees
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;

  -- Create new entry with the appropriate ID
  INSERT INTO public.time_entries (user_id, employee_id, exec_user_id, clock_in_at, status, work_location)
  VALUES (p_user_id, v_employee_id, v_exec_user_id, now(), 'clocked_in', p_work_location)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;
