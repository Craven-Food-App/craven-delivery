-- Enable realtime for user_sessions and user_activity_log tables
-- This allows zero-delay updates in the Active Users Monitor

-- Set REPLICA IDENTITY to FULL for realtime to work properly
ALTER TABLE IF EXISTS public.user_sessions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.user_activity_log REPLICA IDENTITY FULL;

-- Add tables to realtime publication for instant updates
DO $$
BEGIN
  -- Add user_sessions to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
  END IF;

  -- Add user_activity_log to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_log;
  END IF;
END $$;




