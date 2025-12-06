-- =====================================================
-- CXO Training & Enablement Schema
-- =====================================================

-- =====================================================
-- 1. CXO TRAINING MODULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  associated_route TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_order ON public.cxo_training_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_training_modules_key ON public.cxo_training_modules(key);

-- =====================================================
-- 2. CXO TRAINING LESSONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.cxo_training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content_markdown TEXT NOT NULL,
  associated_route TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_module ON public.cxo_training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_order ON public.cxo_training_lessons(module_id, order_index);

-- =====================================================
-- 3. CXO TRAINING STEPS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.cxo_training_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_ui_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_steps_lesson ON public.cxo_training_steps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_steps_order ON public.cxo_training_steps(lesson_id, order_index);

-- =====================================================
-- 4. CXO TRAINING QUIZZES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.cxo_training_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_lesson ON public.cxo_training_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_order ON public.cxo_training_quizzes(lesson_id, order_index);

-- =====================================================
-- 5. CXO TRAINING PROGRESS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.cxo_training_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.cxo_training_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
  completed_steps JSONB,
  quiz_score NUMERIC,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_training_progress_user ON public.cxo_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module ON public.cxo_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_lesson ON public.cxo_training_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_status ON public.cxo_training_progress(status);

-- =====================================================
-- 6. CXO TRAINING AUDIT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cxo_training_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('module_started', 'module_completed', 'lesson_started', 'lesson_completed', 'quiz_submitted', 'step_completed')),
  module_id UUID REFERENCES public.cxo_training_modules(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.cxo_training_lessons(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_audit_user ON public.cxo_training_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_training_audit_event_type ON public.cxo_training_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_training_audit_created ON public.cxo_training_audit(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.cxo_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_training_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxo_training_audit ENABLE ROW LEVEL SECURITY;

-- Training modules, lessons, steps, quizzes: CXO and ADMIN can view
DROP POLICY IF EXISTS "CXO and ADMIN can view training content" ON public.cxo_training_modules;
CREATE POLICY "CXO and ADMIN can view training content"
ON public.cxo_training_modules FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CXO and ADMIN can view lessons" ON public.cxo_training_lessons;
CREATE POLICY "CXO and ADMIN can view lessons"
ON public.cxo_training_lessons FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CXO and ADMIN can view steps" ON public.cxo_training_steps;
CREATE POLICY "CXO and ADMIN can view steps"
ON public.cxo_training_steps FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CXO and ADMIN can view quizzes" ON public.cxo_training_quizzes;
CREATE POLICY "CXO and ADMIN can view quizzes"
ON public.cxo_training_quizzes FOR SELECT
TO authenticated
USING (public.is_cxo_or_admin(auth.uid()));

-- Training progress: Users can view and manage their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.cxo_training_progress;
CREATE POLICY "Users can view own progress"
ON public.cxo_training_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_cxo_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own progress" ON public.cxo_training_progress;
CREATE POLICY "Users can manage own progress"
ON public.cxo_training_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.is_cxo_or_admin(auth.uid()));

-- Training audit: Users can view their own audit log, CXO/ADMIN can view all
DROP POLICY IF EXISTS "Users can view own audit log" ON public.cxo_training_audit;
CREATE POLICY "Users can view own audit log"
ON public.cxo_training_audit FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_cxo_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create own audit entries" ON public.cxo_training_audit;
CREATE POLICY "Users can create own audit entries"
ON public.cxo_training_audit FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_cxo_or_admin(auth.uid()));

-- =====================================================
-- SEED DATA - Core Training Modules
-- =====================================================

-- Module 1: CXO Orientation & Portal Overview
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('cxo_orientation', 'CXO Orientation & Portal Overview', 'Get started with the CXO Command Center and understand your daily workflow', 1, 30, '/cxo/dashboard')
ON CONFLICT (key) DO NOTHING;

-- Module 2: Dashboard Fundamentals
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('dashboard_fundamentals', 'Dashboard Fundamentals', 'Learn to read and interpret the Executive CX Dashboard', 2, 25, '/cxo/dashboard')
ON CONFLICT (key) DO NOTHING;

-- Module 3: Ticket Governance & Approvals
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('ticket_governance', 'Ticket Governance & Approvals', 'Master ticket management, escalations, and credit approvals', 3, 35, '/cxo/tickets')
ON CONFLICT (key) DO NOTHING;

-- Module 4: Driver, Customer & Merchant Experience
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('experience_management', 'Driver, Customer & Merchant Experience', 'Monitor and manage experience across all stakeholder groups', 4, 40, '/cxo/drivers')
ON CONFLICT (key) DO NOTHING;

-- Module 5: Support Operations & Performance
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('support_operations', 'Support Operations & Performance', 'Oversee support team performance and operations', 5, 30, '/cxo/support')
ON CONFLICT (key) DO NOTHING;

-- Module 6: Analytics, Initiatives & Incidents
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('analytics_initiatives', 'Analytics, Initiatives & Incidents', 'Use analytics to drive decisions and manage initiatives and incidents', 6, 45, '/cxo/analytics')
ON CONFLICT (key) DO NOTHING;

-- Module 7: Executive Reporting
INSERT INTO public.cxo_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('executive_reporting', 'Executive Reporting', 'Create daily and weekly reports for CEO and Board', 7, 25, '/cxo/reports')
ON CONFLICT (key) DO NOTHING;

-- Note: Lesson and step data will be seeded via application code or additional migration
-- This provides the structure for the training system

