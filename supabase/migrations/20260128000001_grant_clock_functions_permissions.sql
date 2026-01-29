-- Grant execute permissions for clock_in and clock_out functions
-- This ensures authenticated users can call these functions

-- Grant for clock_in (with optional work_location parameter)
GRANT EXECUTE ON FUNCTION public.clock_in(UUID, TEXT) TO authenticated;

-- Grant for clock_out (with optional break_duration_minutes parameter)  
GRANT EXECUTE ON FUNCTION public.clock_out(UUID, INTEGER) TO authenticated;

