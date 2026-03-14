
-- 1. Storage bucket for partnership documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('partnership-documents', 'partnership-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies
CREATE POLICY "Authenticated can upload partnership docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partnership-documents');

CREATE POLICY "Authenticated can read partnership docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partnership-documents');

CREATE POLICY "Authenticated can delete partnership docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partnership-documents');

-- 3. Add revenue columns to partnerships
ALTER TABLE public.partnerships
  ADD COLUMN IF NOT EXISTS revenue_ytd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_mtd numeric DEFAULT 0;

-- 4. Create partnership_onboarding_items table
CREATE TABLE IF NOT EXISTS public.partnership_onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid REFERENCES public.partnerships(id) ON DELETE CASCADE NOT NULL,
  step_name text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage onboarding items"
  ON public.partnership_onboarding_items FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
