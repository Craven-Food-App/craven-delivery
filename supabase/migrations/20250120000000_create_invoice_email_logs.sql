-- ================================================
-- Invoice Email Processing Logs
-- ================================================
-- Tracks emails received at invoices@cravenusa.com
-- and their processing status
-- ================================================

-- Track email-to-invoice processing
CREATE TABLE IF NOT EXISTS public.invoice_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  email_from TEXT NOT NULL,
  email_to TEXT,
  email_subject TEXT,
  email_received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'requires_review')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_invoice ON public.invoice_email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_status ON public.invoice_email_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_from ON public.invoice_email_logs(email_from);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_received ON public.invoice_email_logs(email_received_at DESC);

-- RLS Policies
ALTER TABLE public.invoice_email_logs ENABLE ROW LEVEL SECURITY;

-- Finance users can view email logs
CREATE POLICY "Finance users can view invoice email logs"
ON public.invoice_email_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid() 
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.finance_employees fe
    JOIN public.employees e ON fe.employee_id = e.id
    WHERE e.user_id = auth.uid()
    AND fe.can_view_all_financials = true
  )
);

-- Service role can manage all logs
CREATE POLICY "Service role can manage invoice email logs"
ON public.invoice_email_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.invoice_email_logs IS 'Tracks emails received at invoices@cravenusa.com and their processing into invoice records';

