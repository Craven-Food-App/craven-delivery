-- Enhanced Background Check Flow Migration
-- Adds fields for simulated background check processing and welcome celebration

-- Add new fields to craver_applications table
ALTER TABLE public.craver_applications
ADD COLUMN IF NOT EXISTS background_check_initiated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_estimated_completion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS welcome_screen_shown BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS background_check_auto_approved BOOLEAN DEFAULT false;

-- Add admin settings table for background check configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin settings RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can view settings'
  ) THEN
    CREATE POLICY "Admins can view settings" ON public.admin_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can manage settings'
  ) THEN
    CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Insert default background check delay setting
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'background_check_delay_days',
  '{"min": 1, "max": 5, "default": 3, "enabled": true}'::jsonb,
  'Number of days for simulated background check processing'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for efficient querying of pending background checks
CREATE INDEX IF NOT EXISTS idx_applications_background_check_pending
ON public.craver_applications (background_check_initiated_at, background_check_approved_at)
WHERE background_check_initiated_at IS NOT NULL AND background_check_approved_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.craver_applications.background_check_initiated_at IS 'Timestamp when background check was initiated';
COMMENT ON COLUMN public.craver_applications.background_check_approved_at IS 'Timestamp when admin approved the background check';
COMMENT ON COLUMN public.craver_applications.background_check_estimated_completion IS 'Estimated date when background check results will be available';
COMMENT ON COLUMN public.craver_applications.welcome_screen_shown IS 'Whether the welcome confetti screen has been shown to the user';
COMMENT ON COLUMN public.craver_applications.background_check_auto_approved IS 'Whether the background check was auto-approved (vs manual)';

-- Update existing applications to have background check initiated if status is pending/under_review
UPDATE public.craver_applications
SET background_check_initiated_at = created_at,
    background_check_estimated_completion = created_at + INTERVAL '3 days'
WHERE status IN ('pending', 'under_review') 
  AND background_check_initiated_at IS NULL;

