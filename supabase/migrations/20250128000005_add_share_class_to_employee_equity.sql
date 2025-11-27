-- Add share_class and consideration_type columns to employee_equity table
-- These columns are referenced in UPDATE_TORRANCE_EQUITY.sql

ALTER TABLE public.employee_equity
  ADD COLUMN IF NOT EXISTS share_class TEXT DEFAULT 'Common',
  ADD COLUMN IF NOT EXISTS consideration_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.employee_equity.share_class IS 'Class of shares (e.g., Common, Preferred)';
COMMENT ON COLUMN public.employee_equity.consideration_type IS 'Type of consideration for the equity grant (e.g., Cash, Founder IP + Services)';

