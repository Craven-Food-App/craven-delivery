-- Create referral_video_content table for managing referral program videos
CREATE TABLE IF NOT EXISTS public.referral_video_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_type TEXT NOT NULL CHECK (referral_type IN ('customer', 'driver', 'restaurant')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add comment
COMMENT ON TABLE public.referral_video_content IS 'Video content displayed in referral program pages for different user types';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_referral_video_content_type_active 
  ON public.referral_video_content(referral_type, is_active, display_order);

-- Enable RLS
ALTER TABLE public.referral_video_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active videos
CREATE POLICY "Everyone can view active referral videos"
  ON public.referral_video_content FOR SELECT
  USING (is_active = true);

-- Admins and marketing can view all videos
CREATE POLICY "Admins and marketing can view all referral videos"
  ON public.referral_video_content FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins and marketing can manage videos
CREATE POLICY "Admins and marketing can manage referral videos"
  ON public.referral_video_content FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

