-- Add partner_hero_image_url column to marketing_settings table
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS partner_hero_image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.marketing_settings.partner_hero_image_url IS 'URL of the hero image displayed on the /partner page';

