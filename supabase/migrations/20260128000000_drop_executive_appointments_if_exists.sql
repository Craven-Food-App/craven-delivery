-- Drop existing executive_appointments table if it exists (before recreating)
-- This ensures a clean slate for the new structure

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Allow authenticated users to read appointments" ON executive_appointments;
DROP POLICY IF EXISTS "Allow founders and secretaries to manage appointments" ON executive_appointments;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_executive_appointments_updated_at ON executive_appointments;

-- Drop existing function
DROP FUNCTION IF EXISTS update_executive_appointments_updated_at();

-- Drop existing indexes
DROP INDEX IF EXISTS idx_executive_appointments_executive_id;
DROP INDEX IF EXISTS idx_executive_appointments_status;
DROP INDEX IF EXISTS idx_executive_appointments_effective_date;

-- Drop the table
DROP TABLE IF EXISTS executive_appointments CASCADE;

-- Note: The actual table creation will happen in the next migration
-- (20260128000001_create_executive_appointments.sql)

