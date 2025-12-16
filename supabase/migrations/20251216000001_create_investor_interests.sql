-- Create investor_interests table to track potential investor interest from pitch deck
CREATE TABLE IF NOT EXISTS investor_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contact information (for non-logged-in users or additional info)
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  investor_type TEXT CHECK (investor_type IN ('angel', 'vc', 'family_office', 'corporate', 'individual', 'other')),
  
  -- Investment details
  investment_range TEXT CHECK (investment_range IN ('under_10k', '10k_50k', '50k_100k', '100k_250k', '250k_500k', '500k_1m', 'over_1m')),
  message TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_discussion', 'committed', 'invested', 'declined', 'archived')),
  notes TEXT,
  
  -- Tracking
  source TEXT DEFAULT 'pitch_deck',
  shortlisted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investor_interests_opportunity ON investor_interests(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_investor_interests_status ON investor_interests(status);
CREATE INDEX IF NOT EXISTS idx_investor_interests_email ON investor_interests(email);

-- Enable RLS
ALTER TABLE investor_interests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (express interest)
CREATE POLICY "Anyone can express interest" ON investor_interests
  FOR INSERT WITH CHECK (true);

-- Policy: Only authenticated users with business role can view
CREATE POLICY "Business users can view interests" ON investor_interests
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'cfo', 'ceo', 'board')
    )
  );

-- Policy: Business users can update status
CREATE POLICY "Business users can update interests" ON investor_interests
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'cfo', 'ceo', 'board')
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_investor_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investor_interests_updated_at
  BEFORE UPDATE ON investor_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_interests_updated_at();

