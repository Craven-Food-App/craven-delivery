-- Add independent_contractor_agreement_url column to marketing_settings table
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS independent_contractor_agreement_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.marketing_settings.independent_contractor_agreement_url IS 'URL for the Independent Contractor Agreement document displayed on the Feeder signup page.';

