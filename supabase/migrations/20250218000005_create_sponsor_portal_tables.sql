-- Sponsor Portal (Executive Oversight) Tables
-- Promotion requests, enforcement requests, and sponsor notes

-- First, add sponsor columns to employees table if they don't exist
DO $$
BEGIN
  -- Add sponsor_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'sponsor_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN sponsor_id UUID REFERENCES public.employees(id);
    CREATE INDEX IF NOT EXISTS idx_employees_sponsor ON public.employees(sponsor_id);
  END IF;

  -- Add sponsor_super column if it doesn't exist (for super sponsors who can see all interns)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'sponsor_super'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN sponsor_super BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 1. Promotion Requests (for sponsor approval)
CREATE TABLE IF NOT EXISTS public.intern_promotion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  target_role_state TEXT NOT NULL CHECK (target_role_state IN ('ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER')),
  requested_by UUID NOT NULL REFERENCES auth.users(id), -- Manager or Program Admin
  manager_recommendation TEXT CHECK (manager_recommendation IN ('promote', 'extend', 'revert', 'exit')),
  
  -- Eligibility snapshot at time of request
  eligibility_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores eligibility check results
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('eligible', 'not_eligible')) DEFAULT 'not_eligible',
  
  -- Sponsor decision
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'deferred')) DEFAULT 'pending',
  sponsor_id UUID REFERENCES auth.users(id), -- Executive sponsor
  sponsor_decision TEXT CHECK (sponsor_decision IN ('approved', 'denied', 'deferred')),
  sponsor_reason_code TEXT, -- Standardized reason code
  sponsor_comment TEXT, -- Free-text justification
  decided_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sponsor_decision_requires_sponsor CHECK (
    (status IN ('approved', 'denied', 'deferred') AND sponsor_id IS NOT NULL) OR
    status = 'pending'
  )
);

-- 2. Enforcement Requests (high-impact actions requiring sponsor approval)
CREATE TABLE IF NOT EXISTS public.intern_enforcement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('freeze', 'probation', 'exit', 'deny_conversion', 'revoke')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  requested_by UUID NOT NULL REFERENCES auth.users(id), -- Manager or Program Admin
  evidence_links TEXT[] DEFAULT '{}', -- URLs or references to evidence
  
  -- Request details
  reason TEXT NOT NULL, -- Why this action is needed
  recommended_duration INTEGER, -- Days (for probation/freeze)
  
  -- Sponsor decision
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'more_info_requested')) DEFAULT 'pending',
  sponsor_id UUID REFERENCES auth.users(id),
  sponsor_reason_code TEXT,
  sponsor_comment TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sponsor_decision_requires_sponsor CHECK (
    (status IN ('approved', 'denied', 'more_info_requested') AND sponsor_id IS NOT NULL) OR
    status = 'pending'
  )
);

-- 3. Sponsor Notes (append-only, immutable)
CREATE TABLE IF NOT EXISTS public.intern_sponsor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES auth.users(id),
  note_text TEXT NOT NULL,
  context TEXT, -- Optional context (e.g., 'promotion_review', 'enforcement_decision')
  related_request_id UUID, -- Optional link to promotion_requests or enforcement_requests
  related_request_type TEXT CHECK (related_request_type IN ('promotion', 'enforcement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotion_requests_engagement ON public.intern_promotion_requests(engagement_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON public.intern_promotion_requests(status);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_sponsor ON public.intern_promotion_requests(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_eligibility ON public.intern_promotion_requests(eligibility_status);

CREATE INDEX IF NOT EXISTS idx_enforcement_requests_engagement ON public.intern_enforcement_requests(engagement_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_requests_status ON public.intern_enforcement_requests(status);
CREATE INDEX IF NOT EXISTS idx_enforcement_requests_sponsor ON public.intern_enforcement_requests(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_requests_severity ON public.intern_enforcement_requests(severity);

CREATE INDEX IF NOT EXISTS idx_sponsor_notes_engagement ON public.intern_sponsor_notes(engagement_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_notes_sponsor ON public.intern_sponsor_notes(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_notes_created ON public.intern_sponsor_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.intern_promotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_enforcement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_sponsor_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Promotion Requests
DROP POLICY IF EXISTS "Sponsors can view their promotion requests" ON public.intern_promotion_requests;
CREATE POLICY "Sponsors can view their promotion requests"
  ON public.intern_promotion_requests FOR SELECT
  USING (
    -- Must have INTERN_SPONSOR role
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      -- Sponsor can see requests for their interns (via employees.sponsor_id)
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      -- Super sponsor can see all (if sponsor_super flag is set)
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
    OR
    -- Program Admin can see all
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
    OR
    -- Manager can see requests for their interns
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees mgr_emp ON e.manager_id = mgr_emp.id AND mgr_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
  );

DROP POLICY IF EXISTS "Sponsors can update their promotion requests" ON public.intern_promotion_requests;
CREATE POLICY "Sponsors can update their promotion requests"
  ON public.intern_promotion_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
  );

-- RLS Policies for Enforcement Requests
DROP POLICY IF EXISTS "Sponsors can view their enforcement requests" ON public.intern_enforcement_requests;
CREATE POLICY "Sponsors can view their enforcement requests"
  ON public.intern_enforcement_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
  );

DROP POLICY IF EXISTS "Sponsors can update their enforcement requests" ON public.intern_enforcement_requests;
CREATE POLICY "Sponsors can update their enforcement requests"
  ON public.intern_enforcement_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
  );

-- RLS Policies for Sponsor Notes
DROP POLICY IF EXISTS "Sponsors can view their notes" ON public.intern_sponsor_notes;
CREATE POLICY "Sponsors can view their notes"
  ON public.intern_sponsor_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
  );

DROP POLICY IF EXISTS "Sponsors can create notes" ON public.intern_sponsor_notes;
CREATE POLICY "Sponsors can create notes"
  ON public.intern_sponsor_notes FOR INSERT
  WITH CHECK (
    sponsor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_SPONSOR')
    AND (
      EXISTS (
        SELECT 1 
        FROM public.promotion_engagements pe
        JOIN public.employees e ON pe.person_id = e.id
        JOIN public.employees sponsor_emp ON e.sponsor_id = sponsor_emp.id AND sponsor_emp.user_id = auth.uid()
        WHERE pe.id = engagement_id
      )
      OR
      EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND sponsor_super = true)
    )
  );

-- Note: No UPDATE or DELETE policies - notes are immutable and append-only

COMMENT ON TABLE public.intern_promotion_requests IS 'Promotion requests requiring executive sponsor approval';
COMMENT ON TABLE public.intern_enforcement_requests IS 'High-impact enforcement actions requiring sponsor approval';
COMMENT ON TABLE public.intern_sponsor_notes IS 'Append-only sponsor notes for intern oversight';

