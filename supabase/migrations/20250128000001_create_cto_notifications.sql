-- CTO Portal Notifications Table
-- Stores in-app notifications for the CTO Portal

CREATE TABLE IF NOT EXISTS public.cto_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('incident', 'sprint', 'review', 'infrastructure', 'budget', 'security')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cto_notifications_user_id ON public.cto_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_notifications_is_read ON public.cto_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_cto_notifications_created_at ON public.cto_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cto_notifications_type ON public.cto_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_cto_notifications_severity ON public.cto_notifications(severity);

ALTER TABLE public.cto_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.cto_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.cto_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for CTO users"
  ON public.cto_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    ) OR auth.uid() = user_id
  );










