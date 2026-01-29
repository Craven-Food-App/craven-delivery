-- Fix clock_in and clock_out to work with user_id (for both employees and executives)
-- Previous versions expected p_employee_id, but frontend calls with p_user_id
-- This version uses time_entries.user_id as the source of truth

-- Drop old versions first using DO block to handle multiple overloads
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all clock_in overloads
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'clock_in' 
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid || ' CASCADE';
  END LOOP;
  
  -- Drop all clock_out overloads
  FOR r IN 
    SELECT oid::regprocedure 
    FROM pg_proc 
    WHERE proname = 'clock_out' 
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid || ' CASCADE';
  END LOOP;
END $$;

-- 1. Create clock_in to accept p_user_id
CREATE OR REPLACE FUNCTION public.clock_in(p_user_id UUID, p_work_location TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Check if user is already clocked in (using user_id)
  IF EXISTS (
    SELECT 1 FROM public.time_entries 
    WHERE user_id = p_user_id 
    AND status = 'clocked_in'
    AND clock_out_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User is already clocked in';
  END IF;

  -- Create new clock-in entry using user_id
  INSERT INTO public.time_entries (user_id, clock_in_at, status, work_location)
  VALUES (p_user_id, now(), 'clocked_in', p_work_location)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create clock_out to accept p_user_id
CREATE OR REPLACE FUNCTION public.clock_out(p_user_id UUID, p_break_duration_minutes INTEGER DEFAULT 0)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Find active clock-in entry using user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.clock_in(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.clock_in IS
  'Clock in function that accepts user_id (works for both employees and executives). Uses time_entries.user_id as source of truth.';

COMMENT ON FUNCTION public.clock_out IS
  'Clock out function that accepts user_id (works for both employees and executives). Uses time_entries.user_id as source of truth.';

