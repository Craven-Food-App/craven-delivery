-- Add is_test_user flag to driver_profiles and driver_settings
-- Add is_test flag to orders table
-- This allows test users to only see test orders

-- Add is_test_user to driver_profiles
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT false;

-- Add is_test_user to driver_settings
ALTER TABLE driver_settings 
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT false;

-- Add is_test to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_is_test ON orders(is_test);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_test_user ON driver_profiles(is_test_user);
CREATE INDEX IF NOT EXISTS idx_driver_settings_is_test_user ON driver_settings(is_test_user);

-- Add comment
COMMENT ON COLUMN driver_profiles.is_test_user IS 'If true, this user can only see and receive test orders';
COMMENT ON COLUMN driver_settings.is_test_user IS 'If true, this user can only see and receive test orders';
COMMENT ON COLUMN orders.is_test IS 'If true, this is a test order that should only be visible to test users';





