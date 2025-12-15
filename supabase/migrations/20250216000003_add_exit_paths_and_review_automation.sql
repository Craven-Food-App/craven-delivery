-- Add exit paths, review automation, and authority enforcement
-- Completes the remaining 15% of the promotion system

-- Add review cadence tracking to engagements
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS next_review_due_date DATE,
ADD COLUMN IF NOT EXISTS review_cadence_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS missed_review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_review_blocked BOOLEAN DEFAULT false;

-- Add exit tracking
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS exit_reason TEXT,
ADD COLUMN IF NOT EXISTS exit_date DATE,
ADD COLUMN IF NOT EXISTS exit_document_id UUID REFERENCES public.promotion_documents(id);

-- Add authority revocation tracking
CREATE TABLE IF NOT EXISTS public.promotion_authority_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  authority_scope TEXT, -- JSON describing what was revoked
  document_id UUID REFERENCES public.promotion_documents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add successor tracking
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS is_successor_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS successor_for_role TEXT,
ADD COLUMN IF NOT EXISTS successor_readiness_score INTEGER CHECK (successor_readiness_score >= 0 AND successor_readiness_score <= 100);

-- Create review schedule table
CREATE TABLE IF NOT EXISTS public.promotion_review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('30_DAY', '60_DAY', '90_DAY', 'ANNUAL', 'EXIT')),
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  review_id UUID REFERENCES public.promotion_performance_reviews(id),
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'OVERDUE', 'COMPLETED', 'SKIPPED')) DEFAULT 'SCHEDULED',
  is_blocking BOOLEAN DEFAULT false, -- Blocks promotion if overdue
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_schedules_engagement ON public.promotion_review_schedules(engagement_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_due ON public.promotion_review_schedules(scheduled_date) WHERE status IN ('SCHEDULED', 'OVERDUE');
CREATE INDEX IF NOT EXISTS idx_authority_revocations_engagement ON public.promotion_authority_revocations(engagement_id);

-- Add visibility control column to comp packages
ALTER TABLE public.promotion_comp_packages
ADD COLUMN IF NOT EXISTS visibility_level TEXT CHECK (visibility_level IN ('PRIVATE', 'CEO_CFO', 'INDIVIDUAL_ONLY')) DEFAULT 'CEO_CFO';

-- Enable RLS
ALTER TABLE public.promotion_review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_authority_revocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to allow re-running migration)
DROP POLICY IF EXISTS "Executives can manage review schedules" ON public.promotion_review_schedules;
DROP POLICY IF EXISTS "Users can view their own review schedules" ON public.promotion_review_schedules;
DROP POLICY IF EXISTS "Executives can manage authority revocations" ON public.promotion_authority_revocations;
DROP POLICY IF EXISTS "Users can view their own authority revocations" ON public.promotion_authority_revocations;

CREATE POLICY "Executives can manage review schedules"
  ON public.promotion_review_schedules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Users can view their own review schedules"
  ON public.promotion_review_schedules FOR SELECT
  USING (
    engagement_id IN (
      SELECT id FROM public.promotion_engagements 
      WHERE person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Executives can manage authority revocations"
  ON public.promotion_authority_revocations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Users can view their own authority revocations"
  ON public.promotion_authority_revocations FOR SELECT
  USING (
    engagement_id IN (
      SELECT id FROM public.promotion_engagements 
      WHERE person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Function to automatically create review schedules when engagement starts
CREATE OR REPLACE FUNCTION create_initial_review_schedules()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create schedules for active engagements (on insert or stage change)
  IF NEW.current_stage IN ('INTERN_ACTIVE', 'ACTING_ACTIVE') 
     AND (OLD IS NULL OR OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
    -- Create 30, 60, 90 day review schedules
    INSERT INTO public.promotion_review_schedules (engagement_id, review_type, scheduled_date, status)
    VALUES
      (NEW.id, '30_DAY', NEW.start_date + INTERVAL '30 days', 'SCHEDULED'),
      (NEW.id, '60_DAY', NEW.start_date + INTERVAL '60 days', 'SCHEDULED'),
      (NEW.id, '90_DAY', NEW.start_date + INTERVAL '90 days', 'SCHEDULED');
    
    -- Set next review due date
    UPDATE public.promotion_engagements
    SET next_review_due_date = NEW.start_date + INTERVAL '30 days'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_review_schedules ON public.promotion_engagements;

CREATE TRIGGER trigger_create_review_schedules
  AFTER INSERT OR UPDATE OF current_stage ON public.promotion_engagements
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_review_schedules();

-- Helper function to increment missed review count
CREATE OR REPLACE FUNCTION increment_missed_review_count(engagement_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.promotion_engagements
  SET 
    missed_review_count = COALESCE(missed_review_count, 0) + 1,
    is_review_blocked = true
  WHERE id = engagement_id_param;
END;
$$ LANGUAGE plpgsql;

