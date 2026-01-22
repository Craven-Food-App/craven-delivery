-- Product Management & Quality Assurance Tables
-- For Product Command Center and Quality & Release Portal

-- Product Features
CREATE TABLE IF NOT EXISTS public.product_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'testing', 'released', 'on-hold')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id),
  target_date DATE,
  product_area TEXT,
  epic_id UUID,
  story_points INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Test Cases
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pass', 'fail', 'pending', 'blocked', 'skipped')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  assigned_to TEXT, -- Team or user
  test_suite TEXT,
  feature_id UUID REFERENCES public.product_features(id),
  last_run TIMESTAMP WITH TIME ZONE,
  last_run_by UUID REFERENCES auth.users(id),
  execution_time_seconds INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Releases
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'testing', 'released', 'rolled-back')),
  release_date DATE,
  test_coverage_percent NUMERIC(5,2),
  release_notes TEXT,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Release Features (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.release_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES public.product_features(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(release_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Product Features
CREATE POLICY "Authenticated users can view features"
  ON public.product_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CTO and product managers can manage features"
  ON public.product_features FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies - Test Cases
CREATE POLICY "Authenticated users can view test cases"
  ON public.test_cases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CTO and QA can manage test cases"
  ON public.test_cases FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies - Releases
CREATE POLICY "Authenticated users can view releases"
  ON public.releases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CTO can manage releases"
  ON public.releases FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies - Release Features
CREATE POLICY "Authenticated users can view release features"
  ON public.release_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CTO can manage release features"
  ON public.release_features FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_features_status ON public.product_features(status);
CREATE INDEX IF NOT EXISTS idx_product_features_assigned ON public.product_features(assigned_to);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON public.test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_feature ON public.test_cases(feature_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_release_features_release ON public.release_features(release_id);

-- Triggers for updated_at
CREATE TRIGGER update_product_features_updated_at BEFORE UPDATE ON public.product_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON public.test_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


















































