-- Intern Academic Credit Module
-- Tables for academic credit tracking, documents, time logs, and evaluations

-- 1. Intern Academic Credit (main record)
CREATE TABLE IF NOT EXISTS public.intern_academic_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_status TEXT NOT NULL CHECK (credit_status IN ('not_seeking', 'seeking_pending', 'approved', 'completed')) DEFAULT 'not_seeking',
  school_name TEXT,
  department TEXT,
  program TEXT,
  course_code TEXT,
  term TEXT,
  required_hours INT CHECK (required_hours IS NULL OR required_hours >= 80),
  weekly_min_hours INT,
  approval_deadline DATE,
  faculty_name TEXT,
  faculty_email TEXT,
  supervisor_id UUID REFERENCES auth.users(id),
  supervisor_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(intern_id) -- One academic credit record per intern
);

-- 2. Intern Credit Documents
CREATE TABLE IF NOT EXISTS public.intern_credit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_credit_id UUID NOT NULL REFERENCES public.intern_academic_credit(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('learning_agreement', 'syllabus', 'faculty_approval', 'university_form', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('intern', 'supervisor', 'admin')),
  uploader_id UUID REFERENCES auth.users(id),
  approval_status TEXT NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Intern Time Logs (weekly hour tracking)
CREATE TABLE IF NOT EXISTS public.intern_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_credit_id UUID NOT NULL REFERENCES public.intern_academic_credit(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 168),
  tasks_performed TEXT,
  learning_outcomes TEXT,
  intern_attestation BOOLEAN DEFAULT FALSE,
  intern_attested_at TIMESTAMP WITH TIME ZONE,
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(intern_credit_id, week_start) -- One log per week per credit record
);

-- 4. Intern Evaluations (midterm and final)
CREATE TABLE IF NOT EXISTS public.intern_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_credit_id UUID NOT NULL REFERENCES public.intern_academic_credit(id) ON DELETE CASCADE,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('midterm', 'final')),
  professionalism INT CHECK (professionalism >= 1 AND professionalism <= 5),
  skill_development INT CHECK (skill_development >= 1 AND skill_development <= 5),
  learning_progress INT CHECK (learning_progress >= 1 AND learning_progress <= 5),
  attendance INT CHECK (attendance >= 1 AND attendance <= 5),
  overall_performance INT CHECK (overall_performance >= 1 AND overall_performance <= 5),
  feedback TEXT,
  total_hours_verified INT,
  credit_recommendation TEXT CHECK (credit_recommendation IN ('satisfactory', 'unsatisfactory')),
  supervisor_signature TEXT,
  supervisor_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(intern_credit_id, evaluation_type) -- One of each type per credit record
);

-- 5. Academic Credit Audit Log
CREATE TABLE IF NOT EXISTS public.intern_credit_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_credit_id UUID NOT NULL REFERENCES public.intern_academic_credit(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.intern_academic_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_credit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_credit_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intern_academic_credit
CREATE POLICY "Interns can view their own academic credit"
  ON public.intern_academic_credit FOR SELECT
  USING (intern_id = auth.uid());

CREATE POLICY "Interns can insert their own academic credit"
  ON public.intern_academic_credit FOR INSERT
  WITH CHECK (intern_id = auth.uid());

CREATE POLICY "Interns can update their own academic credit (limited fields)"
  ON public.intern_academic_credit FOR UPDATE
  USING (intern_id = auth.uid());

-- RLS Policies for intern_credit_documents
CREATE POLICY "Interns can view their own documents"
  ON public.intern_credit_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

CREATE POLICY "Interns can upload their own documents"
  ON public.intern_credit_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

-- RLS Policies for intern_time_logs
CREATE POLICY "Interns can view their own time logs"
  ON public.intern_time_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

CREATE POLICY "Interns can insert their own time logs"
  ON public.intern_time_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

CREATE POLICY "Interns can update unapproved time logs"
  ON public.intern_time_logs FOR UPDATE
  USING (
    supervisor_approved = FALSE AND
    EXISTS (
      SELECT 1 FROM public.intern_academic_credit 
      WHERE id = intern_credit_id AND intern_id = auth.uid()
    )
  );

-- RLS Policies for intern_evaluations (supervisor/admin only for write)
CREATE POLICY "Interns can view their own evaluations"
  ON public.intern_evaluations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

-- RLS Policies for audit log
CREATE POLICY "Interns can view their own audit logs"
  ON public.intern_credit_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.intern_academic_credit 
    WHERE id = intern_credit_id AND intern_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_intern_academic_credit_intern_id ON public.intern_academic_credit(intern_id);
CREATE INDEX idx_intern_academic_credit_status ON public.intern_academic_credit(credit_status);
CREATE INDEX idx_intern_credit_documents_credit_id ON public.intern_credit_documents(intern_credit_id);
CREATE INDEX idx_intern_time_logs_credit_id ON public.intern_time_logs(intern_credit_id);
CREATE INDEX idx_intern_time_logs_week ON public.intern_time_logs(week_start, week_end);
CREATE INDEX idx_intern_evaluations_credit_id ON public.intern_evaluations(intern_credit_id);
CREATE INDEX idx_intern_credit_audit_log_credit_id ON public.intern_credit_audit_log(intern_credit_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_academic_credit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intern_academic_credit_timestamp
  BEFORE UPDATE ON public.intern_academic_credit
  FOR EACH ROW EXECUTE FUNCTION public.update_academic_credit_timestamp();

CREATE TRIGGER update_intern_time_logs_timestamp
  BEFORE UPDATE ON public.intern_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_academic_credit_timestamp();

CREATE TRIGGER update_intern_evaluations_timestamp
  BEFORE UPDATE ON public.intern_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_academic_credit_timestamp();

-- Audit log trigger for academic credit changes
CREATE OR REPLACE FUNCTION public.log_academic_credit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.credit_status IS DISTINCT FROM OLD.credit_status) THEN
      INSERT INTO public.intern_credit_audit_log (intern_credit_id, action, field_changed, old_value, new_value, performed_by)
      VALUES (NEW.id, 'status_change', 'credit_status', OLD.credit_status, NEW.credit_status, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_academic_credit_changes_trigger
  AFTER UPDATE ON public.intern_academic_credit
  FOR EACH ROW EXECUTE FUNCTION public.log_academic_credit_changes();

-- Function to calculate total approved hours
CREATE OR REPLACE FUNCTION public.get_total_approved_hours(credit_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(hours_worked), 0)
  FROM public.intern_time_logs
  WHERE intern_credit_id = credit_id AND supervisor_approved = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to check if credit can be completed
CREATE OR REPLACE FUNCTION public.can_complete_credit(credit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  credit_record RECORD;
  total_hours DECIMAL;
  has_final_eval BOOLEAN;
BEGIN
  SELECT * INTO credit_record FROM public.intern_academic_credit WHERE id = credit_id;
  
  IF credit_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get total approved hours
  total_hours := public.get_total_approved_hours(credit_id);
  
  -- Check for final evaluation with signature
  SELECT EXISTS(
    SELECT 1 FROM public.intern_evaluations 
    WHERE intern_credit_id = credit_id 
    AND evaluation_type = 'final' 
    AND supervisor_signature IS NOT NULL
  ) INTO has_final_eval;
  
  -- Must have required hours met AND final evaluation with signature
  RETURN total_hours >= COALESCE(credit_record.required_hours, 0) AND has_final_eval;
END;
$$ LANGUAGE plpgsql STABLE;


