# How to Set Up Tech Cost Monitor Cron Job

## Method 1: Supabase Dashboard (EASIEST - RECOMMENDED)

1. **Go to Supabase Dashboard** → Your Project
2. **Navigate to**: Database → Cron Jobs (or Database → Extensions → pg_cron)
3. **Click "New Cron Job"** or "Schedule a new cron job"
4. **Fill in:**
   - **Name**: `tech-cost-monitor-daily`
   - **Schedule**: `0 9 * * *` (runs daily at 9 AM UTC)
   - **Command**: 
   ```sql
   SELECT
     net.http_post(
       url := 'https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/tech-cost-monitor',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       ),
       body := '{}'::jsonb
     );
   ```
5. **Click "Save"**

## Method 2: SQL Editor (If Dashboard doesn't work)

Run this in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily cost monitor (9 AM UTC)
SELECT cron.schedule(
  'tech-cost-monitor-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/tech-cost-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule weekly optimization (Mondays 10 AM UTC)
SELECT cron.schedule(
  'tech-cost-optimize-weekly',
  '0 10 * * 1',
  $$
  SELECT
    net.http_post(
      url := 'https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/tech-cost-optimize',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

**Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key from:**
- Supabase Dashboard → Settings → API → `service_role` key (secret)

## Method 3: Manual Test (Verify it works first)

Test the function manually:

```sql
-- Test the function directly
SELECT supabase.functions.invoke(
  'tech-cost-monitor',
  'POST',
  '{}'::jsonb
);
```

## Verify Cron Jobs Are Running

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'tech-cost-monitor-daily')
ORDER BY start_time DESC
LIMIT 10;
```

## To Remove/Unschedule

```sql
SELECT cron.unschedule('tech-cost-monitor-daily');
SELECT cron.unschedule('tech-cost-optimize-weekly');
```

## Troubleshooting

- **If pg_cron extension not available**: Upgrade your Supabase plan (pg_cron requires Pro plan or higher)
- **If http/net functions fail**: Check that `pg_net` extension is enabled
- **If 401 errors**: Verify your service role key is correct
- **If function not found**: Make sure you've deployed the edge function: `supabase functions deploy tech-cost-monitor`

