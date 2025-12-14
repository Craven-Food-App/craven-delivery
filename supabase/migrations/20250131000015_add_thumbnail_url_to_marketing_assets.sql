-- Add thumbnail_url column to marketing_assets table
-- This migration adds support for video thumbnails

-- Add thumbnail_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketing_assets' 
    AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.marketing_assets 
    ADD COLUMN thumbnail_url TEXT;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.marketing_assets.thumbnail_url IS 'Thumbnail/preview image URL for videos';



