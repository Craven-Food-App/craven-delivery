-- Add feeder_hero_image_url column to marketing_settings table
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS feeder_hero_image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.marketing_settings.feeder_hero_image_url IS 'URL of the hero image displayed on the /feeder page (right side of split-screen hero section)';

