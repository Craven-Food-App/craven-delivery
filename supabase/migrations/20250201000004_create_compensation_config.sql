-- Create compensation_config table for driver compensation settings
CREATE TABLE IF NOT EXISTS public.compensation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_percentage NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
  minimum_per_delivery INTEGER NOT NULL DEFAULT 200, -- in cents
  peak_hour_multiplier NUMERIC(3, 2) DEFAULT 1.5,
  surge_multiplier NUMERIC(3, 2) DEFAULT 1.0,
  bonus_per_delivery INTEGER DEFAULT 0, -- in cents
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add comment
COMMENT ON TABLE public.compensation_config IS 'Configuration for driver compensation structure including base percentage, minimums, and multipliers';

-- Enable RLS
ALTER TABLE public.compensation_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active compensation config"
  ON public.compensation_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage compensation config"
  ON public.compensation_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'finance', 'ceo')
    )
  );

-- Insert default configuration
INSERT INTO public.compensation_config (
  base_percentage,
  minimum_per_delivery,
  peak_hour_multiplier,
  surge_multiplier,
  bonus_per_delivery,
  description,
  is_active
) VALUES (
  70.00,
  200,
  1.5,
  1.0,
  0,
  'Default driver compensation configuration',
  true
) ON CONFLICT DO NOTHING;

