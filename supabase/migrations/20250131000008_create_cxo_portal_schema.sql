-- =====================================================
-- CXO PORTAL SCHEMA MIGRATION
-- Creates all tables needed for CXO Experience Command Center
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. EXPERIENCE METRICS SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.experience_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL,
  time_bucket TEXT NOT NULL CHECK (time_bucket IN ('hour', 'day', 'week')),
  open_orders INTEGER DEFAULT 0,
  delayed_orders INTEGER DEFAULT 0,
  avg_delivery_minutes NUMERIC(10, 2),
  max_delivery_minutes NUMERIC(10, 2),
  driver_online_count INTEGER DEFAULT 0,
  driver_offline_count INTEGER DEFAULT 0,
  tickets_open_count INTEGER DEFAULT 0,
  tickets_escalated_count INTEGER DEFAULT 0,
  cancellation_rate NUMERIC(5, 2) DEFAULT 0,
  at_risk_restaurants_count INTEGER DEFAULT 0,
  problem_zones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_metrics_captured_at ON public.experience_metrics_snapshots(captured_at);
CREATE INDEX IF NOT EXISTS idx_experience_metrics_time_bucket ON public.experience_metrics_snapshots(time_bucket);

-- =====================================================
-- 2. EXPERIENCE TICKETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.experience_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ticket_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('driver', 'customer', 'merchant', 'system')),
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID,
  merchant_id UUID,
  zone TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  root_cause_tag TEXT,
  approved_credit_amount NUMERIC(10, 2),
  needs_cxo_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_tickets_type ON public.experience_tickets(type);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_status ON public.experience_tickets(status);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_priority ON public.experience_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_needs_approval ON public.experience_tickets(needs_cxo_approval);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_created_at ON public.experience_tickets(created_at);

-- =====================================================
-- 3. DRIVERS (Minimal reference for CXO)
-- =====================================================
-- Note: drivers table already exists from driver onboarding system
-- We'll add missing columns if they don't exist for CXO portal use

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add online_state column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'online_state'
  ) THEN
    ALTER TABLE public.drivers 
    ADD COLUMN online_state TEXT CHECK (online_state IN ('online', 'offline')) DEFAULT 'offline';
  END IF;
  
  -- Add home_zone column if it doesn't exist (might be zone_id instead)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'home_zone'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN home_zone TEXT;
  END IF;
  
  -- Add rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN rating NUMERIC(3, 2);
  END IF;
END $$;

-- Create indexes only if the columns exist
DO $$
BEGIN
  -- Index on status (should exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
  END IF;
  
  -- Index on online_state (we just added it)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'online_state'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_drivers_online_state ON public.drivers(online_state);
  END IF;
END $$;

-- =====================================================
-- 4. MERCHANTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  zone TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'offline')) DEFAULT 'active',
  avg_prep_minutes NUMERIC(10, 2),
  rating NUMERIC(3, 2),
  is_at_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_at_risk ON public.merchants(is_at_risk);

-- =====================================================
-- 5. SUPPORT STAFF
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('support_agent', 'support_manager', 'driver_onboarding', 'merchant_success')),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_support_staff_role ON public.support_staff(role);
CREATE INDEX IF NOT EXISTS idx_support_staff_active ON public.support_staff(active);

-- =====================================================
-- 6. SUPPORT STAFF METRICS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_staff_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.support_staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tickets_resolved INTEGER DEFAULT 0,
  avg_handle_minutes NUMERIC(10, 2),
  escalations_count INTEGER DEFAULT 0,
  csat_score NUMERIC(3, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_support_staff_metrics_date ON public.support_staff_metrics(date);
CREATE INDEX IF NOT EXISTS idx_support_staff_metrics_staff ON public.support_staff_metrics(staff_id);

-- =====================================================
-- 7. EXPERIENCE ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.experience_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  csat_score NUMERIC(5, 2),
  nps_score NUMERIC(5, 2),
  total_surveys INTEGER,
  avg_delivery_minutes NUMERIC(10, 2),
  late_delivery_rate NUMERIC(5, 2),
  repeat_complaint_rate NUMERIC(5, 2),
  segment TEXT NOT NULL CHECK (segment IN ('driver', 'customer', 'merchant', 'global')) DEFAULT 'global',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, segment)
);

CREATE INDEX IF NOT EXISTS idx_experience_analytics_date ON public.experience_analytics(date);
CREATE INDEX IF NOT EXISTS idx_experience_analytics_segment ON public.experience_analytics(segment);

-- =====================================================
-- 8. EXPERIENCE INITIATIVES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.experience_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  root_cause TEXT,
  plan TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')) DEFAULT 'planned',
  impact_metrics JSONB DEFAULT '{}'::jsonb,
  start_date DATE NOT NULL,
  target_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_initiatives_status ON public.experience_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_experience_initiatives_owner ON public.experience_initiatives(owner_id);

-- =====================================================
-- 9. EXPERIENCE INCIDENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.experience_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system_outage', 'merchant_outage', 'driver_shortage', 'safety', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('open', 'mitigating', 'resolved', 'closed')) DEFAULT 'open',
  zone TEXT,
  reported_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_ticket_id UUID REFERENCES public.experience_tickets(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_incidents_status ON public.experience_incidents(status);
CREATE INDEX IF NOT EXISTS idx_experience_incidents_severity ON public.experience_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_experience_incidents_type ON public.experience_incidents(type);

-- =====================================================
-- 10. CXO REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  biggest_issue TEXT,
  fix_deployed TEXT,
  metrics_moved TEXT,
  ticket_backlog_status TEXT,
  recommendation_for_tomorrow TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_date, type)
);

CREATE INDEX IF NOT EXISTS idx_cxo_reports_date ON public.cxo_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_cxo_reports_type ON public.cxo_reports(type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.experience_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_staff_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_reports ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is CXO or ADMIN
CREATE OR REPLACE FUNCTION public.is_cxo_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = user_uuid
    AND (
      LOWER(position) LIKE '%chief experience officer%'
      OR LOWER(position) LIKE '%cxo%'
      OR LOWER(position) = 'admin'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
    AND role IN ('CXO', 'ADMIN', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for experience_metrics_snapshots
DROP POLICY IF EXISTS "CXO and ADMIN can view metrics" ON public.experience_metrics_snapshots;
CREATE POLICY "CXO and ADMIN can view metrics"
ON public.experience_metrics_snapshots FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for experience_tickets
DROP POLICY IF EXISTS "CXO and ADMIN can manage tickets" ON public.experience_tickets;
CREATE POLICY "CXO and ADMIN can manage tickets"
ON public.experience_tickets FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for drivers
DROP POLICY IF EXISTS "CXO and ADMIN can view drivers" ON public.drivers;
CREATE POLICY "CXO and ADMIN can view drivers"
ON public.drivers FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for merchants
DROP POLICY IF EXISTS "CXO and ADMIN can manage merchants" ON public.merchants;
CREATE POLICY "CXO and ADMIN can manage merchants"
ON public.merchants FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for support_staff
DROP POLICY IF EXISTS "CXO and ADMIN can manage support staff" ON public.support_staff;
CREATE POLICY "CXO and ADMIN can manage support staff"
ON public.support_staff FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for support_staff_metrics
DROP POLICY IF EXISTS "CXO and ADMIN can view support metrics" ON public.support_staff_metrics;
CREATE POLICY "CXO and ADMIN can view support metrics"
ON public.support_staff_metrics FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for experience_analytics
DROP POLICY IF EXISTS "CXO and ADMIN can view analytics" ON public.experience_analytics;
CREATE POLICY "CXO and ADMIN can view analytics"
ON public.experience_analytics FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for experience_initiatives
DROP POLICY IF EXISTS "CXO and ADMIN can manage initiatives" ON public.experience_initiatives;
CREATE POLICY "CXO and ADMIN can manage initiatives"
ON public.experience_initiatives FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for experience_incidents
DROP POLICY IF EXISTS "CXO and ADMIN can manage incidents" ON public.experience_incidents;
CREATE POLICY "CXO and ADMIN can manage incidents"
ON public.experience_incidents FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- RLS Policies for cxo_reports
DROP POLICY IF EXISTS "CXO and ADMIN can manage reports" ON public.cxo_reports;
CREATE POLICY "CXO and ADMIN can manage reports"
ON public.cxo_reports FOR ALL
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_experience_tickets_updated_at ON public.experience_tickets;
CREATE TRIGGER update_experience_tickets_updated_at
  BEFORE UPDATE ON public.experience_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_experience_initiatives_updated_at ON public.experience_initiatives;
CREATE TRIGGER update_experience_initiatives_updated_at
  BEFORE UPDATE ON public.experience_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_experience_incidents_updated_at ON public.experience_incidents;
CREATE TRIGGER update_experience_incidents_updated_at
  BEFORE UPDATE ON public.experience_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

