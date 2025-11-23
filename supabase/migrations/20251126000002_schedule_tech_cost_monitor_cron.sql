-- Schedule Tech Cost Monitor Cron Job
-- NOTE: This migration enables extensions. Actual cron scheduling should be done via:
-- 1. Supabase Dashboard → Database → Cron Jobs (RECOMMENDED)
-- 2. OR run the SQL commands in SETUP_TECH_COST_CRON.md manually

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- IMPORTANT: To actually schedule the cron jobs, see SETUP_TECH_COST_CRON.md
-- The dashboard method is recommended as it handles authentication automatically.

-- Example SQL commands (run these in SQL Editor after getting your service_role key):
-- 
-- SELECT cron.schedule(
--   'tech-cost-monitor-daily',
--   '0 9 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/tech-cost-monitor',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

