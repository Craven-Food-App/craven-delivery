-- Add foundational_support_hero_image_url field to marketing_settings
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS foundational_support_hero_image_url TEXT;

COMMENT ON COLUMN public.marketing_settings.foundational_support_hero_image_url IS
  'Hero image URL for the Foundational Invites support page (/support). Controlled via Marketing Portal.';

