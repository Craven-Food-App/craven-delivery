-- IMMEDIATE FIX: Clock Out Error Resolution
-- Run this directly in Supabase SQL Editor
-- 
-- ERROR: numeric field overflow
-- CAUSE: total_hours column NUMERIC(5,2) can't handle 1000+ hours (43+ days)
-- FIX: Expand to NUMERIC(10,2) and grant permissions

-- 1. Expand total_hours column precision
ALTER TABLE public.time_entries 
DROP COLUMN total_hours;

ALTER TABLE public.time_entries
ADD COLUMN total_hours NUMERIC(10, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN clock_out_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 3600.0 - (break_duration_minutes::NUMERIC / 60.0)
    ELSE NULL
  END
) STORED;

-- 2. Grant permissions for clock functions (if not already granted)
GRANT EXECUTE ON FUNCTION public.clock_in(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out(UUID, INTEGER) TO authenticated;

-- 3. Update get_employee_clock_status function return types
CREATE OR REPLACE FUNCTION public.get_employee_clock_status(p_employee_id UUID)
RETURNS TABLE (
  is_clocked_in BOOLEAN,
  current_entry_id UUID,
  clock_in_at TIMESTAMP WITH TIME ZONE,
  total_hours_today NUMERIC(10, 2),
  weekly_hours NUMERIC(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM public.time_entries te1
      WHERE te1.employee_id = p_employee_id 
      AND te1.status = 'clocked_in' 
      AND te1.clock_out_at IS NULL
    ) AS is_clocked_in,
    (SELECT te2.id FROM public.time_entries te2
     WHERE te2.employee_id = p_employee_id 
     AND te2.status = 'clocked_in' 
     AND te2.clock_out_at IS NULL 
     ORDER BY te2.clock_in_at DESC LIMIT 1) AS current_entry_id,
    (SELECT te3.clock_in_at FROM public.time_entries te3
     WHERE te3.employee_id = p_employee_id 
     AND te3.status = 'clocked_in' 
     AND te3.clock_out_at IS NULL 
     ORDER BY te3.clock_in_at DESC LIMIT 1) AS clock_in_at,
    COALESCE((
      SELECT SUM(te4.total_hours) 
      FROM public.time_entries te4
      WHERE te4.employee_id = p_employee_id 
      AND DATE(te4.clock_in_at) = CURRENT_DATE
      AND te4.clock_out_at IS NOT NULL
    ), 0) AS total_hours_today,
    COALESCE((
      SELECT SUM(te5.total_hours) 
      FROM public.time_entries te5
      WHERE te5.employee_id = p_employee_id 
      AND te5.clock_in_at >= date_trunc('week', CURRENT_DATE)
      AND te5.clock_out_at IS NOT NULL
    ), 0) AS weekly_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VERIFICATION: Check the fix worked
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'time_entries' AND column_name = 'total_hours';

-- Should show: NUMERIC(10, 2) instead of NUMERIC(5, 2)

