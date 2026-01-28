-- Fix get_employee_clock_status to work for both employees and executives
-- Previous version only looked up entries via employees.employee_id, which
-- breaks for executive users whose time_entries are linked by user_id/exec_user_id.
-- This version uses time_entries.user_id as the single source of truth.

CREATE OR REPLACE FUNCTION public.get_employee_clock_status(p_user_id UUID)
RETURNS TABLE (
  is_clocked_in BOOLEAN,
  current_entry_id UUID,
  clock_in_time TIMESTAMPTZ,
  total_hours_today NUMERIC(5, 2),
  weekly_hours NUMERIC(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Is there an open clock-in for this user?
    EXISTS (
      SELECT 1 
      FROM public.time_entries te1
      WHERE te1.user_id = p_user_id
        AND te1.status = 'clocked_in'
        AND te1.clock_out_at IS NULL
    ) AS is_clocked_in,
    -- Current open entry id (if any)
    (
      SELECT te2.id
      FROM public.time_entries te2
      WHERE te2.user_id = p_user_id
        AND te2.status = 'clocked_in'
        AND te2.clock_out_at IS NULL
      ORDER BY te2.clock_in_at DESC
      LIMIT 1
    ) AS current_entry_id,
    -- Clock-in timestamp for the current open entry
    (
      SELECT te3.clock_in_at
      FROM public.time_entries te3
      WHERE te3.user_id = p_user_id
        AND te3.status = 'clocked_in'
        AND te3.clock_out_at IS NULL
      ORDER BY te3.clock_in_at DESC
      LIMIT 1
    ) AS clock_in_time,
    -- Total hours today (only completed entries)
    COALESCE((
      SELECT SUM(te4.total_hours)
      FROM public.time_entries te4
      WHERE te4.user_id = p_user_id
        AND DATE(te4.clock_in_at) = CURRENT_DATE
        AND te4.clock_out_at IS NOT NULL
    ), 0) AS total_hours_today,
    -- Weekly hours (only completed entries)
    COALESCE((
      SELECT SUM(te5.total_hours)
      FROM public.time_entries te5
      WHERE te5.user_id = p_user_id
        AND te5.clock_in_at >= date_trunc('week', CURRENT_DATE)
        AND te5.clock_out_at IS NOT NULL
    ), 0) AS weekly_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_employee_clock_status IS
  'Returns current clock status for the given auth user_id using time_entries.user_id as the source of truth. Works for both employees and executives.';


