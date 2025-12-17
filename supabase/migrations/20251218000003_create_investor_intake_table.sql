-- Create investor_intake table for compliance-tracked investor interest submissions
-- This table stores all investor interest submissions with full audit trail
CREATE TABLE IF NOT EXISTS investor_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  entity_name TEXT, -- Company / Fund (if applicable)
  investor_type TEXT NOT NULL CHECK (investor_type IN ('Individual', 'Angel', 'Fund', 'Strategic')),
  jurisdiction TEXT, -- Country / State
  capital_range TEXT, -- Non-binding, optional
  acknowledgment_accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ, -- Timestamp when acknowledgment was accepted
  ip_address TEXT, -- IP address for audit trail
  user_agent TEXT, -- User agent for audit trail
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: link to auth user if they sign up
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_investor_intake_email ON investor_intake(email);
CREATE INDEX IF NOT EXISTS idx_investor_intake_status ON investor_intake(status);
CREATE INDEX IF NOT EXISTS idx_investor_intake_user_id ON investor_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_intake_created_at ON investor_intake(created_at DESC);

-- Enable RLS
ALTER TABLE investor_intake ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit investor intake"
  ON investor_intake FOR INSERT
  WITH CHECK (true);

-- Users can view their own submissions (by email match or user_id)
CREATE POLICY "Users can view their own intake submissions"
  ON investor_intake FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.jwt()->>'email' = email
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all investor intake"
  ON investor_intake FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
    OR EXISTS (
      SELECT 1 FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.user_id = auth.uid() 
      AND (d.name = 'Finance' OR d.name = 'Executive')
    )
  );

-- Admins can update submissions (approve/deny)
CREATE POLICY "Admins can update investor intake"
  ON investor_intake FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
    OR EXISTS (
      SELECT 1 FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.user_id = auth.uid() 
      AND (d.name = 'Finance' OR d.name = 'Executive')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER investor_intake_updated_at
  BEFORE UPDATE ON investor_intake
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_intake_updated_at();

-- Add accreditation_status field to investor_profiles for Reg D tracking
ALTER TABLE investor_profiles 
ADD COLUMN IF NOT EXISTS accreditation_status TEXT CHECK (accreditation_status IN ('accredited', 'non_accredited', 'prefer_not_to_say', NULL));

-- Add accreditation_self_certified_at timestamp
ALTER TABLE investor_profiles
ADD COLUMN IF NOT EXISTS accreditation_self_certified_at TIMESTAMPTZ;

