-- Add columns for additional appointment documents
-- These are required for complete legal appointment packages

ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS deferred_compensation_url TEXT,
ADD COLUMN IF NOT EXISTS confidentiality_ip_url TEXT,
ADD COLUMN IF NOT EXISTS stock_subscription_url TEXT;

COMMENT ON COLUMN public.executive_appointments.deferred_compensation_url IS 'URL to Deferred Compensation Addendum document';
COMMENT ON COLUMN public.executive_appointments.confidentiality_ip_url IS 'URL to Confidentiality & IP Assignment Agreement document';
COMMENT ON COLUMN public.executive_appointments.stock_subscription_url IS 'URL to Stock Subscription / Issuance Agreement document';




