-- Add city column to driver_surge_zones if it doesn't exist
ALTER TABLE driver_surge_zones 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing rows with a default city if needed
UPDATE driver_surge_zones 
SET city = 'Los Angeles' 
WHERE city IS NULL OR city = '';

