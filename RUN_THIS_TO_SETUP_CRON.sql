-- Step 1: Enable the extensions (run this first)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Schedule the daily cost monitor (runs at 9 AM UTC every day)
SELECT cron.schedule(
  'tech-cost-monitor-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/tech-cost-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI4MzI4MCwiZXhwIjoyMDcyODU5MjgwfQ.jpot4IKXw7s5Yq3SzcoWojKZ2id87T39CmE3hnQSbCQ'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Step 3: Verify it was created
SELECT * FROM cron.job WHERE jobname = 'tech-cost-monitor-daily';

-- That's it! The cron job is now scheduled.

