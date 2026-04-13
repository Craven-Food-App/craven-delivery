
-- Step 1: Close ALL stale open entries (older than 24 hours)
UPDATE public.time_entries
SET 
  clock_out_at = clock_in_at + INTERVAL '8 hours',
  status = 'clocked_out',
  updated_at = now()
WHERE clock_out_at IS NULL
  AND status IN ('clocked_in', 'on_break')
  AND clock_in_at < now() - INTERVAL '24 hours';

-- Step 2: Replace clock_in to auto-close stale entries first
CREATE OR REPLACE FUNCTION public.clock_in(p_user_id UUID, p_work_location TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
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

  -- Check if user is already clocked in (recent entry)
  SELECT id INTO v_entry_id
  FROM public.time_entries
  WHERE user_id = p_user_id
    AND status = 'clocked_in'
    AND clock_out_at IS NULL
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'User is already clocked in';
  END IF;

  -- Create new entry
  INSERT INTO public.time_entries (user_id, clock_in_at, status, work_location)
  VALUES (p_user_id, now(), 'clocked_in', p_work_location)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- Step 3: Replace clock_out to auto-close stale entries first
CREATE OR REPLACE FUNCTION public.clock_out(p_user_id UUID, p_break_duration_minutes INTEGER DEFAULT 0)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
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

  -- Find active clock-in entry (recent only)
  SELECT id INTO v_entry_id
  FROM public.time_entries
  WHERE user_id = p_user_id
    AND status IN ('clocked_in', 'on_break')
    AND clock_out_at IS NULL
  ORDER BY clock_in_at DESC
  LIMIT 1;

  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'No active clock-in found';
  END IF;

  -- Update entry with clock-out time
  UPDATE public.time_entries
  SET 
    clock_out_at = now(),
    status = 'clocked_out',
    break_duration_minutes = p_break_duration_minutes,
    updated_at = now()
  WHERE id = v_entry_id;

  RETURN v_entry_id;
END;
$$;
