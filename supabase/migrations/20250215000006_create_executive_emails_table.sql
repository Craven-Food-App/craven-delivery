-- Create executive_emails table for storing executive email messages
CREATE TABLE IF NOT EXISTS public.executive_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email metadata
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT NOT NULL,
  body TEXT,
  message TEXT, -- Alternative field name for body
  
  -- Email status
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive')),
  read BOOLEAN DEFAULT false,
  priority TEXT CHECK (priority IN ('high', 'low', 'normal')),
  
  -- Attachments (stored as JSON array of file paths/URLs)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Related entities
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  exec_user_id UUID REFERENCES public.exec_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Add comments
COMMENT ON TABLE public.executive_emails IS 'Stores email messages for executives in the business email system';
COMMENT ON COLUMN public.executive_emails.folder IS 'Email folder: inbox, sent, drafts, trash, or archive';
COMMENT ON COLUMN public.executive_emails.priority IS 'Email priority: high, low, or normal';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_executive_emails_recipient_email ON public.executive_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_executive_emails_sender_email ON public.executive_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_executive_emails_folder ON public.executive_emails(folder);
CREATE INDEX IF NOT EXISTS idx_executive_emails_created_at ON public.executive_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executive_emails_employee_id ON public.executive_emails(employee_id);
CREATE INDEX IF NOT EXISTS idx_executive_emails_exec_user_id ON public.executive_emails(exec_user_id);

-- Enable RLS
ALTER TABLE public.executive_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Executives and employees can view all emails (simplified for business email system)
CREATE POLICY "Executives and employees can view emails"
  ON public.executive_emails FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND employment_status = 'active'
    )
  );

-- Executives and employees can insert emails (send/compose)
CREATE POLICY "Executives and employees can create emails"
  ON public.executive_emails FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND employment_status = 'active'
    )
  );

-- Executives and employees can update emails
CREATE POLICY "Executives and employees can update emails"
  ON public.executive_emails FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND employment_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND employment_status = 'active'
    )
  );

-- Executives and employees can delete emails
CREATE POLICY "Executives and employees can delete emails"
  ON public.executive_emails FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND employment_status = 'active'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_executive_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_executive_emails_updated_at_trigger
  BEFORE UPDATE ON public.executive_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_executive_emails_updated_at();

