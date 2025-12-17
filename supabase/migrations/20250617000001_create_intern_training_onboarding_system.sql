-- Intern Training & Onboarding Module-Based LMS System
-- This replaces the static training module approach with a proper database-driven system

-- 1. Training Modules Master Table
CREATE TABLE IF NOT EXISTS public.intern_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('Video', 'Interactive', 'Document')),
  
  -- Module scope determines who sees this module
  scope TEXT NOT NULL CHECK (scope IN ('CORE', 'MARKETING_GROWTH', 'ENGINEERING_TECH', 'OPERATIONS_STRATEGY', 'FINANCE_ADMIN')),
  is_required BOOLEAN DEFAULT true,
  certification_issued BOOLEAN DEFAULT false,
  passing_score INTEGER CHECK (passing_score IS NULL OR (passing_score >= 0 AND passing_score <= 100)),
  
  -- Unlock rules
  prerequisite_module_ids UUID[] DEFAULT '{}',
  unlock_after_weeks INTEGER, -- For time-gated modules like Leadership
  admin_unlock_only BOOLEAN DEFAULT false,
  performance_flag_required BOOLEAN DEFAULT false,
  
  -- Content (for future interactive modules)
  content_url TEXT,
  content_json JSONB DEFAULT '{}'::jsonb,
  
  -- Ordering and status
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. User Module Progress
CREATE TABLE IF NOT EXISTS public.intern_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.intern_training_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'LOCKED')) DEFAULT 'LOCKED',
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_spent_minutes INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  UNIQUE(user_id, module_id)
);

-- 3. Certifications (immutable records)
CREATE TABLE IF NOT EXISTS public.intern_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.intern_training_modules(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL, -- Denormalized for certificate display
  score INTEGER NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  certificate_url TEXT,
  verification_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE, -- Some certifications may expire
  UNIQUE(user_id, module_id)
);

-- 4. Intern Activation Status (tracks overall training completion)
CREATE TABLE IF NOT EXISTS public.intern_activation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role_track TEXT NOT NULL CHECK (role_track IN ('MARKETING_GROWTH', 'ENGINEERING_TECH', 'OPERATIONS_STRATEGY', 'FINANCE_ADMIN')),
  core_modules_completed BOOLEAN DEFAULT false,
  role_modules_completed BOOLEAN DEFAULT false,
  is_activated BOOLEAN DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Admin Module Unlocks (for manually unlocking locked modules)
CREATE TABLE IF NOT EXISTS public.intern_module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.intern_training_modules(id) ON DELETE CASCADE,
  unlocked_by UUID NOT NULL REFERENCES auth.users(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT NOT NULL,
  UNIQUE(user_id, module_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intern_training_modules_scope ON public.intern_training_modules(scope);
CREATE INDEX IF NOT EXISTS idx_intern_training_modules_active ON public.intern_training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_intern_training_modules_sort ON public.intern_training_modules(sort_order);
CREATE INDEX IF NOT EXISTS idx_intern_module_progress_user ON public.intern_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_intern_module_progress_status ON public.intern_module_progress(status);
CREATE INDEX IF NOT EXISTS idx_intern_module_progress_module ON public.intern_module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_intern_certifications_user ON public.intern_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_intern_certifications_verification ON public.intern_certifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_intern_activation_user ON public.intern_activation_status(user_id);
CREATE INDEX IF NOT EXISTS idx_intern_activation_track ON public.intern_activation_status(role_track);
CREATE INDEX IF NOT EXISTS idx_intern_module_unlocks_user ON public.intern_module_unlocks(user_id);

-- Enable RLS
ALTER TABLE public.intern_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_activation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_module_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Training Modules: Everyone can view active modules
DROP POLICY IF EXISTS "Everyone can view active training modules" ON public.intern_training_modules;
CREATE POLICY "Everyone can view active training modules"
  ON public.intern_training_modules FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage training modules" ON public.intern_training_modules;
CREATE POLICY "Admins can manage training modules"
  ON public.intern_training_modules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Module Progress: Users can view/update their own, admins can view all
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.intern_module_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.intern_module_progress FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all progress" ON public.intern_module_progress;
CREATE POLICY "Admins can view all progress"
  ON public.intern_module_progress FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'INTERN_MANAGER', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Certifications: Users can view their own, admins can view all, insert only (immutable)
DROP POLICY IF EXISTS "Users can view their own certifications" ON public.intern_certifications;
CREATE POLICY "Users can view their own certifications"
  ON public.intern_certifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all certifications" ON public.intern_certifications;
CREATE POLICY "Admins can view all certifications"
  ON public.intern_certifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'INTERN_MANAGER', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert certifications" ON public.intern_certifications;
CREATE POLICY "System can insert certifications"
  ON public.intern_certifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Activation Status: Users can view their own, admins can manage
DROP POLICY IF EXISTS "Users can view their own activation status" ON public.intern_activation_status;
CREATE POLICY "Users can view their own activation status"
  ON public.intern_activation_status FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage activation status" ON public.intern_activation_status;
CREATE POLICY "Admins can manage activation status"
  ON public.intern_activation_status FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Module Unlocks: Admins only
DROP POLICY IF EXISTS "Admins can manage module unlocks" ON public.intern_module_unlocks;
CREATE POLICY "Admins can manage module unlocks"
  ON public.intern_module_unlocks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('INTERN_PROGRAM_ADMIN', 'admin', 'ceo'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own unlocks" ON public.intern_module_unlocks;
CREATE POLICY "Users can view their own unlocks"
  ON public.intern_module_unlocks FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- SEED CORE TRAINING MODULES (Mandatory for all interns)
-- ============================================

INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, passing_score, sort_order)
VALUES
  ('Welcome to Crave''n Delivery', 'Company culture, values, team structure, and expectations. Learn what makes Crave''n unique and how you fit into our mission.', 45, 'Video', 'CORE', true, true, NULL, 1),
  ('Safety & Compliance Fundamentals', 'Essential safety protocols, regulatory compliance, ethics, and reporting obligations. This module requires a passing score of 80%.', 60, 'Interactive', 'CORE', true, true, 80, 2),
  ('Delivery Operations 101 (Intern Context)', 'Operational understanding, process flow awareness, and cross-team impact. Understand how delivery operations work from end to end.', 90, 'Video', 'CORE', true, true, NULL, 3),
  ('Customer Service Excellence', 'Communication standards, professional behavior, and handling difficult situations with grace and efficiency.', 75, 'Interactive', 'CORE', true, true, NULL, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED MARKETING & GROWTH TRACK MODULES
-- ============================================

INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, sort_order)
VALUES
  ('Technology Platform Training', 'Master internal tools, marketing systems, and platform literacy. Learn the tech stack that powers our growth initiatives.', 120, 'Interactive', 'MARKETING_GROWTH', true, false, 10),
  ('Advanced Growth & Optimization', 'Campaign optimization techniques, growth strategy awareness, and data-driven decision making.', 60, 'Document', 'MARKETING_GROWTH', true, false, 11),
  ('Quality & Brand Assurance Standards', 'Brand protection, content quality guidelines, and public representation rules. Protect and enhance the Crave''n brand.', 45, 'Video', 'MARKETING_GROWTH', true, false, 12)
ON CONFLICT DO NOTHING;

-- Marketing Leadership module (locked by default)
INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, unlock_after_weeks, admin_unlock_only, sort_order)
VALUES
  ('Team Leadership Basics', 'Leadership fundamentals and coordination basics. Unlock your potential as a future leader at Crave''n.', 90, 'Interactive', 'MARKETING_GROWTH', false, false, 4, false, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED ENGINEERING & TECH TRACK MODULES
-- ============================================

INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, sort_order)
VALUES
  ('Platform Architecture Overview', 'Deep dive into Crave''n''s technical architecture, microservices, and infrastructure design patterns.', 90, 'Video', 'ENGINEERING_TECH', true, false, 10),
  ('Security & Data Protection', 'Security best practices, data protection protocols, and compliance requirements for engineering teams.', 120, 'Interactive', 'ENGINEERING_TECH', true, true, 11),
  ('Repo & Environment Controls', 'Git workflows, CI/CD pipelines, environment management, and deployment procedures.', 90, 'Interactive', 'ENGINEERING_TECH', true, false, 12),
  ('Change Management & Escalation', 'How to manage changes, handle incidents, and escalate issues appropriately.', 60, 'Document', 'ENGINEERING_TECH', true, false, 13)
ON CONFLICT DO NOTHING;

-- Engineering Leadership module (locked by default)
INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, unlock_after_weeks, admin_unlock_only, sort_order)
VALUES
  ('Technical Leadership Basics', 'Technical leadership fundamentals, code review practices, and mentoring skills.', 90, 'Interactive', 'ENGINEERING_TECH', false, false, 4, false, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED OPERATIONS & STRATEGY TRACK MODULES
-- ============================================

INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, sort_order)
VALUES
  ('Internal Workflow Systems', 'Master internal workflow tools, process automation, and operational systems.', 90, 'Interactive', 'OPERATIONS_STRATEGY', true, false, 10),
  ('Process Documentation Standards', 'Learn to create, maintain, and improve process documentation that drives operational excellence.', 75, 'Document', 'OPERATIONS_STRATEGY', true, false, 11),
  ('Cross-Team Coordination', 'Effective coordination across teams, stakeholder management, and communication protocols.', 60, 'Interactive', 'OPERATIONS_STRATEGY', true, false, 12),
  ('Compliance Awareness', 'Operational compliance requirements, audit preparation, and regulatory awareness.', 60, 'Video', 'OPERATIONS_STRATEGY', true, true, 13)
ON CONFLICT DO NOTHING;

-- Operations Leadership module (locked by default)
INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, unlock_after_weeks, admin_unlock_only, sort_order)
VALUES
  ('Operations Leadership Basics', 'Operational leadership, resource management, and team coordination fundamentals.', 90, 'Interactive', 'OPERATIONS_STRATEGY', false, false, 4, false, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED FINANCE & ADMIN TRACK MODULES
-- ============================================

INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, sort_order)
VALUES
  ('Financial Data Sensitivity', 'Understanding financial data handling, confidentiality requirements, and data classification.', 90, 'Interactive', 'FINANCE_ADMIN', true, true, 10),
  ('Access Controls & Audit Awareness', 'System access controls, audit trails, and compliance monitoring for financial systems.', 120, 'Interactive', 'FINANCE_ADMIN', true, true, 11),
  ('Reporting Integrity', 'Financial reporting standards, accuracy requirements, and integrity controls.', 75, 'Document', 'FINANCE_ADMIN', true, false, 12),
  ('Compliance Essentials', 'Essential compliance knowledge for finance and administrative roles.', 60, 'Video', 'FINANCE_ADMIN', true, true, 13)
ON CONFLICT DO NOTHING;

-- Finance Leadership module (locked by default)
INSERT INTO public.intern_training_modules (name, description, duration_minutes, delivery_type, scope, is_required, certification_issued, unlock_after_weeks, admin_unlock_only, sort_order)
VALUES
  ('Finance Leadership Basics', 'Financial leadership, budget management, and strategic financial planning fundamentals.', 90, 'Interactive', 'FINANCE_ADMIN', false, false, 4, false, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has completed all required core modules
CREATE OR REPLACE FUNCTION check_core_modules_completed(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_count INTEGER;
  v_completed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_required_count
  FROM public.intern_training_modules
  WHERE scope = 'CORE' AND is_required = true AND is_active = true;
  
  SELECT COUNT(*) INTO v_completed_count
  FROM public.intern_module_progress p
  JOIN public.intern_training_modules m ON p.module_id = m.id
  WHERE p.user_id = p_user_id 
    AND m.scope = 'CORE' 
    AND m.is_required = true 
    AND m.is_active = true
    AND p.status = 'COMPLETED';
  
  RETURN v_completed_count >= v_required_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has completed all required role-specific modules
CREATE OR REPLACE FUNCTION check_role_modules_completed(p_user_id UUID, p_role_track TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_count INTEGER;
  v_completed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_required_count
  FROM public.intern_training_modules
  WHERE scope = p_role_track AND is_required = true AND is_active = true;
  
  SELECT COUNT(*) INTO v_completed_count
  FROM public.intern_module_progress p
  JOIN public.intern_training_modules m ON p.module_id = m.id
  WHERE p.user_id = p_user_id 
    AND m.scope = p_role_track 
    AND m.is_required = true 
    AND m.is_active = true
    AND p.status = 'COMPLETED';
  
  RETURN v_completed_count >= v_required_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update activation status when modules are completed
CREATE OR REPLACE FUNCTION update_intern_activation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_role_track TEXT;
  v_core_completed BOOLEAN;
  v_role_completed BOOLEAN;
BEGIN
  -- Get user's role track
  SELECT role_track INTO v_role_track
  FROM public.intern_activation_status
  WHERE user_id = NEW.user_id;
  
  IF v_role_track IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check completion status
  v_core_completed := check_core_modules_completed(NEW.user_id);
  v_role_completed := check_role_modules_completed(NEW.user_id, v_role_track);
  
  -- Update activation status
  UPDATE public.intern_activation_status
  SET 
    core_modules_completed = v_core_completed,
    role_modules_completed = v_role_completed,
    is_activated = (v_core_completed AND v_role_completed),
    activated_at = CASE 
      WHEN (v_core_completed AND v_role_completed) AND activated_at IS NULL 
      THEN now() 
      ELSE activated_at 
    END,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update activation status on progress changes
DROP TRIGGER IF EXISTS trigger_update_activation_status ON public.intern_module_progress;
CREATE TRIGGER trigger_update_activation_status
  AFTER INSERT OR UPDATE OF status ON public.intern_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_intern_activation_status();

-- Function to issue certification when module is completed
CREATE OR REPLACE FUNCTION issue_module_certification()
RETURNS TRIGGER AS $$
DECLARE
  v_module RECORD;
BEGIN
  -- Only process if status changed to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD IS NULL OR OLD.status != 'COMPLETED') THEN
    -- Get module details
    SELECT * INTO v_module
    FROM public.intern_training_modules
    WHERE id = NEW.module_id;
    
    -- Check if module issues certification
    IF v_module.certification_issued THEN
      -- Check if passing score is met (if required)
      IF v_module.passing_score IS NULL OR (NEW.score IS NOT NULL AND NEW.score >= v_module.passing_score) THEN
        -- Insert certification (ignore if already exists)
        INSERT INTO public.intern_certifications (user_id, module_id, module_name, score)
        VALUES (NEW.user_id, NEW.module_id, v_module.name, COALESCE(NEW.score, 100))
        ON CONFLICT (user_id, module_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-issue certifications
DROP TRIGGER IF EXISTS trigger_issue_certification ON public.intern_module_progress;
CREATE TRIGGER trigger_issue_certification
  AFTER INSERT OR UPDATE OF status, score ON public.intern_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION issue_module_certification();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_core_modules_completed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_role_modules_completed(UUID, TEXT) TO authenticated;

