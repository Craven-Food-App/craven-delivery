-- Marketing Assets Management System
-- Store metadata for marketing assets uploaded to Supabase Storage

CREATE TABLE IF NOT EXISTS public.marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset info
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_url TEXT NOT NULL, -- Public URL
  file_type TEXT NOT NULL, -- 'image', 'video', 'pdf', 'other'
  mime_type TEXT,
  file_size_bytes BIGINT NOT NULL,
  
  -- Organization
  folder TEXT NOT NULL DEFAULT 'general', -- 'general', 'campaigns', 'merchants', 'brand_guidelines', 'social_media'
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  description TEXT,
  alt_text TEXT, -- For images
  thumbnail_url TEXT, -- Thumbnail/preview image URL (for videos)
  
  -- Ownership
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_assets_folder ON public.marketing_assets(folder);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_type ON public.marketing_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_uploaded_by ON public.marketing_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_created_at ON public.marketing_assets(created_at DESC);

-- Enable RLS
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view marketing assets" ON public.marketing_assets;
DROP POLICY IF EXISTS "Marketing and admins can upload assets" ON public.marketing_assets;
DROP POLICY IF EXISTS "Marketing and admins can update assets" ON public.marketing_assets;
DROP POLICY IF EXISTS "Marketing and admins can delete assets" ON public.marketing_assets;

-- Everyone authenticated can view assets
CREATE POLICY "Authenticated users can view marketing assets"
  ON public.marketing_assets FOR SELECT
  TO authenticated
  USING (true);

-- Marketing and admins can insert assets
CREATE POLICY "Marketing and admins can upload assets"
  ON public.marketing_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'marketing'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Marketing and admins can update assets
CREATE POLICY "Marketing and admins can update assets"
  ON public.marketing_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'marketing'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Marketing and admins can delete assets
CREATE POLICY "Marketing and admins can delete assets"
  ON public.marketing_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'marketing'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketing_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_marketing_assets_updated_at ON public.marketing_assets;
CREATE TRIGGER trigger_marketing_assets_updated_at
  BEFORE UPDATE ON public.marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_assets_updated_at();

