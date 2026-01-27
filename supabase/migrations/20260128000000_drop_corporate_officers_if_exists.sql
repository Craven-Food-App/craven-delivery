-- Drop existing corporate_officers table if it exists (before recreating)
-- This ensures a clean slate for the new structure

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Allow authenticated users to read officers" ON corporate_officers;
DROP POLICY IF EXISTS "Allow founders and secretaries to manage officers" ON corporate_officers;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_corporate_officers_updated_at ON corporate_officers;

-- Drop existing function
DROP FUNCTION IF EXISTS update_corporate_officers_updated_at();

-- Drop existing indexes
DROP INDEX IF EXISTS idx_corporate_officers_executive_id;
DROP INDEX IF EXISTS idx_corporate_officers_position;
DROP INDEX IF EXISTS idx_corporate_officers_status;

-- Drop the table
DROP TABLE IF EXISTS corporate_officers CASCADE;

-- Note: The actual table creation will happen in the next migration
-- (20260128000002_create_corporate_officers.sql)

