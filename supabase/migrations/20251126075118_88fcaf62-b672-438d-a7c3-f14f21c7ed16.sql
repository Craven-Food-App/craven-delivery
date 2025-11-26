-- Migration to support Justin Sweet CFO account setup
-- This migration adds a function to hash and update executive PINs using bcrypt

-- Function to hash and update PIN for executives
CREATE OR REPLACE FUNCTION hash_and_update_pin(p_email TEXT, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the PIN hash using crypt function
  UPDATE ceo_access_credentials
  SET pin_hash = crypt(p_new_pin, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE user_email = LOWER(p_email);
  
  RETURN FOUND;
END;
$$;

-- Hash Justin Sweet's temporary PIN
-- First check if the record exists, if not insert it
INSERT INTO ceo_access_credentials (user_email, pin_hash)
VALUES ('jsweet.cfo@cravenusa.com', crypt('101307', gen_salt('bf', 10)))
ON CONFLICT (user_email) 
DO UPDATE SET 
  pin_hash = crypt('101307', gen_salt('bf', 10)),
  updated_at = NOW();

-- Ensure the updated_at column has a default value
ALTER TABLE ceo_access_credentials 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Comment on the function
COMMENT ON FUNCTION hash_and_update_pin IS 'Securely hashes and updates PIN for executive users using bcrypt';
