
CREATE TABLE partnership_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE NOT NULL,
  kpi_name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  period TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partnership_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage partnership_kpis"
  ON partnership_kpis FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
