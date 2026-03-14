
-- Enums
CREATE TYPE public.internal_message_channel AS ENUM ('direct', 'group');
CREATE TYPE public.announcement_priority AS ENUM ('normal', 'urgent', 'critical');
CREATE TYPE public.internal_task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.internal_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Internal Messages
CREATE TABLE public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  channel public.internal_message_channel NOT NULL DEFAULT 'direct',
  parent_id UUID REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their messages"
  ON public.internal_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR auth.uid() = ANY(recipient_ids));

CREATE POLICY "Users can send messages"
  ON public.internal_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their messages"
  ON public.internal_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR auth.uid() = ANY(recipient_ids));

-- Message Attachments
CREATE TABLE public.internal_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read attachments for their messages"
  ON public.internal_message_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internal_messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR auth.uid() = ANY(m.recipient_ids))
  ));

CREATE POLICY "Users can upload attachments"
  ON public.internal_message_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Announcements
CREATE TABLE public.internal_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_by UUID[] NOT NULL DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read announcements"
  ON public.internal_announcements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Execs can create announcements"
  ON public.internal_announcements FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update announcements"
  ON public.internal_announcements FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR auth.uid() = ANY(read_by));

-- Internal Tasks
CREATE TABLE public.internal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.internal_messages(id) ON DELETE SET NULL,
  status public.internal_task_status NOT NULL DEFAULT 'pending',
  priority public.internal_task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see tasks assigned to or by them"
  ON public.internal_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Users can create tasks"
  ON public.internal_tasks FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can update their tasks"
  ON public.internal_tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-comms-files', 'internal-comms-files', false);

CREATE POLICY "Authenticated can upload comms files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'internal-comms-files');

CREATE POLICY "Authenticated can read comms files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internal-comms-files');

CREATE POLICY "Authenticated can delete own comms files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'internal-comms-files' AND (storage.foldername(name))[1] = auth.uid()::text);
