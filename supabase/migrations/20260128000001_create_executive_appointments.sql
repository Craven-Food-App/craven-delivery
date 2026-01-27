-- Create executive_appointments table for appointment workflow
CREATE TABLE IF NOT EXISTS executive_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID NOT NULL REFERENCES exec_users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('initial', 'reappointment', 'promotion', 'lateral')),
  appointment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_date TIMESTAMPTZ NOT NULL,
  appointed_by TEXT NOT NULL,
  resolution_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'terminated')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_executive_appointments_executive_id ON executive_appointments(executive_id);
CREATE INDEX IF NOT EXISTS idx_executive_appointments_status ON executive_appointments(status);
CREATE INDEX IF NOT EXISTS idx_executive_appointments_effective_date ON executive_appointments(effective_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_executive_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_executive_appointments_updated_at
  BEFORE UPDATE ON executive_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_executive_appointments_updated_at();

-- Add RLS policies
ALTER TABLE executive_appointments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read appointments
CREATE POLICY "Allow authenticated users to read appointments"
  ON executive_appointments FOR SELECT
  TO authenticated
  USING (true);

-- Allow founders and corporate secretaries to manage appointments
CREATE POLICY "Allow founders and secretaries to manage appointments"
  ON executive_appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
    )
  );

