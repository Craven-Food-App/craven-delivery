-- Create table for investors to shortlist investment opportunities
CREATE TABLE IF NOT EXISTS investor_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES investment_opportunities(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investor_shortlists_user_id ON investor_shortlists(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_shortlists_opportunity_id ON investor_shortlists(opportunity_id);

-- Enable RLS
ALTER TABLE investor_shortlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own shortlists
CREATE POLICY "Users can view their own shortlists"
  ON investor_shortlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add their own shortlists
CREATE POLICY "Users can add their own shortlists"
  ON investor_shortlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own shortlists
CREATE POLICY "Users can remove their own shortlists"
  ON investor_shortlists FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all shortlists
CREATE POLICY "Admins can view all shortlists"
  ON investor_shortlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

