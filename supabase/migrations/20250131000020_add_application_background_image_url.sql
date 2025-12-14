-- Add application_background_image_url column to marketing_settings table
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS application_background_image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.marketing_settings.application_background_image_url IS 'URL for the background image displayed on the "Apply to Drive with Crave''n" application page (/driver-onboarding/apply).';


