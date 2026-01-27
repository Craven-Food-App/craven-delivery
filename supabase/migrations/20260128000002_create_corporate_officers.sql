-- Create corporate_officers table for Delaware statutory compliance
CREATE TABLE IF NOT EXISTS corporate_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL CHECK (position IN ('president', 'secretary', 'treasurer', 'vice-president', 'assistant-secretary', 'assistant-treasurer')),
  executive_id UUID NOT NULL REFERENCES exec_users(id) ON DELETE CASCADE,
  appointed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  term_start TIMESTAMPTZ NOT NULL,
  term_end TIMESTAMPTZ,
  resolution_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_corporate_officers_executive_id ON corporate_officers(executive_id);
CREATE INDEX IF NOT EXISTS idx_corporate_officers_position ON corporate_officers(position);
CREATE INDEX IF NOT EXISTS idx_corporate_officers_status ON corporate_officers(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_corporate_officers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_officers_updated_at
  BEFORE UPDATE ON corporate_officers
  FOR EACH ROW
  EXECUTE FUNCTION update_corporate_officers_updated_at();

-- Add RLS policies
ALTER TABLE corporate_officers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read officers
CREATE POLICY "Allow authenticated users to read officers"
  ON corporate_officers FOR SELECT
  TO authenticated
  USING (true);

-- Allow founders and corporate secretaries to manage officers
CREATE POLICY "Allow founders and secretaries to manage officers"
  ON corporate_officers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
    )
  );

