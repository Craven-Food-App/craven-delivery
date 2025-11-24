-- Initialize infrastructure services if they don't exist
-- This ensures the infrastructure table has entries for monitoring
-- The monitor-infrastructure Edge Function will update these with real data

INSERT INTO public.it_infrastructure (service_name, service_provider, status, uptime_percent, response_time_ms, last_check)
VALUES
  ('Database', 'Supabase Postgres', 'operational', 99.9, 25, now()),
  ('Storage', 'Supabase Storage', 'operational', 99.8, 60, now()),
  ('Authentication', 'Supabase Auth', 'operational', 99.9, 30, now()),
  ('API Gateway', 'Supabase', 'operational', 99.9, 45, now()),
  ('Realtime', 'Supabase Realtime', 'operational', 99.8, 50, now()),
  ('Edge Functions', 'Supabase Functions', 'operational', 99.9, 100, now()),
  ('Database Connections', 'Supabase Postgres', 'operational', 99.9, 0, now())
ON CONFLICT (service_name) DO UPDATE SET
  last_check = now();

-- Note: To set up automatic monitoring, create a cron job that calls:
-- POST https://[your-project].supabase.co/functions/v1/monitor-infrastructure
-- This can be done via Supabase Dashboard > Database > Cron Jobs

