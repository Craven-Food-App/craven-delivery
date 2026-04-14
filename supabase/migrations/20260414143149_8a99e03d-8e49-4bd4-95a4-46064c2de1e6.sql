
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

  -- Look up employee_id
  SELECT id INTO v_employee_id
  FROM public.employees
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Look up exec_user_id
  SELECT id INTO v_exec_user_id
  FROM public.exec_users
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Create new entry with the appropriate ID
  INSERT INTO public.time_entries (user_id, employee_id, exec_user_id, clock_in_at, status, work_location)
  VALUES (p_user_id, v_employee_id, v_exec_user_id, now(), 'clocked_in', p_work_location)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;
