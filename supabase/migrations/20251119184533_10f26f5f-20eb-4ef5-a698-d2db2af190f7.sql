-- Enable pgcrypto extension for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to verify CEO PIN using bcrypt
CREATE OR REPLACE FUNCTION public.verify_ceo_pin(
  check_email TEXT,
  check_pin TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
  is_valid BOOLEAN;
BEGIN
  -- Get the stored PIN hash for the email
  SELECT pin_hash INTO stored_hash
  FROM public.ceo_access_credentials
  WHERE user_email = check_email;
  
  -- If no record found, return false
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify the PIN against the stored hash
  is_valid := (stored_hash = crypt(check_pin, stored_hash));
  
  -- If valid, update last access time and access count
  IF is_valid THEN
    UPDATE public.ceo_access_credentials
    SET 
      last_access_at = now(),
      access_count = COALESCE(access_count, 0) + 1,
      updated_at = now()
    WHERE user_email = check_email;
  END IF;
  
  RETURN is_valid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_ceo_pin(TEXT, TEXT) TO authenticated;