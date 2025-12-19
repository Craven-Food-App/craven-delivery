-- =====================================================
-- INTERN PROGRAM DATABASE SCHEMA
-- Created: December 18, 2025
-- Purpose: Replace all mock data with real database tables
-- =====================================================

-- =====================================================
-- 1. INTERN TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'training', 'project', 'administrative', 'development')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
  assigned_by UUID REFERENCES public.employees(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_tasks_intern_id ON public.intern_tasks(intern_id);
CREATE INDEX idx_intern_tasks_status ON public.intern_tasks(status);
CREATE INDEX idx_intern_tasks_due_date ON public.intern_tasks(due_date);

-- =====================================================
-- 2. INTERN DELIVERABLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.intern_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('document', 'code', 'presentation', 'report', 'design', 'other')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.employees(id),
  feedback TEXT,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_deliverables_intern_id ON public.intern_deliverables(intern_id);
CREATE INDEX idx_intern_deliverables_status ON public.intern_deliverables(status);

-- =====================================================
-- 3. INTERN ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('task_started', 'task_completed', 'deliverable_submitted', 'meeting_attended', 'training_completed', 'feedback_received', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  related_task_id UUID REFERENCES public.intern_tasks(id) ON DELETE SET NULL,
  related_deliverable_id UUID REFERENCES public.intern_deliverables(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_activity_logs_intern_id ON public.intern_activity_logs(intern_id);
CREATE INDEX idx_intern_activity_logs_created_at ON public.intern_activity_logs(created_at DESC);

-- =====================================================
-- 4. INTERN TIME LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  task_id UUID REFERENCES public.intern_tasks(id) ON DELETE SET NULL,
  description TEXT,
  activity_type TEXT CHECK (activity_type IN ('project_work', 'training', 'meetings', 'research', 'documentation', 'other')),
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_time_logs_intern_id ON public.intern_time_logs(intern_id);
CREATE INDEX idx_intern_time_logs_log_date ON public.intern_time_logs(log_date DESC);
CREATE INDEX idx_intern_time_logs_approved ON public.intern_time_logs(approved);

-- =====================================================
-- 5. INTERN EVALUATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('onboarding', 'mid_term', 'final', 'quarterly', 'ad_hoc')),
  evaluator_id UUID NOT NULL REFERENCES public.employees(id),
  evaluation_date DATE NOT NULL,
  overall_score DECIMAL(3,2) CHECK (overall_score >= 0 AND overall_score <= 5),
  technical_skills_score DECIMAL(3,2) CHECK (technical_skills_score >= 0 AND technical_skills_score <= 5),
  communication_score DECIMAL(3,2) CHECK (communication_score >= 0 AND communication_score <= 5),
  teamwork_score DECIMAL(3,2) CHECK (teamwork_score >= 0 AND teamwork_score <= 5),
  initiative_score DECIMAL(3,2) CHECK (initiative_score >= 0 AND initiative_score <= 5),
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_for_next_period TEXT,
  evaluator_comments TEXT,
  intern_comments TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'reviewed', 'acknowledged')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_evaluations_intern_id ON public.intern_evaluations(intern_id);
CREATE INDEX idx_intern_evaluations_evaluation_date ON public.intern_evaluations(evaluation_date DESC);

-- =====================================================
-- 6. INTERN KPIs TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  kpi_description TEXT,
  category TEXT CHECK (category IN ('productivity', 'quality', 'learning', 'collaboration', 'attendance', 'custom')),
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT, -- e.g., 'tasks', 'hours', 'percentage', 'count'
  measurement_period TEXT CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'program')),
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_kpis_intern_id ON public.intern_kpis(intern_id);
CREATE INDEX idx_intern_kpis_status ON public.intern_kpis(status);

-- =====================================================
-- 7. INTERN GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT CHECK (goal_type IN ('learning', 'project', 'skill_development', 'career', 'performance')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  target_date DATE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'on_track', 'at_risk', 'completed', 'abandoned')) DEFAULT 'not_started',
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100) DEFAULT 0,
  milestones JSONB, -- Array of milestone objects
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_goals_intern_id ON public.intern_goals(intern_id);
CREATE INDEX idx_intern_goals_status ON public.intern_goals(status);

-- =====================================================
-- 8. INTERN FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  feedback_from UUID NOT NULL REFERENCES public.employees(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'constructive', 'general', 'urgent')),
  category TEXT CHECK (category IN ('technical', 'communication', 'teamwork', 'attitude', 'quality', 'other')),
  title TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_feedback_intern_id ON public.intern_feedback(intern_id);
CREATE INDEX idx_intern_feedback_created_at ON public.intern_feedback(created_at DESC);

-- =====================================================
-- 9. INTERN SKILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT CHECK (skill_category IN ('technical', 'soft', 'domain', 'tool', 'language')),
  proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5) DEFAULT 1,
  target_level INTEGER CHECK (target_level >= 1 AND target_level <= 5),
  last_assessed_at TIMESTAMPTZ,
  assessed_by UUID REFERENCES public.employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intern_id, skill_name)
);

CREATE INDEX idx_intern_skills_intern_id ON public.intern_skills(intern_id);

-- =====================================================
-- 10. INTERN ACADEMIC CREDIT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_academic_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  program_name TEXT,
  academic_advisor_name TEXT,
  academic_advisor_email TEXT,
  total_credits_required DECIMAL(5,2),
  total_credits_earned DECIMAL(5,2) DEFAULT 0,
  credit_type TEXT CHECK (credit_type IN ('undergraduate', 'graduate', 'certificate', 'other')),
  semester TEXT,
  academic_year TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'withdrawn')) DEFAULT 'active',
  final_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_academic_credits_intern_id ON public.intern_academic_credits(intern_id);

-- =====================================================
-- 11. INTERN ACADEMIC DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_academic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_credit_id UUID NOT NULL REFERENCES public.intern_academic_credits(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('learning_agreement', 'progress_report', 'final_report', 'evaluation_form', 'transcript', 'other')),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.employees(id),
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_academic_documents_credit_id ON public.intern_academic_documents(academic_credit_id);

-- =====================================================
-- 12. INTERN CONVERSION PATHWAY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_conversion_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_position_code TEXT,
  target_department TEXT,
  eligibility_status TEXT CHECK (eligibility_status IN ('not_eligible', 'in_progress', 'eligible', 'approved', 'declined')) DEFAULT 'not_eligible',
  days_completed INTEGER DEFAULT 0,
  required_days INTEGER DEFAULT 90,
  performance_score DECIMAL(3,2),
  required_performance_score DECIMAL(3,2) DEFAULT 4.0,
  manager_approval BOOLEAN DEFAULT FALSE,
  manager_approved_by UUID REFERENCES public.employees(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approval BOOLEAN DEFAULT FALSE,
  hr_approved_by UUID REFERENCES public.employees(id),
  hr_approved_at TIMESTAMPTZ,
  executive_approval BOOLEAN DEFAULT FALSE,
  executive_approved_by UUID REFERENCES public.employees(id),
  executive_approved_at TIMESTAMPTZ,
  offer_extended BOOLEAN DEFAULT FALSE,
  offer_extended_at TIMESTAMPTZ,
  offer_accepted BOOLEAN,
  offer_accepted_at TIMESTAMPTZ,
  conversion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_conversion_pathways_intern_id ON public.intern_conversion_pathways(intern_id);
CREATE INDEX idx_intern_conversion_pathways_eligibility_status ON public.intern_conversion_pathways(eligibility_status);

-- =====================================================
-- 13. INTERN OFFBOARDING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_offboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  exit_type TEXT CHECK (exit_type IN ('program_completion', 'resignation', 'termination', 'conversion_to_fte')) NOT NULL,
  exit_date DATE NOT NULL,
  last_working_day DATE,
  exit_reason TEXT,
  eligible_for_rehire BOOLEAN,
  assets_returned BOOLEAN DEFAULT FALSE,
  access_revoked BOOLEAN DEFAULT FALSE,
  exit_interview_completed BOOLEAN DEFAULT FALSE,
  exit_interview_date DATE,
  exit_interview_notes TEXT,
  final_evaluation_completed BOOLEAN DEFAULT FALSE,
  recommendation_letter_requested BOOLEAN DEFAULT FALSE,
  recommendation_letter_provided BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('initiated', 'in_progress', 'completed')) DEFAULT 'initiated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_offboarding_intern_id ON public.intern_offboarding(intern_id);
CREATE INDEX idx_intern_offboarding_exit_date ON public.intern_offboarding(exit_date DESC);

-- =====================================================
-- 14. INTERN OFFBOARDING CHECKLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intern_offboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id UUID NOT NULL REFERENCES public.intern_offboarding(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  category TEXT CHECK (category IN ('assets', 'access', 'documentation', 'knowledge_transfer', 'administrative', 'other')),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable')) DEFAULT 'pending',
  completed_by UUID REFERENCES public.employees(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intern_offboarding_checklist_offboarding_id ON public.intern_offboarding_checklist(offboarding_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.intern_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_academic_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_academic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_conversion_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_offboarding_checklist ENABLE ROW LEVEL SECURITY;

-- Interns can view their own data
CREATE POLICY "Interns can view own tasks" ON public.intern_tasks FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own deliverables" ON public.intern_deliverables FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own activity logs" ON public.intern_activity_logs FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own time logs" ON public.intern_time_logs FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own evaluations" ON public.intern_evaluations FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own KPIs" ON public.intern_kpis FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own goals" ON public.intern_goals FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own feedback" ON public.intern_feedback FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own skills" ON public.intern_skills FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own academic credits" ON public.intern_academic_credits FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own academic documents" ON public.intern_academic_documents FOR SELECT USING (academic_credit_id IN (SELECT id FROM public.intern_academic_credits WHERE intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())));
CREATE POLICY "Interns can view own conversion pathway" ON public.intern_conversion_pathways FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Interns can view own offboarding" ON public.intern_offboarding FOR SELECT USING (intern_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Managers and HR can view all intern data
CREATE POLICY "Managers can view all intern data" ON public.intern_tasks FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all deliverables" ON public.intern_deliverables FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all activity logs" ON public.intern_activity_logs FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all time logs" ON public.intern_time_logs FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all evaluations" ON public.intern_evaluations FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all KPIs" ON public.intern_kpis FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all goals" ON public.intern_goals FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all feedback" ON public.intern_feedback FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all skills" ON public.intern_skills FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all academic credits" ON public.intern_academic_credits FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all academic documents" ON public.intern_academic_documents FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all conversion pathways" ON public.intern_conversion_pathways FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all offboarding" ON public.intern_offboarding FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));
CREATE POLICY "Managers can view all offboarding checklists" ON public.intern_offboarding_checklist FOR ALL USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%Manager%' OR position LIKE '%HR%' OR position LIKE '%Executive%'));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_intern_tasks_updated_at BEFORE UPDATE ON public.intern_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_deliverables_updated_at BEFORE UPDATE ON public.intern_deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_time_logs_updated_at BEFORE UPDATE ON public.intern_time_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_evaluations_updated_at BEFORE UPDATE ON public.intern_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_kpis_updated_at BEFORE UPDATE ON public.intern_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_goals_updated_at BEFORE UPDATE ON public.intern_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_skills_updated_at BEFORE UPDATE ON public.intern_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_academic_credits_updated_at BEFORE UPDATE ON public.intern_academic_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_conversion_pathways_updated_at BEFORE UPDATE ON public.intern_conversion_pathways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intern_offboarding_updated_at BEFORE UPDATE ON public.intern_offboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.intern_tasks IS 'Tasks assigned to interns throughout their program';
COMMENT ON TABLE public.intern_deliverables IS 'Work products and deliverables submitted by interns';
COMMENT ON TABLE public.intern_activity_logs IS 'Activity history and timeline for intern progress';
COMMENT ON TABLE public.intern_time_logs IS 'Time tracking for intern hours worked';
COMMENT ON TABLE public.intern_evaluations IS 'Performance evaluations and reviews';
COMMENT ON TABLE public.intern_kpis IS 'Key Performance Indicators for measuring intern success';
COMMENT ON TABLE public.intern_goals IS 'Personal and professional goals set by/for interns';
COMMENT ON TABLE public.intern_feedback IS 'Feedback provided to interns from managers and peers';
COMMENT ON TABLE public.intern_skills IS 'Skills assessment and development tracking';
COMMENT ON TABLE public.intern_academic_credits IS 'Academic credit information for school programs';
COMMENT ON TABLE public.intern_academic_documents IS 'Documents related to academic credit';
COMMENT ON TABLE public.intern_conversion_pathways IS 'Pathway tracking for intern-to-employee conversion';
COMMENT ON TABLE public.intern_offboarding IS 'Offboarding process tracking for departing interns';
COMMENT ON TABLE public.intern_offboarding_checklist IS 'Checklist items for intern offboarding';

