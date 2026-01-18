-- Create ad_placements table for managing advertisement locations on pages
CREATE TABLE IF NOT EXISTS public.ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location identification
  page_path TEXT NOT NULL, -- e.g., '/restaurants', '/', '/restaurant/:id'
  placement_key TEXT NOT NULL, -- e.g., 'below_quick_picks', 'sidebar', 'header'
  placement_name TEXT NOT NULL, -- Human-readable name
  
  -- Ad content
  image_url TEXT,
  ad_code TEXT, -- HTML/JS code for third-party ad networks
  click_url TEXT, -- URL to navigate when clicked
  
  -- Display settings
  width INTEGER NOT NULL DEFAULT 380,
  height INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Targeting (optional)
  target_audience TEXT DEFAULT 'all', -- 'all', 'new_users', 'existing_users'
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique placement per page
  UNIQUE(page_path, placement_key)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ad_placements_page_path 
  ON public.ad_placements(page_path, placement_key);

CREATE INDEX IF NOT EXISTS idx_ad_placements_active 
  ON public.ad_placements(is_active, display_order) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ad_placements_valid_period 
  ON public.ad_placements(valid_from, valid_until);

-- Enable RLS
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view active ad placements" ON public.ad_placements;
DROP POLICY IF EXISTS "Admins can manage ad placements" ON public.ad_placements;

-- Policy: Anyone can read active ad placements
CREATE POLICY "Anyone can view active ad placements"
  ON public.ad_placements
  FOR SELECT
  USING (
    is_active = true 
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (valid_from IS NULL OR valid_from <= NOW())
  );

-- Policy: Admins can manage ad placements
-- Use existing is_admin() function (SECURITY DEFINER) to avoid RLS recursion
-- Also allow exec_users and check for craven@usa.com via is_craven_founder()
CREATE POLICY "Admins can manage ad placements"
  ON public.ad_placements
  FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
    )
    OR public.is_craven_founder()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_ad_placements_updated_at_trigger ON public.ad_placements;
CREATE TRIGGER update_ad_placements_updated_at_trigger
  BEFORE UPDATE ON public.ad_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_placements_updated_at();

