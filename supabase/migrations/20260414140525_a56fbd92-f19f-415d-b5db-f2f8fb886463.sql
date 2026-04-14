
-- Feature highlights: what's new in each portal
CREATE TABLE public.portal_feature_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT NOT NULL,             -- e.g. 'cpo', 'ceo', 'cfo', '*' for all
  feature_key TEXT NOT NULL,           -- unique key like 'collapse-sidebar'
  title TEXT NOT NULL,                 -- e.g. 'Collapsible Sidebar'
  description TEXT NOT NULL,           -- what it does
  target_selector TEXT,                -- optional CSS selector or element ID
  highlight_type TEXT NOT NULL DEFAULT 'glow',  -- 'glow', 'pulse', 'badge'
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, feature_key)
);

-- Track which users have seen which highlights
CREATE TABLE public.portal_feature_seen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_id UUID REFERENCES public.portal_feature_highlights(id) ON DELETE CASCADE NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.portal_feature_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_feature_seen ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read highlights
CREATE POLICY "Authenticated users can read highlights"
  ON public.portal_feature_highlights FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Users can read their own seen records
CREATE POLICY "Users can read own seen records"
  ON public.portal_feature_seen FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own seen records
CREATE POLICY "Users can mark features as seen"
  ON public.portal_feature_seen FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
