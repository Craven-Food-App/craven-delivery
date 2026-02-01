-- Ensure driver_surge_zones table exists with correct schema
-- This fixes the 400 Bad Request error when querying surge zones

-- Drop and recreate to ensure correct schema
DROP TABLE IF EXISTS public.driver_surge_zones CASCADE;

CREATE TABLE public.driver_surge_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  zone_name TEXT NOT NULL,
  city TEXT NOT NULL,
  
  -- Geographic bounds
  center_lat DECIMAL(10,8) NOT NULL,
  center_lng DECIMAL(11,8) NOT NULL,
  radius_miles DECIMAL(5,2) NOT NULL,
  
  -- Surge multiplier
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  demand_level TEXT CHECK (demand_level IN ('low', 'medium', 'high', 'very_high')) DEFAULT 'medium',
  
  -- Active times
  is_active BOOLEAN DEFAULT true,
  active_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.driver_surge_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active surge zones" 
  ON public.driver_surge_zones
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage surge zones" 
  ON public.driver_surge_zones
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'ceo')
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_driver_surge_zones_active 
  ON public.driver_surge_zones(is_active, active_until) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_driver_surge_zones_city 
  ON public.driver_surge_zones(city) 
  WHERE is_active = true;

