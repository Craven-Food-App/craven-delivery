-- Quick Fix: Add missing columns to user_sessions table
-- Run this directly in Supabase SQL Editor
-- Errors: column user_sessions.portal_type does not exist
--         column user_sessions.is_active does not exist

-- First, check current structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

-- Add missing columns
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS portal_type TEXT;

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add indexes for performance (only for columns that exist)
CREATE INDEX IF NOT EXISTS idx_user_sessions_portal_type 
ON user_sessions(portal_type)
WHERE portal_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
ON user_sessions(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_portal_active 
ON user_sessions(user_id, portal_type, is_active)
WHERE portal_type IS NOT NULL AND is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN user_sessions.portal_type IS 'Type of portal being accessed: hub, testing, mobile, etc.';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether this session is currently active';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_sessions' 
AND column_name IN ('portal_type', 'is_active')
ORDER BY column_name;

