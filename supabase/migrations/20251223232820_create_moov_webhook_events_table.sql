-- Create table for logging Moov webhook events
-- This table stores all incoming webhook events for monitoring, debugging, and audit purposes

CREATE TABLE IF NOT EXISTS public.moov_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'success', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_moov_webhook_events_event_type ON public.moov_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_moov_webhook_events_event_id ON public.moov_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_moov_webhook_events_received_at ON public.moov_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_moov_webhook_events_processing_status ON public.moov_webhook_events(processing_status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.moov_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert/select (webhook handler needs this)
CREATE POLICY "Service role can manage webhook events"
ON public.moov_webhook_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.moov_webhook_events IS 'Stores all incoming Moov webhook events for monitoring and debugging';
COMMENT ON COLUMN public.moov_webhook_events.event_type IS 'Type of webhook event (e.g., account.created, payment.succeeded)';
COMMENT ON COLUMN public.moov_webhook_events.event_id IS 'Unique identifier for the event from Moov';
COMMENT ON COLUMN public.moov_webhook_events.payload IS 'Full webhook payload as JSON';
COMMENT ON COLUMN public.moov_webhook_events.processing_status IS 'Status of event processing: pending, success, or error';

