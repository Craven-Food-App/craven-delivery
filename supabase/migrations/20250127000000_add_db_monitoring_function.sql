-- Database monitoring function for real connection counts
-- This enables the early warning system to use real database metrics

CREATE OR REPLACE FUNCTION get_db_connection_count()
RETURNS INTEGER AS $$
DECLARE
  connection_count INTEGER;
BEGIN
  -- Get actual active connection count from pg_stat_activity
  SELECT COUNT(*) INTO connection_count
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND state = 'active'
    AND pid != pg_backend_pid();
  
  RETURN COALESCE(connection_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_db_connection_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_connection_count() TO service_role;

COMMENT ON FUNCTION get_db_connection_count() IS 'Returns the current number of active database connections (excluding the current connection)';

