-- Fix missing columns in CEO Portal tables
-- This ensures review_notes and last_changed_at columns exist

-- Add review_notes to ceo_financial_approvals if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ceo_financial_approvals' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE public.ceo_financial_approvals 
    ADD COLUMN review_notes TEXT;
  END IF;
END $$;

-- Add last_changed_at to ceo_system_settings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ceo_system_settings' 
    AND column_name = 'last_changed_at'
  ) THEN
    ALTER TABLE public.ceo_system_settings 
    ADD COLUMN last_changed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ceo_financial_approvals_status 
ON public.ceo_financial_approvals(status);

CREATE INDEX IF NOT EXISTS idx_ceo_financial_approvals_reviewed_at 
ON public.ceo_financial_approvals(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_ceo_system_settings_category 
ON public.ceo_system_settings(category);








