-- Ensure get_daily_uptime_percentage function exists
-- This function calculates daily uptime percentage from mobile_app_uptime_downtime table
-- Returns default values if table doesn't exist or has no data

CREATE OR REPLACE FUNCTION public.get_daily_uptime_percentage(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_seconds BIGINT,
  online_seconds BIGINT,
  uptime_percentage DECIMAL(5, 2)
) AS $$
BEGIN
  -- Try to calculate from table, return default if table doesn't exist or has no data
  BEGIN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 0) as total_seconds,
      COALESCE(SUM(CASE WHEN status = 'online' THEN EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT ELSE 0 END), 0) as online_seconds,
      CASE 
        WHEN COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 0) > 0
        THEN ROUND(
          (COALESCE(SUM(CASE WHEN status = 'online' THEN EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT ELSE 0 END), 0)::DECIMAL / 
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 1)) * 100, 
          2
        )
        ELSE 100.00
      END as uptime_percentage
    FROM mobile_app_uptime_downtime
    WHERE DATE(start_time) = target_date;
    
    -- If no rows returned, return default values
    IF NOT FOUND THEN
      RETURN QUERY SELECT 86400::BIGINT, 86400::BIGINT, 100.00::DECIMAL(5, 2);
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, return default values
      RETURN QUERY SELECT 86400::BIGINT, 86400::BIGINT, 100.00::DECIMAL(5, 2);
    WHEN OTHERS THEN
      -- Any other error, return default values
      RETURN QUERY SELECT 86400::BIGINT, 86400::BIGINT, 100.00::DECIMAL(5, 2);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_uptime_percentage(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_uptime_percentage() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_daily_uptime_percentage(DATE) IS 'Calculates daily uptime percentage from mobile_app_uptime_downtime table for a given date. Returns default 100% if no data exists.';

