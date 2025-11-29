-- Function to automatically mark sessions as inactive after 30 minutes of inactivity
CREATE OR REPLACE FUNCTION public.mark_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_activity_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run this function every minute
-- Note: This requires pg_cron extension. If not available, you can use a cron job or edge function instead.
-- For now, we'll rely on the client-side hook to handle this, but this function can be called manually or via edge function

-- Create index for efficient querying of inactive sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
ON public.user_sessions(last_activity_at) 
WHERE is_active = true;

-- Add comment
COMMENT ON FUNCTION public.mark_inactive_sessions IS 'Marks user sessions as inactive if last_activity_at is older than 30 minutes';

