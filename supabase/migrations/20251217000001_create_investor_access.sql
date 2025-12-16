-- Create investor_access_requests table
CREATE TABLE IF NOT EXISTS investor_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  investor_type TEXT NOT NULL CHECK (investor_type IN ('angel', 'strategic', 'institutional', 'other')),
  organization TEXT,
  location TEXT,
  linkedin_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT
);

-- Create investor_profiles table for persistent access status
CREATE TABLE IF NOT EXISTS investor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_status TEXT NOT NULL DEFAULT 'none' CHECK (access_status IN ('none', 'pending', 'approved', 'rejected')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investor_access_requests_user_id ON investor_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_access_requests_status ON investor_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_investor_access_requests_email ON investor_access_requests(email);

-- Enable RLS
ALTER TABLE investor_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investor_access_requests
-- Users can insert their own requests
CREATE POLICY "Users can insert their own access requests"
  ON investor_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Users can view their own requests
CREATE POLICY "Users can view their own access requests"
  ON investor_access_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all access requests"
  ON investor_access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Admins can update requests
CREATE POLICY "Admins can update access requests"
  ON investor_access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- RLS Policies for investor_profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own investor profile"
  ON investor_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own investor profile"
  ON investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update their own investor profile"
  ON investor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all investor profiles"
  ON investor_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all investor profiles"
  ON investor_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_profiles_updated_at();

