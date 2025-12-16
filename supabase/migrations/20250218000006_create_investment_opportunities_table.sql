-- Investment Opportunities Table
-- For investor-ready pitch pages

CREATE TABLE IF NOT EXISTS public.investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  short_summary TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  target_amount NUMERIC(12, 2) NOT NULL,
  minimum_investment NUMERIC(12, 2) NOT NULL,
  investment_raised NUMERIC(12, 2) DEFAULT 0,
  previous_rounds NUMERIC(12, 2) DEFAULT 0,
  stage TEXT NOT NULL,
  investor_role TEXT NOT NULL,
  business_description TEXT,
  market_description TEXT,
  progress_description TEXT,
  objectives_description TEXT,
  why_we_win TEXT,
  deal_description TEXT,
  video_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  financials JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  team_members JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_opportunities_active ON public.investment_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_investment_opportunities_created ON public.investment_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_opportunities_tags ON public.investment_opportunities USING GIN(tags);

-- Enable RLS
ALTER TABLE public.investment_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view active investment opportunities" ON public.investment_opportunities;
CREATE POLICY "Anyone can view active investment opportunities"
  ON public.investment_opportunities FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage investment opportunities" ON public.investment_opportunities;
CREATE POLICY "Admins can manage investment opportunities"
  ON public.investment_opportunities FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
  );

COMMENT ON TABLE public.investment_opportunities IS 'Investment opportunity pitches for investor-ready pages';


