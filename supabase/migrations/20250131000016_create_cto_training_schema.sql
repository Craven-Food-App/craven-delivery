-- =====================================================
-- CTO Training & Enablement Schema
-- =====================================================

-- =====================================================
-- 1. CTO TRAINING MODULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  associated_route TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_training_modules_order ON public.cto_training_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_cto_training_modules_key ON public.cto_training_modules(key);

-- =====================================================
-- 2. CTO TRAINING LESSONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.cto_training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content_markdown TEXT NOT NULL,
  associated_route TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_training_lessons_module ON public.cto_training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_lessons_order ON public.cto_training_lessons(module_id, order_index);

-- =====================================================
-- 3. CTO TRAINING STEPS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.cto_training_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_ui_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_training_steps_lesson ON public.cto_training_steps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_steps_order ON public.cto_training_steps(lesson_id, order_index);

-- =====================================================
-- 4. CTO TRAINING QUIZZES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.cto_training_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_training_quizzes_lesson ON public.cto_training_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_quizzes_order ON public.cto_training_quizzes(lesson_id, order_index);

-- =====================================================
-- 5. CTO TRAINING PROGRESS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.cto_training_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.cto_training_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
  completed_steps JSONB,
  quiz_score NUMERIC,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_cto_training_progress_user ON public.cto_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_progress_module ON public.cto_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_progress_lesson ON public.cto_training_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_progress_status ON public.cto_training_progress(status);

-- =====================================================
-- 6. CTO TRAINING AUDIT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cto_training_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('module_started', 'module_completed', 'lesson_started', 'lesson_completed', 'quiz_submitted', 'step_completed')),
  module_id UUID REFERENCES public.cto_training_modules(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.cto_training_lessons(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_training_audit_user ON public.cto_training_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_training_audit_event_type ON public.cto_training_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_cto_training_audit_created ON public.cto_training_audit(created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Check if user is CTO or ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_cto_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = user_uuid
    AND (
      LOWER(position) LIKE '%chief technology officer%'
      OR LOWER(position) LIKE '%cto%'
      OR LOWER(position) = 'admin'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
    AND role IN ('CTO', 'ADMIN', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = user_uuid
    AND role IN ('cto', 'admin', 'ceo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.cto_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_training_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_training_audit ENABLE ROW LEVEL SECURITY;

-- Training modules, lessons, steps, quizzes: CTO and ADMIN can view
DROP POLICY IF EXISTS "CTO and ADMIN can view training content" ON public.cto_training_modules;
CREATE POLICY "CTO and ADMIN can view training content"
ON public.cto_training_modules FOR SELECT
TO authenticated
USING (public.is_cto_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CTO and ADMIN can view lessons" ON public.cto_training_lessons;
CREATE POLICY "CTO and ADMIN can view lessons"
ON public.cto_training_lessons FOR SELECT
TO authenticated
USING (public.is_cto_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CTO and ADMIN can view steps" ON public.cto_training_steps;
CREATE POLICY "CTO and ADMIN can view steps"
ON public.cto_training_steps FOR SELECT
TO authenticated
USING (public.is_cto_or_admin(auth.uid()));

DROP POLICY IF EXISTS "CTO and ADMIN can view quizzes" ON public.cto_training_quizzes;
CREATE POLICY "CTO and ADMIN can view quizzes"
ON public.cto_training_quizzes FOR SELECT
TO authenticated
USING (public.is_cto_or_admin(auth.uid()));

-- Training progress: Users can view and manage their own progress
DROP POLICY IF EXISTS "Users can view own CTO progress" ON public.cto_training_progress;
CREATE POLICY "Users can view own CTO progress"
ON public.cto_training_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_cto_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own CTO progress" ON public.cto_training_progress;
CREATE POLICY "Users can manage own CTO progress"
ON public.cto_training_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.is_cto_or_admin(auth.uid()));

-- Training audit: Users can view their own audit log, CTO/ADMIN can view all
DROP POLICY IF EXISTS "Users can view own CTO audit log" ON public.cto_training_audit;
CREATE POLICY "Users can view own CTO audit log"
ON public.cto_training_audit FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_cto_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create own CTO audit entries" ON public.cto_training_audit;
CREATE POLICY "Users can create own CTO audit entries"
ON public.cto_training_audit FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_cto_or_admin(auth.uid()));



