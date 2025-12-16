-- Intern Program Admin System
-- Test Modules, Role Tracks, Promotion Rules, and Audit Log

-- 1. Test Module Library
CREATE TABLE IF NOT EXISTS public.intern_test_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Onboarding', 'Ops', 'Tech', 'Compliance', 'Leadership', 'Quality')),
  competency_tags TEXT[] DEFAULT '{}',
  level TEXT NOT NULL CHECK (level IN ('L1', 'L2', 'L3')),
  test_type TEXT NOT NULL CHECK (test_type IN ('Quiz', 'Scenario', 'Artifact', 'Build', 'Memo')),
  time_limit_minutes INTEGER,
  pass_threshold INTEGER NOT NULL DEFAULT 70 CHECK (pass_threshold >= 0 AND pass_threshold <= 100),
  retake_limit INTEGER DEFAULT 3,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('Auto', 'Manager', 'Executive')) DEFAULT 'Auto',
  artifact_required BOOLEAN DEFAULT false,
  counts_toward_promotion BOOLEAN DEFAULT true,
  allowed_role_states TEXT[] DEFAULT ARRAY['INTERN_ACTIVE', 'ACTING_EXECUTIVE'],
  description TEXT,
  instructions TEXT,
  content_json JSONB DEFAULT '{}'::jsonb, -- Quiz questions, scenarios, etc.
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Test Module Assignments (tracks which tests are assigned to which interns)
CREATE TABLE IF NOT EXISTS public.intern_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_module_id UUID NOT NULL REFERENCES public.intern_test_modules(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Assigned', 'In Progress', 'Submitted', 'Passed', 'Failed', 'Expired')) DEFAULT 'Assigned',
  attempts INTEGER DEFAULT 0,
  score INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  artifact_url TEXT,
  UNIQUE(test_module_id, engagement_id)
);

-- 3. Role Tracks (defines competency requirements per track)
CREATE TABLE IF NOT EXISTS public.intern_role_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  required_competency_tags TEXT[] DEFAULT '{}',
  minimum_test_level TEXT CHECK (minimum_test_level IN ('L1', 'L2', 'L3')) DEFAULT 'L1',
  leadership_required BOOLEAN DEFAULT false,
  recommended_test_modules UUID[] DEFAULT '{}', -- References intern_test_modules
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Promotion Rules Engine
CREATE TABLE IF NOT EXISTS public.intern_promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT,
  from_state TEXT NOT NULL CHECK (from_state IN ('APPLIED', 'INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER')),
  to_state TEXT NOT NULL CHECK (to_state IN ('INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER')),
  
  -- Rule conditions (all must be met)
  min_passed_tests INTEGER DEFAULT 0,
  min_test_level TEXT CHECK (min_test_level IN ('L1', 'L2', 'L3')),
  required_categories TEXT[] DEFAULT '{}', -- Must have passed tests in these categories
  compliance_required BOOLEAN DEFAULT false, -- Must pass all compliance tests
  min_review_score INTEGER DEFAULT 0 CHECK (min_review_score >= 0 AND min_review_score <= 100),
  min_tenure_days INTEGER DEFAULT 0,
  acting_term_completed BOOLEAN DEFAULT false,
  sponsor_approval_required BOOLEAN DEFAULT false,
  
  -- Enforcement
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority rules are checked first
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Intern Program Audit Log (immutable)
CREATE TABLE IF NOT EXISTS public.intern_program_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'test_module', 'engagement', 'promotion_rule', 'role_track', etc.
  entity_id UUID,
  affected_user_id UUID,
  reason TEXT NOT NULL, -- Required reason for all admin actions
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Program Templates (letter templates)
CREATE TABLE IF NOT EXISTS public.intern_program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN (
    'OFFER_LETTER',
    'CONVERSION_LETTER',
    'REVERSION_LETTER',
    'EXIT_LETTER',
    'AUTHORITY_REVOCATION'
  )),
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  placeholders TEXT[] DEFAULT '{}', -- System placeholders only
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_type, is_active) -- Only one active template per type
);

-- 7. Enforcement Actions (tracks admin enforcement)
CREATE TABLE IF NOT EXISTS public.intern_enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'FORCE_REVIEW',
    'LOCK_PROMOTION',
    'FLAG_FOR_SPONSOR',
    'INITIATE_EXIT',
    'REVERT_ROLE',
    'FREEZE_EQUITY',
    'REQUIRE_IMMEDIATE_REVIEW'
  )),
  reason TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_modules_category ON public.intern_test_modules(category);
CREATE INDEX IF NOT EXISTS idx_test_modules_level ON public.intern_test_modules(level);
CREATE INDEX IF NOT EXISTS idx_test_modules_archived ON public.intern_test_modules(is_archived);
CREATE INDEX IF NOT EXISTS idx_test_assignments_engagement ON public.intern_test_assignments(engagement_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_status ON public.intern_test_assignments(status);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_states ON public.intern_promotion_rules(from_state, to_state);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.intern_program_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.intern_program_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.intern_program_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enforcement_engagement ON public.intern_enforcement_actions(engagement_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_active ON public.intern_enforcement_actions(is_active);

-- Enable RLS
ALTER TABLE public.intern_test_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_role_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_program_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_enforcement_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Test Modules: Admin can manage, everyone can view non-archived
DROP POLICY IF EXISTS "Program admins can manage test modules" ON public.intern_test_modules;
CREATE POLICY "Program admins can manage test modules"
  ON public.intern_test_modules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view active test modules" ON public.intern_test_modules;
CREATE POLICY "Users can view active test modules"
  ON public.intern_test_modules FOR SELECT
  USING (is_archived = false);

-- Test Assignments: Admin can manage, users can view their own
DROP POLICY IF EXISTS "Program admins can manage test assignments" ON public.intern_test_assignments;
CREATE POLICY "Program admins can manage test assignments"
  ON public.intern_test_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'INTERN_MANAGER', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own test assignments" ON public.intern_test_assignments;
CREATE POLICY "Users can view their own test assignments"
  ON public.intern_test_assignments FOR SELECT
  USING (
    engagement_id IN (
      SELECT id FROM public.promotion_engagements 
      WHERE person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Role Tracks: Admin can manage, everyone can view
DROP POLICY IF EXISTS "Program admins can manage role tracks" ON public.intern_role_tracks;
CREATE POLICY "Program admins can manage role tracks"
  ON public.intern_role_tracks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Everyone can view active role tracks" ON public.intern_role_tracks;
CREATE POLICY "Everyone can view active role tracks"
  ON public.intern_role_tracks FOR SELECT
  USING (is_active = true);

-- Promotion Rules: Admin only
DROP POLICY IF EXISTS "Program admins can manage promotion rules" ON public.intern_promotion_rules;
CREATE POLICY "Program admins can manage promotion rules"
  ON public.intern_promotion_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Everyone can view active promotion rules" ON public.intern_promotion_rules;
CREATE POLICY "Everyone can view active promotion rules"
  ON public.intern_promotion_rules FOR SELECT
  USING (is_active = true);

-- Audit Log: Admin can view, insert only (immutable)
DROP POLICY IF EXISTS "Program admins can view audit logs" ON public.intern_program_audit_log;
CREATE POLICY "Program admins can view audit logs"
  ON public.intern_program_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.intern_program_audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.intern_program_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Templates: Admin can manage
DROP POLICY IF EXISTS "Program admins can manage templates" ON public.intern_program_templates;
CREATE POLICY "Program admins can manage templates"
  ON public.intern_program_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Enforcement Actions: Admin can manage
DROP POLICY IF EXISTS "Program admins can manage enforcement actions" ON public.intern_enforcement_actions;
CREATE POLICY "Program admins can manage enforcement actions"
  ON public.intern_enforcement_actions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Seed default role tracks
INSERT INTO public.intern_role_tracks (name, description, required_competency_tags, minimum_test_level, leadership_required)
VALUES
  ('Founder''s Office – Technology', 'Technology track under direct CEO/CTO oversight', ARRAY['tech', 'architecture', 'security'], 'L2', true),
  ('Strategy & Operations', 'Strategic planning and business operations', ARRAY['strategy', 'analytics', 'operations'], 'L2', true),
  ('Operations Management', 'Day-to-day operations and logistics', ARRAY['operations', 'logistics', 'process'], 'L1', false),
  ('Marketing & Brand', 'Marketing, brand management, and communications', ARRAY['marketing', 'brand', 'communications'], 'L1', false)
ON CONFLICT (name) DO NOTHING;

-- Seed default promotion rules
INSERT INTO public.intern_promotion_rules (rule_name, description, from_state, to_state, min_passed_tests, min_test_level, required_categories, compliance_required, min_review_score, min_tenure_days)
VALUES
  ('Intern to Acting Executive', 'Standard promotion path from intern to acting executive', 'INTERN_ACTIVE', 'ACTING_EXECUTIVE', 5, 'L1', ARRAY['Leadership', 'Compliance'], true, 70, 30),
  ('Acting Executive to Executive Officer', 'Promotion from acting to full executive', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER', 10, 'L2', ARRAY['Leadership', 'Compliance', 'Quality'], true, 80, 90)
ON CONFLICT DO NOTHING;

-- Seed default templates
INSERT INTO public.intern_program_templates (template_type, name, description, html_content, placeholders)
VALUES
  ('OFFER_LETTER', 'Standard Intern Offer Letter', 'Default offer letter for new interns', 
   '<h1>Internship Offer</h1><p>Dear {{INTERN_NAME}},</p><p>We are pleased to offer you an internship position at Crave''n Delivery...</p>',
   ARRAY['INTERN_NAME', 'START_DATE', 'TRACK', 'MANAGER_NAME', 'COMPANY_NAME']),
  ('CONVERSION_LETTER', 'Acting Executive Conversion Letter', 'Letter for intern to acting executive conversion',
   '<h1>Acting Executive Appointment</h1><p>Dear {{INTERN_NAME}},</p><p>Congratulations on your promotion to Acting Executive...</p>',
   ARRAY['INTERN_NAME', 'NEW_TITLE', 'EFFECTIVE_DATE', 'SPONSOR_NAME', 'DEFERRED_SALARY']),
  ('REVERSION_LETTER', 'Role Reversion Notice', 'Notice for role reversion',
   '<h1>Role Adjustment Notice</h1><p>Dear {{INTERN_NAME}},</p><p>This letter confirms the adjustment to your role...</p>',
   ARRAY['INTERN_NAME', 'PREVIOUS_ROLE', 'NEW_ROLE', 'EFFECTIVE_DATE', 'REASON']),
  ('EXIT_LETTER', 'Program Exit Letter', 'Letter for program exit',
   '<h1>Program Exit Confirmation</h1><p>Dear {{INTERN_NAME}},</p><p>This letter confirms your exit from the intern program...</p>',
   ARRAY['INTERN_NAME', 'EXIT_DATE', 'EXIT_REASON', 'FINAL_STATUS']),
  ('AUTHORITY_REVOCATION', 'Authority Revocation Notice', 'Notice for authority revocation',
   '<h1>Authority Revocation</h1><p>Dear {{INTERN_NAME}},</p><p>This notice confirms the revocation of certain authorities...</p>',
   ARRAY['INTERN_NAME', 'REVOKED_AUTHORITIES', 'EFFECTIVE_DATE', 'REASON'])
ON CONFLICT DO NOTHING;

-- Function to log admin actions (for use in application code)
CREATE OR REPLACE FUNCTION log_intern_program_action(
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_affected_user_id UUID,
  p_reason TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.intern_program_audit_log (
    actor_id, action, entity_type, entity_id, affected_user_id, reason, old_values, new_values
  )
  VALUES (
    p_actor_id, p_action, p_entity_type, p_entity_id, p_affected_user_id, p_reason, p_old_values, p_new_values
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new role states to promotion_engagements if not exists
DO $$
BEGIN
  -- Update the check constraint to include new states
  ALTER TABLE public.promotion_engagements 
    DROP CONSTRAINT IF EXISTS promotion_engagements_current_stage_check;
  
  ALTER TABLE public.promotion_engagements 
    ADD CONSTRAINT promotion_engagements_current_stage_check 
    CHECK (current_stage IN (
      'APPLIED', 'INTERN_ACTIVE', 'ACTING_ELIGIBLE', 'ACTING_ACTIVE',
      'ACTING_EXECUTIVE', 'EXEC_ELIGIBLE', 'EXEC_ACTIVE', 
      'EXECUTIVE_OFFICER', 'EXITED', 'REVOKED'
    ));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END$$;

-- Add risk status to engagements
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS risk_status TEXT CHECK (risk_status IN ('OK', 'Warning', 'Critical')) DEFAULT 'OK';

-- Add promotion readiness percentage
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS promotion_readiness_percent INTEGER DEFAULT 0 CHECK (promotion_readiness_percent >= 0 AND promotion_readiness_percent <= 100);

-- Add locked promotion flag
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS promotion_locked BOOLEAN DEFAULT false;

-- Add lock reason
ALTER TABLE public.promotion_engagements
ADD COLUMN IF NOT EXISTS promotion_lock_reason TEXT;

