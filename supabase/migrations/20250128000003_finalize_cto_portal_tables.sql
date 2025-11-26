-- Final CTO Portal Migration - Ensures all tables exist and are properly configured
-- This migration verifies all CTO Portal tables and fixes any missing pieces

-- 1. Ensure cto_performance_thresholds exists (even if migration was missed)
CREATE TABLE IF NOT EXISTS public.cto_performance_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_type TEXT NOT NULL UNIQUE CHECK (threshold_type IN ('velocity_min', 'pr_expected_per_week', 'ticket_delay_days', 'overload_ticket_count')),
  threshold_value NUMERIC NOT NULL,
  applies_to_role TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default thresholds if they don't exist
INSERT INTO public.cto_performance_thresholds (threshold_type, threshold_value, applies_to_role) VALUES
  ('velocity_min', 10, NULL),
  ('pr_expected_per_week', 2, NULL),
  ('ticket_delay_days', 3, NULL),
  ('overload_ticket_count', 5, NULL)
ON CONFLICT (threshold_type) DO NOTHING;

-- 2. Ensure it_infrastructure has created_at column (already added in previous migration, but ensure it exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'it_infrastructure' AND column_name = 'created_at') THEN
    ALTER TABLE public.it_infrastructure 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    
    UPDATE public.it_infrastructure 
    SET created_at = now() 
    WHERE created_at IS NULL;
    
    CREATE INDEX IF NOT EXISTS idx_it_infrastructure_created_at 
    ON public.it_infrastructure(created_at DESC);
  END IF;
END $$;

-- 3. Ensure all CTO Portal tables have proper RLS policies
-- Performance thresholds RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cto_performance_thresholds' 
    AND policyname = 'CTO can manage performance thresholds'
  ) THEN
    CREATE POLICY "CTO can manage performance thresholds"
      ON public.cto_performance_thresholds FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 4. Ensure cto_developers table exists (for Team Resource Management)
CREATE TABLE IF NOT EXISTS public.cto_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'Developer',
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline', 'on_leave')),
  skills TEXT[],
  current_project TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on cto_developers
ALTER TABLE public.cto_developers ENABLE ROW LEVEL SECURITY;

-- RLS policy for cto_developers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cto_developers' 
    AND policyname = 'CTO can manage developers'
  ) THEN
    CREATE POLICY "CTO can manage developers"
      ON public.cto_developers FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR user_id = auth.uid()
      );
  END IF;
END $$;

-- 5. Create index on cto_developers if missing
CREATE INDEX IF NOT EXISTS idx_cto_developers_user_id ON public.cto_developers(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_developers_status ON public.cto_developers(availability_status);

-- 6. Ensure get_daily_uptime_percentage function exists (from mobile analytics migration)
-- Using CREATE OR REPLACE is idempotent, so no need for IF NOT EXISTS check
CREATE OR REPLACE FUNCTION get_daily_uptime_percentage(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_seconds BIGINT,
  online_seconds BIGINT,
  uptime_percentage DECIMAL(5, 2)
) AS $$
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
      ELSE 0
    END as uptime_percentage
  FROM mobile_app_uptime_downtime
  WHERE DATE(start_time) = target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

