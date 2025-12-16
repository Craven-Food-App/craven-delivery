-- Intern Work & Execution System
-- Tasks, deliverables, file uploads, and activity tracking

-- 1. Intern Tasks Table
CREATE TABLE IF NOT EXISTS public.intern_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('development', 'training', 'project', 'research', 'documentation', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'completed', 'blocked')) DEFAULT 'todo',
  assigned_by UUID REFERENCES auth.users(id),
  due_date DATE,
  estimated_hours NUMERIC(5, 2),
  actual_hours NUMERIC(5, 2),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  parent_task_id UUID REFERENCES public.intern_tasks(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Intern Deliverables Table
CREATE TABLE IF NOT EXISTS public.intern_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.intern_tasks(id) ON DELETE CASCADE,
  intern_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('document', 'code', 'presentation', 'report', 'design', 'other')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested')) DEFAULT 'draft',
  submission_url TEXT,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Deliverable Files Table
CREATE TABLE IF NOT EXISTS public.intern_deliverable_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.intern_deliverables(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Intern Activity Log Table
CREATE TABLE IF NOT EXISTS public.intern_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'task_created', 'task_updated', 'task_completed', 'task_started',
    'deliverable_submitted', 'deliverable_approved', 'deliverable_rejected',
    'file_uploaded', 'comment_added', 'check_in', 'check_out',
    'training_completed', 'milestone_reached'
  )),
  entity_type TEXT, -- 'task', 'deliverable', 'file', etc.
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Task Comments Table
CREATE TABLE IF NOT EXISTS public.intern_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.intern_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Manager-only comments
  parent_comment_id UUID REFERENCES public.intern_task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intern_tasks_user ON public.intern_tasks(intern_user_id);
CREATE INDEX IF NOT EXISTS idx_intern_tasks_status ON public.intern_tasks(status);
CREATE INDEX IF NOT EXISTS idx_intern_tasks_due_date ON public.intern_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_intern_tasks_priority ON public.intern_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_intern_deliverables_task ON public.intern_deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_intern_deliverables_user ON public.intern_deliverables(intern_user_id);
CREATE INDEX IF NOT EXISTS idx_intern_deliverables_status ON public.intern_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_intern_activity_user ON public.intern_activity_logs(intern_user_id);
CREATE INDEX IF NOT EXISTS idx_intern_activity_type ON public.intern_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_intern_activity_created ON public.intern_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intern_comments_task ON public.intern_task_comments(task_id);

-- Enable RLS
ALTER TABLE public.intern_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_deliverable_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intern_tasks
CREATE POLICY "Interns can view their own tasks"
  ON public.intern_tasks FOR SELECT
  USING (
    intern_user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Interns can create their own tasks"
  ON public.intern_tasks FOR INSERT
  WITH CHECK (
    intern_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Interns can update their own tasks"
  ON public.intern_tasks FOR UPDATE
  USING (
    intern_user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can delete tasks"
  ON public.intern_tasks FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- RLS Policies for intern_deliverables
CREATE POLICY "Users can view deliverables"
  ON public.intern_deliverables FOR SELECT
  USING (
    intern_user_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Interns can create deliverables"
  ON public.intern_deliverables FOR INSERT
  WITH CHECK (
    intern_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Users can update deliverables"
  ON public.intern_deliverables FOR UPDATE
  USING (
    intern_user_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- RLS Policies for intern_deliverable_files
CREATE POLICY "Users can view deliverable files"
  ON public.intern_deliverable_files FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.intern_deliverables d
      WHERE d.id = deliverable_id AND (d.intern_user_id = auth.uid() OR d.reviewer_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Users can upload deliverable files"
  ON public.intern_deliverable_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- RLS Policies for intern_activity_logs
CREATE POLICY "Users can view their own activity"
  ON public.intern_activity_logs FOR SELECT
  USING (
    intern_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'hr'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert activity logs"
  ON public.intern_activity_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for intern_task_comments
CREATE POLICY "Users can view comments"
  ON public.intern_task_comments FOR SELECT
  USING (
    NOT is_internal
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create comments"
  ON public.intern_task_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON public.intern_task_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_intern_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
    VALUES (NEW.intern_user_id, 'task_created', 'task', NEW.id, 'Created task: ' || NEW.title, jsonb_build_object('title', NEW.title, 'category', NEW.category));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'task_completed', 'task', NEW.id, 'Completed task: ' || NEW.title, jsonb_build_object('title', NEW.title));
      ELSIF NEW.status = 'in_progress' AND OLD.status IN ('backlog', 'todo') THEN
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'task_started', 'task', NEW.id, 'Started working on: ' || NEW.title, jsonb_build_object('title', NEW.title));
      ELSE
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'task_updated', 'task', NEW.id, 'Updated task status to ' || NEW.status || ': ' || NEW.title, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task activity logging
DROP TRIGGER IF EXISTS trigger_log_intern_task_activity ON public.intern_tasks;
CREATE TRIGGER trigger_log_intern_task_activity
  AFTER INSERT OR UPDATE ON public.intern_tasks
  FOR EACH ROW EXECUTE FUNCTION log_intern_task_activity();

-- Function to log deliverable activity
CREATE OR REPLACE FUNCTION log_intern_deliverable_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'submitted' THEN
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'deliverable_submitted', 'deliverable', NEW.id, 'Submitted deliverable: ' || NEW.title, jsonb_build_object('title', NEW.title, 'type', NEW.deliverable_type));
      ELSIF NEW.status = 'approved' THEN
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'deliverable_approved', 'deliverable', NEW.id, 'Deliverable approved: ' || NEW.title, jsonb_build_object('title', NEW.title, 'reviewer_notes', NEW.reviewer_notes));
      ELSIF NEW.status = 'rejected' THEN
        INSERT INTO public.intern_activity_logs (intern_user_id, activity_type, entity_type, entity_id, description, metadata)
        VALUES (NEW.intern_user_id, 'deliverable_rejected', 'deliverable', NEW.id, 'Deliverable needs revision: ' || NEW.title, jsonb_build_object('title', NEW.title, 'reviewer_notes', NEW.reviewer_notes));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for deliverable activity logging
DROP TRIGGER IF EXISTS trigger_log_intern_deliverable_activity ON public.intern_deliverables;
CREATE TRIGGER trigger_log_intern_deliverable_activity
  AFTER UPDATE ON public.intern_deliverables
  FOR EACH ROW EXECUTE FUNCTION log_intern_deliverable_activity();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_intern_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_intern_tasks_updated_at ON public.intern_tasks;
CREATE TRIGGER trigger_update_intern_tasks_updated_at
  BEFORE UPDATE ON public.intern_tasks
  FOR EACH ROW EXECUTE FUNCTION update_intern_updated_at();

DROP TRIGGER IF EXISTS trigger_update_intern_deliverables_updated_at ON public.intern_deliverables;
CREATE TRIGGER trigger_update_intern_deliverables_updated_at
  BEFORE UPDATE ON public.intern_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_intern_updated_at();

DROP TRIGGER IF EXISTS trigger_update_intern_comments_updated_at ON public.intern_task_comments;
CREATE TRIGGER trigger_update_intern_comments_updated_at
  BEFORE UPDATE ON public.intern_task_comments
  FOR EACH ROW EXECUTE FUNCTION update_intern_updated_at();


